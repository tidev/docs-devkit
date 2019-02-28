const fs = require('fs-extra');
const path = require('path');
const { logger, globby, sort } = require('@vuepress/shared-utils');

const versionManager = require('./lib/version-manager');

module.exports = (options, context) => {
  const pluginName = 'titanium/versioning';

  const versionedSourceDir = path.resolve(context.sourceDir, '..', 'versioned_docs');
  context.versionedSourceDir = versionedSourceDir;

  const pagesSourceDir = options.pagesSourceDir || path.resolve(context.sourceDir, '..', 'pages');

  const versionsFilePath = path.join(context.sourceDir, '.vuepress', 'versions.json');
  versionManager.loadVersions(versionsFilePath);
  const versions = versionManager.versions;

  const defaultPluginOptions = {
    name: pluginName,

    ready() {
      const currentSidebarConfigPath = path.join(context.sourceDir, '.vuepress', 'sidebar.config.js');
      if (versions.length === 0) {
        if (fs.existsSync(currentSidebarConfigPath)) {
          context.themeConfig.sidebar = require(currentSidebarConfigPath);
        }

        return;
      }

      if (!context.themeConfig.sidebar) {
        throw new Error('Versioned sidebars require an empty Array or Object as the themeConfig.sidebar option depending on your sidebar structure.');
      }

      function rewriteSidebarConfig(sidebarConfig, version) {
        if (Array.isArray(sidebarConfig)) {
          return sidebarConfig.map(path => {
            return Array.isArray(path) ? `${version}${path[0]}` : `${version}${path}`;
          })
        } else {
          return Object.keys(sidebarConfig).reduce((config, key) => {
            config[`/${version}${key}`] = sidebarConfig[key];
            return config;
          }, {});
        }
      }

      function mergeSidebarConfig(target, source) {
        if (Array.isArray(target)) {
          return target.concat(source);
        } else {
          return Object.assign(target, source);
        }
      }

      if (fs.existsSync(currentSidebarConfigPath)) {
        const sidebarConfig = rewriteSidebarConfig(require(currentSidebarConfigPath), 'next');
        mergeSidebarConfig(context.themeConfig.sidebar, sidebarConfig);
      }

      const currentVersion = versions[0];
      for (const version of versions) {
        const versionSidebarConfigPath = path.join(versionedSourceDir, version, 'sidebar.config.js');
        if (fs.existsSync(versionSidebarConfigPath)) {
          let sidebarConfig;
          if (version === currentVersion) {
            sidebarConfig = require(versionSidebarConfigPath);
          } else {
            sidebarConfig = rewriteSidebarConfig(require(versionSidebarConfigPath), version);
          }
          mergeSidebarConfig(context.themeConfig.sidebar, sidebarConfig);
        }
      }
    },

    extendCli(cli) {
      cli
        .command('version <targetDir> <version>', '')
        .option('--debug', 'enable debug logging')
        .action((dir, version, ) => {
          if (versions.includes(version)) {
            logger.error(`Version ${version} already exists in version.json. Please use a different version.`);
            return;
          }

          const vuepressPath = path.join(context.sourceDir, '.vuepress');
          const versionDestPath = path.join(versionedSourceDir, version);
          fs.copySync(context.sourceDir, versionDestPath, {
            filter: (src, dest) => {
              if (src === vuepressPath) {
                return false;
              }

              return true;
            }
          });

          fs.copy(path.join(vuepressPath, 'sidebar.config.js'), path.join(versionDestPath, 'sidebar.config.js'));
          fs.copy(path.join(context.sourceDir, 'api', 'api.json'), path.join(versionDestPath, 'api.json'));

          versions.unshift(version);
          fs.writeFileSync(versionsFilePath, JSON.stringify(versions, null, 2));

          logger.success(`Created snapshot of ${context.sourceDir} as version ${version} in ${versionDestPath}`);
        });
    }
  }

  if (versions.length === 0) {
    return defaultPluginOptions;
  }

  return Object.assign(defaultPluginOptions, {
    async additionalPages () {
      const patterns = ['**/*.md', '**/*.vue', '!.vuepress', '!node_modules']
      const pageFiles = sort(await globby(patterns, { cwd: versionedSourceDir }))
      const versionedPages = []
      pageFiles.map(relative => {
        const filePath = path.resolve(versionedSourceDir, relative)
        versionedPages.push({
          filePath,
          relative
        })
      })
      return versionedPages
    },

    extendPageData(page) {
      const currentVersion = versions[0];
      // @todo: add options to exclude pages from versioning
      if (page.path === '/404.html') {
        return;
      }
      if (page._filePath.startsWith(versionedSourceDir)) {
        const version = page._filePath.substring(versionedSourceDir.length + 1, page._filePath.indexOf('/', versionedSourceDir.length +1));
        page.version = version;
        if (version === currentVersion) {
          page.path = page.regularPath = page.path.replace(new RegExp(`^/${version}`), '');
        }
      } else {
        page.version = 'next';
        page.path = page.regularPath = `/next${page.path}`;
      }
    },

    // @fixme siteData is not extendable, store versions as a computed property on Vue for now
    enhanceAppFiles: [{
      name: 'versions-site-data',
      content: `export default ({ Vue }) => {
  Vue.mixin({
    computed: {
      $versions: () => ${JSON.stringify(versions)}
    }
  })
}`
    }]
  });
}

const fs = require('fs-extra')
const path = require('path')
const { logger, globby, sort } = require('@vuepress/shared-utils')

const convertRouterLinkPlugin = require('./lib/link')
const { generateVersionedPath, snapshotSidebar, updateSidebarConfig } = require('./lib/util')
const versionManager = require('./lib/version-manager')

module.exports = (options, context) => {
  const pluginName = 'titanium/versioning'

  const versionedSourceDir = options.versionedSourceDir || path.resolve(context.sourceDir, '..', 'website', 'versioned_docs')
  const pagesSourceDir = options.pagesSourceDir || path.resolve(context.sourceDir, '..', 'website', 'pages')

  const versionsFilePath = path.join(context.sourceDir, '.vuepress', 'versions.json')
  versionManager.loadVersions(versionsFilePath)
  const versions = versionManager.versions

  const defaultPluginOptions = {
    name: pluginName,

    /**
     * Reads in the snaphotted sidebar configs and rewrites them to be versioned
     */
    ready () {
      if (versions.length === 0) {
        return
      }

      updateSidebarConfig(context.themeConfig, 'next')

      const currentVersion = versions[0]
      context.themeConfig.versionedSidebar = {}
      for (const version of versions) {
        const versionSidebarConfigPath = path.join(versionedSourceDir, version, 'sidebar.config.json')
        if (!fs.existsSync(versionSidebarConfigPath)) {
          continue
        }

        const sidebarConfig = JSON.parse(fs.readFileSync(versionSidebarConfigPath).toString())
        if (version !== currentVersion) {
          updateSidebarConfig(sidebarConfig, version)
        }
        context.themeConfig.versionedSidebar[version] = sidebarConfig
      }
    },

    /**
     * Extends the cli with new commands to manage versions
     */
    extendCli (cli) {
      cli
        .command('version <targetDir> <version>', 'Draft a new version')
        .allowUnknownOptions()
        .action(async (dir, version) => {
          if (versions.includes(version)) {
            logger.error(`Version ${version} already exists in version.json. Please use a different version.`)
            return
          }

          logger.wait(`Creating new version ${version} ...`)

          const versionDestPath = path.join(versionedSourceDir, version)
          await fs.copy(context.sourceDir, versionDestPath, {
            filter: (src, dest) => {
              if (src === context.vuepressDir) {
                return false
              }

              return true
            }
          })

          await snapshotSidebar(context.siteConfig, versionDestPath)
          if (typeof options.onNewVersion === 'function') {
            await options.onNewVersion(version, versionDestPath)
          }

          versions.unshift(version)
          await fs.writeFile(versionsFilePath, JSON.stringify(versions, null, 2))

          logger.success(`Snapshotted your current docs as version ${version}`)
          logger.tip(`You can find them under ${versionDestPath}`)
        })
    },

    /**
     * Adds additional pages from versioned docs as well as unversioned extra pages.
     */
    async additionalPages () {
      const patterns = ['**/*.md', '**/*.vue', '!.vuepress', '!node_modules']

      const addPages = (pageFiles, basePath) => {
        const pages = []
        pageFiles.map(relative => {
          const filePath = path.resolve(basePath, relative)
          pages.push({
            filePath,
            relative
          })
        })
        return pages
      }

      let versionedPages = []
      if (await fs.exists(versionedSourceDir)) {
        const versionedPageFiles = sort(await globby(patterns, { cwd: versionedSourceDir }))
        versionedPages = addPages(versionedPageFiles, versionedSourceDir)
      }

      let pages = []
      if (await fs.exists(pagesSourceDir)) {
        const pageFiles = sort(await globby(patterns, { cwd: pagesSourceDir }))
        pages = addPages(pageFiles, pagesSourceDir)
      }

      return [...versionedPages, ...pages]
    },

    /**
     * Marks unversioned pages from the pageSourceDir
     *
     * @param {Object} page VuePress page object
     */
    extendPageData (page) {
      if (!page._filePath) {
        return
      }

      if (page._filePath.startsWith(pagesSourceDir)) {
        page.unversioned = true
      }
    }
  }

  if (versions.length === 0) {
    return defaultPluginOptions
  }

  return Object.assign(defaultPluginOptions, {
    /**
     * Extends and updates a page with additional information for versioning support.
     */
    extendPageData (page) {
      const currentVersion = versions[0]
      if (!page._filePath) {
        return
      }

      if (page._filePath.startsWith(versionedSourceDir)) {
        const version = page._filePath.replace(versionedSourceDir, '').split(path.sep).filter(p => !!p)[0]
        page.version = version
        page.originalRegularPath = page.regularPath
        const pathWithoutLeadingVersion = page.path.replace(new RegExp(`^/${version}`), '')
        if (version === currentVersion) {
          page.path = page.regularPath = pathWithoutLeadingVersion
        } else {
          page.path = page.regularPath = generateVersionedPath(pathWithoutLeadingVersion, page.version, page._localePath)
        }
        page.originalRelativePath = page.relativePath
        page.relativePath = path.relative(versionedSourceDir, page._filePath).replace(/\\/g, '/')
      } else if (page._filePath.startsWith(pagesSourceDir)) {
        page.unversioned = true
        page.originalRelativePath = page.relativePath
        page.relativePath = path.relative(pagesSourceDir, page._filePath).replace(/\\/g, '/')
      } else if (page._filePath.startsWith(context.sourceDir)) {
        page.version = 'next'
        page.originalRegularPath = page.regularPath
        page.path = page.regularPath = generateVersionedPath(page.path, page.version, page._localePath)
      }
    },

    /**
     * Enhances the app with a globally accessible list of available versions.
     *
     * @fixme ideally this should go into siteData but that is not extendable
     * right now so store versions as a computed property on Vue
     */
    enhanceAppFiles: [{
      name: 'versions-site-data',
      content: `export default ({ Vue }) => {
  Vue.mixin({
    computed: {
      $versions: () => ${JSON.stringify(versions)}
    }
  })
}`
    }],

    /**
     * Replaces the default convert-router-link plugin from VuePress with a
     * modified one that knows how to properly handle relative links for the
     * rewritten paths of versioned pages.
     *
     * @param {*} config
     */
    chainMarkdown (config) {
      config.plugins.delete('convert-router-link')
      const { externalLinks } = context.siteConfig.markdown || {}
      config
        .plugin('convert-router-link-versioned')
        .use(convertRouterLinkPlugin, [{
          externalAttrs: Object.assign({
            target: '_blank',
            rel: 'noopener noreferrer'
          }, externalLinks),
          sourceDir: context.sourceDir,
          versionedSourceDir,
          pagesSourceDir,
          locales: Object.keys(context.siteConfig.locales || {}).filter(l => l !== '/')
        }])
        .end()
    }
  })
}

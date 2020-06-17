const fs = require('fs-extra')
const path = require('path')

module.exports = context => ({
  theme: 'titanium',
  head: [
    ['link', { rel: 'icon', href: `/logo.png` }]
  ],
  theme: 'titanium',
  themeConfig: {
    logo: '/logo.png',
    footerCopyright: 'Copyright © 2019-present Axway Appcelerator',
    footerLogo: '/axway-appcelerator-logo.png',
    footerSitemap: {
      'Products': [
        { text: 'Titanium SDK', link: 'https://github.com/appcelerator/titanium_mobile' },
        { text: 'Alloy', link: 'https://github.com/appcelerator/alloy' },
        { text: 'Titanium Vue', link: 'https://github.com/appcelerator/titanium-vue' },
        { text: 'Titanium Angular', link: 'https://github.com/appcelerator/titanium-angular' }
      ],
      'Social': [
        { text: 'Twitter', link: 'https://twitter.com/appcelerator' },
        { text: 'LinkedIn', link: 'https://linkedin.com/company/axway' }
      ]
    },
    repo: 'appcelerator/docs-devkit',
    docsBranch: 'develop',
    docsDir: 'packages/docs/docs',
    docsDirVersioned: 'packages/docs/website/versioned_docs',
    docsDirPages: 'packages/docs/website/pages',
    editLinks: true,
    nextVersionTitle: 'develop',
    locales: {
      '/': {
        label: 'English',
        selectText: 'Languages',
        editLinkText: 'Edit this page on GitHub',
        lastUpdated: 'Last Updated',
        nav: require('./nav/en'),
        sidebar: {
          '/guide/': getGuideSidebar('Guide', 'Advanced'),
          '/plugins/': getPluginSidebar('Plugins', 'Introduction'),
          '/theme/': getThemeSidebar('Theme', 'Introduction'),
          '/api/': [
            {
              title: 'API Docs',
              collapsable: false,
              children: [
                'sometype'
              ]
            }
          ]
        }
      }
    }
  },
  locales: {
    '/': {
      lang: 'en-US',
      title: 'Titanium Docs DevKit',
      description: 'Tooling for Axway Appcelerator open source documentation',
    }
  },
  plugins: [
    ['versioning', {
      async onNewVersion(version, versionDestPath) {
        const relativeMetadataFilePath = path.join('api', 'api.json')
        const apiMetadataFile = path.join(context.sourceDir, relativeMetadataFilePath)
        if (fs.existsSync(apiMetadataFile)) {
          await fs.copyFile(path.join(context.sourceDir, relativeMetadataFilePath), path.join(versionDestPath, relativeMetadataFilePath))
        }
      }
    }],
    // use full name or vuepress tries to load `../../apidocs` folder
    'vuepress-plugin-apidocs',
    '@vuepress/back-to-top'
  ]
})

function getGuideSidebar (groupA, groupB) {
  return [
    {
      title: groupA,
      collapsable: false,
      children: [
        '',
        'getting-started',
        'versioning',
        'api-docs'
      ]
    },
    {
      title: groupB,
      collapsable: false,
      children: [
        'page-metadata'
      ]
    }
  ]
}

function getPluginSidebar (pluginTitle, pluginIntro) {
  return [
    {
      title: pluginTitle,
      collapsable: false,
      children: [
        ['', pluginIntro],
        'versioning-plugin',
        'apidocs-plugin',
      ]
    }
  ]
}

function getThemeSidebar (groupA, introductionA) {
  return [
    {
      title: groupA,
      collapsable: false,
      sidebarDepth: 2,
      children: [
        ['', introductionA],
        'installation',
        'titanium-theme-config',
      ]
    },
  ]
}
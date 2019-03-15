module.exports = {
  theme: 'titanium',
  title: 'Titanium Docs DevKit',
  description: 'Tooling for Axway Appcelerator open source documentation',
  head: [
    ['link', { rel: 'icon', href: `/logo.png` }]
  ],
  theme: 'titanium',
  themeConfig: {
    logo: '/logo.png',
    footerCopyright: 'Copyright © 2019-present Axway Appcelerator',
    footerLogo: '/axway-appcelerator-logo.png',
    footerSitemap: {
      'Docs': [
        { text: 'Alloy', link: 'https://docs.appcelerator.com/' }
      ]
    },
    repo: 'appcelerator/docs-devkit',
    docsBranch: 'develop',
    docsDir: 'packages/docs/docs',
    editLinks: true,
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
        }
      },
      '/de/': {
        label: 'Deutsch',
        selectText: 'Sprachen',
        editLinkText: 'Diese Seite auf GitHub bearbeiten',
        lastUpdated: 'Letzte aktualisierung',
        nav: require('./nav/de'),
        sidebar: {
          '/guide/': getGuideSidebar('Guide', 'Erweitert'),
          '/plugins/': getPluginSidebar('Plugins', 'Einführung'),
          '/theme/': getThemeSidebar('Theme', 'Einführung'),
        }
      }
    }
  }
}

function getGuideSidebar (groupA, groupB) {
  return [
    {
      title: groupA,
      collapsable: false,
      children: [
        '',
      ]
    },
    {
      title: groupB,
      collapsable: false,
      children: [
      ]
    }
  ]
}

function getPluginSidebar (pluginTitle, pluginIntro, officialPluginTitle) {
  return [
    {
      title: pluginTitle,
      collapsable: false,
      children: [
        ['', pluginIntro],
        'apidocs-plugin',
        'versioning-plugin'
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
        'titanium-theme-config',
      ]
    },
  ]
}
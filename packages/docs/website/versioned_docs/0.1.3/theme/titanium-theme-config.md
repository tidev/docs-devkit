# Titanium Theme Config

::: tip
This theme supports all [options](https://v1.vuepress.vuejs.org/theme/default-theme-config.html) of the VuePress default theme.
:::

## Footer

Providing one of the `themeConfig.footer*` options will enable the globally shown footer at the bottom of every page.

```js
// .vuepress/config.js
module.exports = {
  themeConfig: {
    // Sets the copyright message
    footerCopyright: 'Copyright © 2019-present Axway Appcelerator',
    // Shows a logo in the footer between the sitemap and copyright message
    footerLogo: '/axway-appcelerator-logo.png',
    // Change the URL the footer logo will point to. Defaults to '/'
    footerLogoLink: '/guide'
    // Sitemap for quick access to different pages (can be internal or external)
    footerSitemap: {
      'Docs': [
        { text: 'Alloy', link: 'https://docs.appcelerator.com/' }
      ]
    }
  }
}
```

## Versioning

You can change the name of the `next` version in the version dropdown via `nextVersionTitle`

```js
// .vuepress/config.js
module.exports = {
  themeConfig: {
    nextVersionTitle: 'develop'
  }
}
```

You can also change the paths for edit links of versioned docs and unversioned pages to match the [versionedSourceDir](../plugins/versioning-plugin.md#versionedsourcedir) and [pagesSourceDir](../plugins/versioning-plugin.md#pagessourcedir) option of the versioning plugin.

```js
module.exports = {
  themeConfig: {
    // defaults to 'website/versioned_docs'
    docsDirVersioned: 'path/to/versioned_docs',
    // defaults to 'website/pages'
    docsDirPages: 'path/to/pages'
  }
}
```

---
home: true
heroImage: /logo.png
actionText: Get Started →
actionLink: /guide/
features:
- title: VuePress-Powered
  details: Enjoy the dev experience of VuePress to easily write documentation for your project.
- title: Versioning
  details: Add versioning support to VuePress with our plugin
- title: API Docs
  details: Render gorgeously looking API reference docs directly from TDoc files
---

### Easy setup

Just add our theme or plugins to your VuePress project and you are ready to go.

First install the packages your need.

```bash
# Slightly tweaked theme of VuePress using flex boxes, configurable footer and more
npm i vuepress-theme-titanium

# Use versioning in your VuePress project
npm i vuepress-plugin-versioning

# Add API reference docs to your markdown with <ApiDocs>
npm i vuepress-plugin-apidocs
```

And add them to your `.vuepress/config.js`

```js
// .vuepress/config.js
module.exports = {
  theme: 'titanium'
  plugins: [
    'versioning',
    'apidocs'
  ]
}
```

:::tip
The theme as well as the plugins all work independently. However, they are built to integrate smoothly with each other. The [API Docs plugin](./plugins/versioning-plugin.md) and [Titanium theme](./theme/README.md) already come with full support for the [versioning plugin](./plugins/versioning-plugin.md).
:::

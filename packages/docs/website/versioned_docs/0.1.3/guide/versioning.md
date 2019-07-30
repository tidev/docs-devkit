# Versioning

You can use the versioning plugin to cut a new documentation version based on the latest content in the source directory. That specific set of documentation will then be preserved and is accessible even as the documentation in the docs directory changes moving forward.

:::warning WARNING: VuePress source folder
Do not place your docs at the root level of your repo when using the versioning plugin. It needs to store the versioned docs somewhere outside of the source folder. By default this is in a folder called `website` parallel to the source directory you pass to VuePress.

This guide assumes you use `docs` as the source directory for VuePress.
:::

:::warning WARNING: Theme compatibility
Your theme must be able to properly handle versioned page links. See the [Titanium theme](../theme/README.md) for a modified version of the VuePress default theme that is compatible with the versioning plugin.
:::

## Getting Started

Install the plugin

```bash
yarn add -D vuepress-plugin-versioning
# OR npm i -D vuepress-plugin-versioning
```

and enable it in your configuration

```js
// docs/.vuepress/config.js
module.exports = {
  plugins: ['versioning']
}
```

For advanced configration options see the [plugin docs](../plugins/versioning-plugin.md).

## How to Create New Versions

The versioning plugin will extend the VuePress CLI with a new command to manager version. Pass the version number you want to create as a command line argument e.g.,

```bash
vuepress version docs 1.0.0
```

This will preserve all documents currently in the `docs` directory and make them available as documentation for version `1.0.0`.

## Storing Files for Each Version

By default, versioned documents are placed into `../website/versioned_docs/${version}`, where `${version}` is the version number you supplied to the version script. This path is resolved relative to the source directory you passed into the VuePress CLI. You can change this path by configuring the [versionedSourceDir](../plugins/versioning-plugin.md#versionedsourcedir) option.

The current sidebar configuration will also be preserved and copied into the folder of the newly created version as `sidebar.config.json`.

A `.vuepress/versions.json` file is created the first time you cut a version and is used by the versioning plugin to detect what versions exist. Each time a new version is added, it gets added to the `versions.json` file.

If you wish to change the documentation for a past version, you can access the files for that respective version.

## Additional Pages

You can have additional pages alongside your main docs directory which will be excluded from versioning. The default directory for those pages is `../website/pages/`.

If you want to place extra pages somewhere else you can change the path using the [pagesSourceDir](../plugins/versioning-plugin.md#pagessourcedir) option.

## Page Routing

After you have enabled the versioning plugin you won't see any changes to your docs at first. All files will be served using the [default page routing](https://v1.vuepress.vuejs.org/guide/directory-structure.html#default-page-routing).

Once you have created your first version, documents in the `docs` directory will be considered part of version `next` and they are available, for example, at the URL `/next/doc1.html`. Documents from the latest version use the URL `/doc1.html`. All other versions will be available under their respective version number, for example, at the URL `/1.0.0/doc1.html`.

::: tip
A special route matching is done for localized pages so that the locale identifier is always the first path part. Localized pages will be available, for example, at the URL `/de/1.0.0/doc1.html`.
:::

## Post-create Hook

Should you need to do some extra work after a version was created the plugin provides a post-create hook.

For example, to copy an additional file (other than `.md` and `.vue`, which are copied by default):

```js
const fs = require('fs-extra)
const path = require('path)

module.exports = context => ({
  plugins: ['versioning', {
    async onNewVersion(version, versionDestPath) {
      return fs.copy(context.sourceDir, 'api.json', path.join(versionDestPath, 'api.json'))
    }
  }]
})
```

## Accessing Version Data

The versioning plugin will extend the page's metadata with the version number it is part of. You can access it in components via `this.$page.version` for example.

To get a list of all versions that are currently available you can use `$versions` which is available as a mixin in all your components under `this.$versions`.

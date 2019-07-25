# API Docs Plugin

> Renders API reference documentation in VuePress

::: warning METADATA FORMAT
This plugin currently requires that you have your API metadata information available in the TDoc specification. Other formats like JSDoc are not supported yet.
:::

## Installation

```bash
yarn add -D vuepress-plugin-apidocs
# OR npm i -D vuepress-plugin-apidocs
```

## Usage

```js
module.exports = {
  plugins: ['apidocs']
}
```

### Passing Options

```js
const path = require('path')

module.exports = context => ({
  plugins: ['apidocs', {
    metadataFile: 'metadata/api.json',
    disableStoreSetup: true
  }]
})
```

## Options

### metadataFile

Path to the metadata file. This path is resolved relative to the source directory you passed into the VuePress CLI.

- Type: `string`
- Default: `api/api.json`

### versionedMetadataFile

Path to the metadata file in versioned docs. This path is resolved relative to the [versionedSourceDir](#versionedsourcedir) option.

- Type: `string`
- Default: `api/api.json`

### versionedSourceDir

Path to the versioned docs directory. This only needs to be set when you change the option with the same name in the [versioning plugin](./versioning-plugin.md#versionedsourcedir).

::: warning NOTE
It is currently not possible to easily access options from other plugins, so make sure that both plugin options are in sync.
:::

- Type: `string`
- Default: `${sourceDir}/../website/versioned_docs`

### disableStoreSetup

Disables automatic setup of the Vuex store. Set this to `false` if you want to use your own [App Level Enhancements](https://v1.vuepress.vuejs.org/guide/basic-config.html#app-level-enhancements) to configure the store.

- Type: `boolean`
- Default: `false`

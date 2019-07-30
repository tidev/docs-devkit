# Versioning Plugin

> Versioned docs support for VuePress

::: tip
Your theme must be able to properly handle versioned pages. See the [Versioning Guide](../guide/versioning.md) for more details about the structure of versioned docs.
:::

## Installation

```bash
yarn add -D vuepress-plugin-versioning
# OR npm i -D vuepress-plugin-versioning
```

## Usage

```js
module.exports = {
  plugins: ['versioning']
}
```

### Passing Options

```js
const path = require('path')

module.exports = context => ({
  plugins: ['versioning', {
    versionedSourceDir: path.resolve(context.sourceDir, '..', 'versioned_docs')
    pagesSourceDir: path.resolve(context.sourceDir, '..', 'unversioned_pages'),
    onNewVersion(version, versionDestPath) {
      // post-create hook
      console.log(`Created version ${version} in ${versionDestPath}`)
    }
  }]
})
```

## Options

### versionedSourceDir

Directory where versions will be stored.

- Type: `string`
- Default: `${sourceDir}/../website/versioned_docs`

### pagesSourceDir

Directory with additional un-versioned source files that should be added as pages to your site.

- Type: `string`
- Default: `${sourceDir}/../website/pages`

### onNewVersion

Function that will be called after you have drafted a new version.

- Type: `Function`
- Parameters:
  - `version`: Version number.
  - `versionDestPath`: Full path of the directory where the snapshot of your docs were copied to.

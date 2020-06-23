# FontAwesome Plugin

> Easy integration of FontAwesome icons in your VuePress site

## Installation

```bash
yarn add -D vuepress-plugin-fontawesome
# OR npm i -D vuepress-plugin-fontawesome
```

## Usage

```js
module.exports = {
  plugins: ['fontawesome']
}
```

### Passing Options

```js
const path = require('path' );

module.exports = context => ({
  plugins: [
    ['fontawesome', {
      iconFile: path.join(context.sourceDir, '.vuepress', 'my-icons.js')
    }]
  ]
})
```

## Options

### iconsFile

File used to import and register icons with the FontAwesome SVG core library. This file will be added to the [enhanceAppFiles](https://vuepress.vuejs.org/plugin/option-api.html#enhanceappfiles) option of this plugin.

- Type: `string`
- Default: `.vuepress/fa-icons.js`

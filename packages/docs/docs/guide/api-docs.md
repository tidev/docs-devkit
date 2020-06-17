---
metadataKey: SomeType
---

# API Docs

Writing complex API documentation is often quite cumbersome in markdown. This is where the API docs plugin steps it. It provides a `<ApiDocs/>` tag which can render extensive API documentation from a metadata file.

::: warning COMPATIBILTY NOTE
This plugin is currently limited to a specific metadata format called [TDoc](https://docs.appcelerator.com/platform/latest/#!/guide/TDoc_Specification) that is used to document our [Titanium SDK](https://github.com/appcelerator/titanium_mobile). It is optimized for our specific needs and object structure but may also be used to document any other types that can be represented in the TDoc spec.
:::

## Getting Started

Install the plugin

```bash
yarn add -D vuepress-plugin-apidocs
# OR npm i -D vuepress-plugin-apidocs
```

and enable it in your configuration

```js
module.exports = {
  plugins: ['apidocs']
}
```

For advanced configration options see the [plugin docs](../plugins/apidocs-plugin.md).

## Metadata

Type information will be loaded from a metadata file. You can generate the required metadata file from any TDoc compliant set of YAML files using the new `metadata` command that this plugin adds to the VuePress CLI.

```sh
vuepress metadata docs ../apidocs
```

This will generate a single metadata file from all `.yml` files inside the `../apidocs` directory to the default location of `api/api.json`. All paths are resolved relative to the source directory you passed into the VuePress CLI.

You can pass multiple input paths and change the output file using the `-o` option. Please refer to `vuepress metadata --help` for a complete command overivew.

The generated metadata file will be processed and prepared for use with VuePress. Since the metadata file can get quite large, loading it entirely on the initial page load would dramatically slow down load times. To prevent that the metadata will be split by type and the plugin will generate a `.json` file for each type, which then will be loaded individually.

::: tip VUEX STORE
Metadata will be managed with Vuex, pre-fetched during SSR and loaded on demand when navigating in the browser. To setup Vuex the Webpack client entry script will be replaced with one that ships with this plugin. If you need to change this behavior, refer to the [API Reference Plugin](../plugins/apidocs-plugin.md#options) options.
:::

## Global Components

Rendering of API reference documentation can be controlled with two globally available components.

### `<ApiDocs/>`

To add API docs to any markdown file add a `<ApiDocs/>` tag where you would like to render the API docs and specify the `type` that should be rendered.

```md
<ApiDocs type="Titanium.SomeType"/>
```

### `<TypeHeader/>`

The `<ApiDocs/>` component only lists type members such as properties or methods. However, there is some more info that can be specified on a type itself like deprecation notes, or which type it inherits from. To display this information there is another globally available component named `<TypeHeader/>`.

```md
<TypeHeader type="Titanium.SomeType">
```

### Component options

Both components can be configured with the `type` and `version` props (both are optional on API pages).

- `type`: Set this to the unique type name that this component should render.
- `version`: Version of your docs to load the metadata from. Defaults to `next` if not set, or the versioning plugin is not available.

## API Pages

Simply inserting the above components anywhere in markdown files is great for smaller types. However this has some caveats. For example, VuePress will not pick up the extra headings that will be dynamically rendered by the component. To mitigate this behavior, the plugin has special API pages.

By default all markdown files under `/api` will be considered as API pages. These pages are dedicated to a single type and receive a special frontmatter configuration, which allows to further customize an API page. The [Titanium theme](../theme) for example, adds an extra navigation bar to the right side of a page for easier navigation within a type.

In addition, API pages have SSR [data pre-fetching](https://ssr.vuejs.org/guide/data.html) enabled out of the box.

### Demo

You can see a demo of an API page [here](../api/sometype.md). It is generated from the metadata in [apidocs](../../apidocs).

### Type Detection and Versioning

Instead of providing the `type` directly to the `<ApiDocs/>` component, API pages try to automatically determine the type they should be displaying from their top-level heading. This can be overridden with the `metadataKey` frontmatter option.

```md
---
metadataKey: RealTypeName
---

# Pretty type name

<ApiDocs/>
```

The `version` will also be automatically detected from the page metadata.

## Versioning Plugin Setup

::: warning PLUGIN ORDER
The plugin order is important when registering the apidocs and versioning plugin together. Always make sure that the versioning plugin comes first.
:::

When using this plugin together with the versioning plugin the metadata file needs to be stored whenever a new version is drafted. You can use the [onNewVersion](../plugins/versioning-plugin.md#onnewversion) hook from the versioning plugin for this.

```js
module.exports = context => ({
  plugins: [
    ['versioning', {
      async onNewVersion(version, versionDestPath) {
        const metadataFile = path.join(context.sourceDir, 'api', 'api.json')
        if (await fs.exists(metadataFile)) {
          const versioneddMetadataFile = path.join(versionDestPath, 'api', 'api.json')
          await fs.copyFile(metadataFile, versioneddMetadataFile)
        }
      }
    }],
    'apidocs'
  ]
})
```

Note that this uses the default values for the [metadataFile](../plugins/apidocs-plugin.md#metadatafile) and [versionedMetadataFile](../plugins/apidocs-plugin.md#versionedmetadatafile) options. Adjust this example if your changed those options.

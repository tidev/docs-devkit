# Page Metadata

The [Versioning](./versioning.md) and [API docs](api-docs.md) plugins both add additional metadata to the [$page](https://v1.vuepress.vuejs.org/guide/global-computed.html#page) which you can access in your components or even in other plugins.

## Versioning

### version

The version this page is part of.

### originalRegularPath

The original value of `regularPath`.

The versioning plugin changes `regularPath` and `path` to rewrite the routes that will be generated for your pages. This property allows you to get the original value for `regularPath`.

## API docs

### metadataKey

The type name associated with this page. Only available if the current page is an [API page](./api-docs.md#api-pages).

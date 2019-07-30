---
sidebarDepth: 0
---

# Titanium Theme for VuePress

> Supercharged version of the VuePress default theme.

<img :src="$withBase('/theme-screenshot.png')" alt="Theme Screenshot">

## Features

- Content layout using Flexboxes
- Global footer with configurable sitemap
- Built-in active header links behavior that does not rely on router state (no automatic URL changing while you scroll)
- Loads initial [Vuex](https://vuex.vuejs.org/) state from SSR
- Full support for the [versioning plugin](../guide/versioning.md)
  - Version dropdown to quickly switch through different versions of your docs
  - SearchBox with versioning support (searches only through the active version)
- Full support for the [APIDocs plugin](../guide/api-docs.md)
  - Special layout for API pages with a second navigation bar to quickly navigate through types

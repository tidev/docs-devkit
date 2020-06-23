# FontAwesome

Add FontAwesome icons to your VuePress site. Fully compatible with all free and pro icons thanks to [@fortawesome/vue-fontawesome](https://github.com/FortAwesome/vue-fontawesome).

Out of the box the plugin only installs/registers the `@fortawesome/vue-fontawesome` components and the FontAwesome SVG core library. This gives you full flexibility over the icons you want to use, but requires a little setup upfront.

## Install SVG icons

First you need to install the icons you want to use. For example, let's use the [free solid icons](https://fontawesome.com/icons?d=gallery&s=solid&m=free).

```sh
yarn add -D @fortawesome/free-solid-svg-icons
# OR npm i -D @fortawesome/free-solid-svg-icons
```

::: tip Add more styles or Pro icons
Follow the instructions in the readme of the `vue-fontawesome` component how to [add more styles or Pro icons](https://github.com/FortAwesome/vue-fontawesome#add-more-styles-or-pro-icons).
:::

## Import your icons

Now that the required SVG icons are installed they need to be registered with the FontAwesome SVG core library (to take advantage of only bundling the icons you actually use). For this, just create a file named `fa-icons.js` in your `.vuepress` folder and add the following code:

```js
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCoffee } from '@fortawesome/free-solid-svg-icons'

library.add(faCoffee)
```

This will import the :fas-coffee: icon and make it available in all your markdown files.

You can change the file that is used to import all of your icons with the [`iconsFile`](../plugins/fontawesome-plugin#iconsfile) option.

::: tip
See [Why use the concept of a library?](https://github.com/FortAwesome/vue-fontawesome#why-use-the-concept-of-a-library) for more details and examples on how to import icons.
:::

## Markdown Shorthand

For quick access in markdown files this plugin adds a special `:<prefix>-<icon>:` syntax. For example to refer to the above coffee icon from the solid icons

```md
This is the :fas-coffee: icon!
```

**Example:**

This is the :fas-coffee: icon!

## Vue Component

For more fine grained control over the displayed icon you can use the `@fortawesome/vue-fontawesome` components. For example, the basic `<font-awesome-icon />` component can be used to display the icon and pass additional options:

```md
<font-awesome-icon :icon="['fas', 'coffee']" size="4x" />
```

**Example:**

<font-awesome-icon :icon="['fas', 'coffee']" size="4x" />

See the supported [features](https://github.com/FortAwesome/vue-fontawesome#features) of `@fortawesome/vue-fontawesome` for a list of all available compoents and options. All three components are already registered as global components so you can use all basic and advanced features.

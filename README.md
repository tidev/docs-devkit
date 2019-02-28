# doc-devkit

> Tooling for Axway Appcelerator open source documentation

This is the home for all the libraries, plugins and themes to build sleek and modern documentations using VuePress.

## Packages

This is a monorepo with the following packages:

| Package | Description | Version | Links |
|---|---|---|---|
| titanium-docgen | Various generators to format Titanium API documentation | - | - |
| vuepress-plugin-apidoc | Plugin for VuePress to render API reference documentation | - | - |
| vuepress-plugin-versioning | Versioning plugin for VuePress | - | - |
| vuepress-theme-titanium | VuePress theme for Titanium projects | - | - |

## Contributing

Open source contributions are greatly appreciated! If you have a bugfix, improvement or new feature, please create
[an issue](https://github.com/appcelerator/doc-devkit/issues/new) first and submit a [pull request](https://github.com/appcelerator/doc-devkit/pulls/new) against master.

Before you contribute read through the following guidelines.

* The `master` branch contains a snapshot of the latest stable release. All development should be done in dedicated branches. **Do not submit PRs against the `master` branch.**
* Checkout relevant topic branches, e.g. `develop` and merge back against that branch.
* Your commit messages should follow the [Conventional Commits Specification](https://conventionalcommits.org/) so that changelogs and version bumps can be automatically generated. If you are not familiar with the commit message convention, you can use `npm run commit` instead of git commit, which provides an interactive CLI for generating proper commit messages.
* We will let GitHub automatically squash your PR before merging, so don't worry about making multiple small commits.

## Getting Help

If you have questions about our documentation devkit for VuePress, feel free to reach out on Stackoverflow or the
`#helpme` channel on [TiSlack](http://tislack.org). In case you find a bug, create a [new issue](/issues/new)
or open a [new JIRA ticket](https://jira.appcelerator.org).

## License

Apache License. Version 2.0
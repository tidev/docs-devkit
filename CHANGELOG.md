# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.9.0](https://github.com/appcelerator/docs-devkit/compare/v4.8.3...v4.9.0) (2020-11-10)


### Bug Fixes

* fix color shades, sidebar sub groups and type meta padding ([ffc5817](https://github.com/appcelerator/docs-devkit/commit/ffc581761be5331d94bd6d222c24b044925b11a8))
* properly handle falsy default values ([9485406](https://github.com/appcelerator/docs-devkit/commit/94854061a73857cb602d206529b9346a5aeb0b74))
* show type of constants ([a632c4a](https://github.com/appcelerator/docs-devkit/commit/a632c4ab9acff9df941b2057a8e2d1422dd2c852))


### Features

* **theme:** custom color theme for prism.js ([#83](https://github.com/appcelerator/docs-devkit/issues/83)) ([c826dc0](https://github.com/appcelerator/docs-devkit/commit/c826dc0d34e6f2c149109490800a752b0d39aef0))





## [4.8.3](https://github.com/appcelerator/docs-devkit/compare/v4.8.2...v4.8.3) (2020-10-21)


### Bug Fixes

* use axway theme gray-dk in place of hard-coded #aaa ([7723256](https://github.com/appcelerator/docs-devkit/commit/7723256))
* use named axway colors in place of hard-coded hex values ([961cbb1](https://github.com/appcelerator/docs-devkit/commit/961cbb1))





## [4.8.2](https://github.com/appcelerator/docs-devkit/compare/v4.8.1...v4.8.2) (2020-10-19)


### Bug Fixes

* scroll behavior and css adjustments ([c8cb639](https://github.com/appcelerator/docs-devkit/commit/c8cb639))
* **apidocs:** mark constants as readonly ([02ff95d](https://github.com/appcelerator/docs-devkit/commit/02ff95d))
* **apidocs:** show property default value and related constants ([b73996a](https://github.com/appcelerator/docs-devkit/commit/b73996a))
* **theme:** add axway color variables ([df8c5b3](https://github.com/appcelerator/docs-devkit/commit/df8c5b3))
* **theme:** try to use axway typography values for headers ([7fd1115](https://github.com/appcelerator/docs-devkit/commit/7fd1115))
* **theme:** use axway blue colors for inline code tags ([16bb3e5](https://github.com/appcelerator/docs-devkit/commit/16bb3e5))
* **theme:** use axway danger/success/warn colors for badges ([a543d9c](https://github.com/appcelerator/docs-devkit/commit/a543d9c))
* **theme:** use axway danger/success/warn colors for custom blocks ([4a9cfe1](https://github.com/appcelerator/docs-devkit/commit/4a9cfe1))
* **theme:** use page relativePath to generate edit link ([#70](https://github.com/appcelerator/docs-devkit/issues/70)) ([ca0e1c2](https://github.com/appcelerator/docs-devkit/commit/ca0e1c2)), closes [#48](https://github.com/appcelerator/docs-devkit/issues/48)





## [4.8.1](https://github.com/appcelerator/docs-devkit/compare/v4.8.0...v4.8.1) (2020-10-08)


### Bug Fixes

* **docgen:** better match git repo URIs, report bad via console ([444d94f](https://github.com/appcelerator/docs-devkit/commit/444d94f))





# [4.8.0](https://github.com/appcelerator/docs-devkit/compare/v4.7.0...v4.8.0) (2020-10-08)


### Bug Fixes

* **ts:** exclude global types ([#45](https://github.com/appcelerator/docs-devkit/issues/45)) ([a4e5814](https://github.com/appcelerator/docs-devkit/commit/a4e5814))


### Features

* **theme-titanium:** allow frontmatter to contain editUrl for edit this page link ([dd6a1e2](https://github.com/appcelerator/docs-devkit/commit/dd6a1e2))
* **titanium-docgen:** include editUrl in json-raw output for types ([5b0890c](https://github.com/appcelerator/docs-devkit/commit/5b0890c))





# [4.7.0](https://github.com/appcelerator/docs-devkit/compare/v4.6.1...v4.7.0) (2020-08-28)


### Features

* support macos ([bc3462f](https://github.com/appcelerator/docs-devkit/commit/bc3462f))
* **docgen:** Add more validations for since/deprecated, duplicated platform listings ([b28357b](https://github.com/appcelerator/docs-devkit/commit/b28357b))





## [4.6.1](https://github.com/appcelerator/docs-devkit/compare/v4.6.0...v4.6.1) (2020-07-22)


### Bug Fixes

* **fontawesome:** use scoped package name ([4f34515](https://github.com/appcelerator/docs-devkit/commit/4f34515))





# [4.6.0](https://github.com/appcelerator/docs-devkit/compare/v4.5.2...v4.6.0) (2020-07-21)


### Bug Fixes

* show proxy deprecation note ([#40](https://github.com/appcelerator/docs-devkit/issues/40)) ([5a26734](https://github.com/appcelerator/docs-devkit/commit/5a26734))


### Features

* **docgen:** support es6+ JS builtins ([#41](https://github.com/appcelerator/docs-devkit/issues/41)) ([d405ab4](https://github.com/appcelerator/docs-devkit/commit/d405ab4))
* font awesome plugin ([#39](https://github.com/appcelerator/docs-devkit/issues/39)) ([bcb1512](https://github.com/appcelerator/docs-devkit/commit/bcb1512))





## [4.5.2](https://github.com/appcelerator/docs-devkit/compare/v4.5.1...v4.5.2) (2020-06-23)


### Performance Improvements

* **ssr:** load type metadata on api pages only ([c3b728a](https://github.com/appcelerator/docs-devkit/commit/c3b728a))





## [4.5.1](https://github.com/appcelerator/docs-devkit/compare/v4.5.0...v4.5.1) (2020-06-19)


### Performance Improvements

* **docgen:** don't include filename properties in json-raw output ([#36](https://github.com/appcelerator/docs-devkit/issues/36)) ([0eca516](https://github.com/appcelerator/docs-devkit/commit/0eca516))
* **docgen:** don't include pretty_name in json-raw output ([#34](https://github.com/appcelerator/docs-devkit/issues/34)) ([7e5decd](https://github.com/appcelerator/docs-devkit/commit/7e5decd))
* cache page lookup ([4c27c0f](https://github.com/appcelerator/docs-devkit/commit/4c27c0f))





# [4.5.0](https://github.com/appcelerator/docs-devkit/compare/v4.4.1...v4.5.0) (2020-06-18)


### Bug Fixes

* mark all nested sidebar items active ([fcc5312](https://github.com/appcelerator/docs-devkit/commit/fcc5312))
* nested sidebars without path ([62bacb1](https://github.com/appcelerator/docs-devkit/commit/62bacb1))
* pass reactive data to ensure child component updates ([1776df0](https://github.com/appcelerator/docs-devkit/commit/1776df0))
* sidebar css fixes ([396ac84](https://github.com/appcelerator/docs-devkit/commit/396ac84))


### Features

* support nested sidebars ([1e28793](https://github.com/appcelerator/docs-devkit/commit/1e28793))





## [4.4.1](https://github.com/appcelerator/docs-devkit/compare/v4.4.0...v4.4.1) (2020-06-12)


### Bug Fixes

* **apidocs:** handle no method parameters ([b124c1d](https://github.com/appcelerator/docs-devkit/commit/b124c1d))
* **apidocs:** handle when type metadata not found w/ no Error ([a036e0d](https://github.com/appcelerator/docs-devkit/commit/a036e0d))
* **metadata:** handle empty methods/properties/events on type ([42ce5c8](https://github.com/appcelerator/docs-devkit/commit/42ce5c8))





# [4.4.0](https://github.com/appcelerator/docs-devkit/compare/v4.3.1...v4.4.0) (2020-06-12)


### Bug Fixes

* **docgen:** avoid outputting null and empty array values to shrink output json ([3908195](https://github.com/appcelerator/docs-devkit/commit/3908195))


### Features

* **validate:** warning for misxed case event names, split String vs ASCII validation ([ed21978](https://github.com/appcelerator/docs-devkit/commit/ed21978))





## [4.3.1](https://github.com/appcelerator/docs-devkit/compare/v4.3.0...v4.3.1) (2020-04-17)


### Bug Fixes

* **docgen:** allow unknown properties on ListDataItem ([774051d](https://github.com/appcelerator/docs-devkit/commit/774051d))





# [4.3.0](https://github.com/appcelerator/docs-devkit/compare/v4.2.0...v4.3.0) (2020-03-05)


### Bug Fixes

* **docgen:** build correct path ([#27](https://github.com/appcelerator/docs-devkit/issues/27)) ([2f085f0](https://github.com/appcelerator/docs-devkit/commit/2f085f0))
* **docgen:** ts definition for Ti.Android.R ([#31](https://github.com/appcelerator/docs-devkit/issues/31)) ([388df48](https://github.com/appcelerator/docs-devkit/commit/388df48))
* **docgen:** use correct include syntax for ejs3 ([e4dde5d](https://github.com/appcelerator/docs-devkit/commit/e4dde5d))
* **docgen/modulehtml:** correct require path ([e00f175](https://github.com/appcelerator/docs-devkit/commit/e00f175))


### Features

* **docgen:** improve typescript generator ([#25](https://github.com/appcelerator/docs-devkit/issues/25)) ([34f07c5](https://github.com/appcelerator/docs-devkit/commit/34f07c5))
* **docgen:** improved accessors deprecation generation ([#24](https://github.com/appcelerator/docs-devkit/issues/24)) ([5981029](https://github.com/appcelerator/docs-devkit/commit/5981029))





# [4.2.0](https://github.com/appcelerator/docs-devkit/compare/v4.1.0...v4.2.0) (2020-02-05)


### Features

* **docgen:** accept whitelist of constants references to skip ([#26](https://github.com/appcelerator/docs-devkit/issues/26)) ([3b1c537](https://github.com/appcelerator/docs-devkit/commit/3b1c537))





# [4.1.0](https://github.com/appcelerator/docs-devkit/compare/v4.0.1...v4.1.0) (2019-12-12)


### Features

* **docgen:** improve validation to include warnings ([#21](https://github.com/appcelerator/docs-devkit/issues/21)) ([efe2aca](https://github.com/appcelerator/docs-devkit/commit/efe2aca))





## [4.0.1](https://github.com/appcelerator/docs-devkit/compare/v4.0.0...v4.0.1) (2019-12-11)

**Note:** Version bump only for package docs-devkit





# 4.0.0 (2019-12-02) [YANKED]

# 3.0.0 (2019-12-02) [YANKED]

# 2.0.0 (2019-12-02) [YANKED]

# 1.0.0 (2019-12-02)


### Bug Fixes

* **apidocs:** add platform availability icons ([ece76c7](https://github.com/appcelerator/docs-devkit/commit/ece76c7))
* **apidocs:** process metadata after markdown is completely initialized ([3db479f](https://github.com/appcelerator/docs-devkit/commit/3db479f))
* **apidocs:** properly render method and event params ([28109e6](https://github.com/appcelerator/docs-devkit/commit/28109e6))
* **apidocs:** replace state with correct structure during ssr ([f2e3ed3](https://github.com/appcelerator/docs-devkit/commit/f2e3ed3))
* **apidocs:** use markdown renderer return type ([7e935e5](https://github.com/appcelerator/docs-devkit/commit/7e935e5))
* **apidocs:** use type-links component instead of old custom formatter ([8953f08](https://github.com/appcelerator/docs-devkit/commit/8953f08))
* **docgen:** add missing typescript generator changes ([22d0779](https://github.com/appcelerator/docs-devkit/commit/22d0779))
* **docgen:** add missing validate command ([807f211](https://github.com/appcelerator/docs-devkit/commit/807f211))
* **docgen:** allow Error and RegExp as predefined types ([#10](https://github.com/appcelerator/docs-devkit/issues/10)) ([428aedd](https://github.com/appcelerator/docs-devkit/commit/428aedd))
* **docgen:** correctly handle array syntax in callbacks ([#3](https://github.com/appcelerator/docs-devkit/issues/3)) ([eb43ad5](https://github.com/appcelerator/docs-devkit/commit/eb43ad5))
* **ios:** do not show anchor links for top two level headings ([c4b1497](https://github.com/appcelerator/docs-devkit/commit/c4b1497))
* **theme:** add bottom padding to home page ([6b2d0be](https://github.com/appcelerator/docs-devkit/commit/6b2d0be))
* **theme:** add default content class ([d516092](https://github.com/appcelerator/docs-devkit/commit/d516092))
* **theme:** apply latest theme-default ([7b15292](https://github.com/appcelerator/docs-devkit/commit/7b15292))
* **theme:** guard against undefined paths ([ed03520](https://github.com/appcelerator/docs-devkit/commit/ed03520))
* **theme:** height wrapper to avoid glitches ([7923ded](https://github.com/appcelerator/docs-devkit/commit/7923ded))
* **theme:** mark versions dropdown as can-hide ([eecb704](https://github.com/appcelerator/docs-devkit/commit/eecb704))
* **theme:** only show api sidebar button if page has api docs ([06513cb](https://github.com/appcelerator/docs-devkit/commit/06513cb))
* **theme:** show footer only if configured ([9d9f4d2](https://github.com/appcelerator/docs-devkit/commit/9d9f4d2))
* **theme:** show version dropdown on versioned pages only ([ab18f4d](https://github.com/appcelerator/docs-devkit/commit/ab18f4d))
* use versioned links in navbar ([9a45f85](https://github.com/appcelerator/docs-devkit/commit/9a45f85))
* **theme:** test for available headers before accessing ([91bb50d](https://github.com/appcelerator/docs-devkit/commit/91bb50d))
* adapt changed plugin name ([e3f04de](https://github.com/appcelerator/docs-devkit/commit/e3f04de))
* **theme:** use correct edit link for pages ([953b39e](https://github.com/appcelerator/docs-devkit/commit/953b39e))
* **versioning:** include non-locale sidebar config in snapshot ([#6](https://github.com/appcelerator/docs-devkit/issues/6)) ([4b817b4](https://github.com/appcelerator/docs-devkit/commit/4b817b4))
* reset version number ([d8a4be2](https://github.com/appcelerator/docs-devkit/commit/d8a4be2))
* **versioning:** more safeguards in case no versions were created yet ([0615344](https://github.com/appcelerator/docs-devkit/commit/0615344))
* add container plugin ([346d31c](https://github.com/appcelerator/docs-devkit/commit/346d31c))
* add default theme color palette ([31d20e6](https://github.com/appcelerator/docs-devkit/commit/31d20e6))
* compare name instead of assign ([e02d7a2](https://github.com/appcelerator/docs-devkit/commit/e02d7a2))
* **versioning:** page metadata and path fixes ([5029baf](https://github.com/appcelerator/docs-devkit/commit/5029baf))
* **versioning:** properly generate versioned edit links ([1be0e45](https://github.com/appcelerator/docs-devkit/commit/1be0e45))
* **versioning:** properly handle static pages ([2f1e49e](https://github.com/appcelerator/docs-devkit/commit/2f1e49e))
* prevent duplicate versions on full reload ([33c83eb](https://github.com/appcelerator/docs-devkit/commit/33c83eb))
* respect locale in version dropdown ([3e80fe9](https://github.com/appcelerator/docs-devkit/commit/3e80fe9))
* update import paths for latest VuePress alpha ([287445c](https://github.com/appcelerator/docs-devkit/commit/287445c))


### Features

* **apidocs:** add plugin options ([d674e5f](https://github.com/appcelerator/docs-devkit/commit/d674e5f))
* **docgen:** copy over images from any of the input paths for html output ([7fd48b6](https://github.com/appcelerator/docs-devkit/commit/7fd48b6))
* **docgen:** make it work as an independent module ([4ca640a](https://github.com/appcelerator/docs-devkit/commit/4ca640a))
* **docgen:** reference free-form text content from other files ([7eae53f](https://github.com/appcelerator/docs-devkit/commit/7eae53f))
* **theme:** update code color ([15f81f8](https://github.com/appcelerator/docs-devkit/commit/15f81f8))
* **validate:** add ability to whitelist types ([#5](https://github.com/appcelerator/docs-devkit/issues/5)) ([44d893b](https://github.com/appcelerator/docs-devkit/commit/44d893b))
* **validate:** more strict checks on event properties ([ca8c76f](https://github.com/appcelerator/docs-devkit/commit/ca8c76f))
* **versioning:** add support for non-versioned pages ([d6246cf](https://github.com/appcelerator/docs-devkit/commit/d6246cf))
* **versioning:** search through current version only ([ce69184](https://github.com/appcelerator/docs-devkit/commit/ce69184))
* custom next version label ([85d0746](https://github.com/appcelerator/docs-devkit/commit/85d0746))
* make footer configurable ([27e4e14](https://github.com/appcelerator/docs-devkit/commit/27e4e14))
* update active header link in sidebar ([31d4da7](https://github.com/appcelerator/docs-devkit/commit/31d4da7))
* update to VuePress 1.0.2 ([74d7ca8](https://github.com/appcelerator/docs-devkit/commit/74d7ca8))


### BREAKING CHANGES

* **validate:** All documented event properties need to have a type





# [0.2.0](https://github.com/appcelerator/docs-devkit/compare/v0.1.5...v0.2.0) (2019-09-09)


### Features

* **docgen:** copy over images from any of the input paths for html output ([7fd48b6](https://github.com/appcelerator/docs-devkit/commit/7fd48b6))
* **validate:** add ability to whitelist types ([#5](https://github.com/appcelerator/docs-devkit/issues/5)) ([44d893b](https://github.com/appcelerator/docs-devkit/commit/44d893b))





## [0.1.5](https://github.com/appcelerator/docs-devkit/compare/v0.1.4...v0.1.5) (2019-08-07)


### Bug Fixes

* **docgen:** correctly handle array syntax in callbacks ([#3](https://github.com/appcelerator/docs-devkit/issues/3)) ([eb43ad5](https://github.com/appcelerator/docs-devkit/commit/eb43ad5))





## [0.1.4](https://github.com/appcelerator/docs-devkit/compare/v0.1.3...v0.1.4) (2019-07-30)


### Bug Fixes

* **docgen:** add missing validate command ([807f211](https://github.com/appcelerator/docs-devkit/commit/807f211))





## [0.1.3](https://github.com/appcelerator/docs-devkit/compare/v0.1.2...v0.1.3) (2019-07-27)


### Bug Fixes

* **apidocs:** replace state with correct structure during ssr ([f2e3ed3](https://github.com/appcelerator/docs-devkit/commit/f2e3ed3))





## [0.1.2](https://github.com/appcelerator/docs-devkit/compare/v0.1.1...v0.1.2) (2019-07-27)


### Bug Fixes

* **apidocs:** properly render method and event params ([28109e6](https://github.com/appcelerator/docs-devkit/commit/28109e6))
* **apidocs:** use type-links component instead of old custom formatter ([8953f08](https://github.com/appcelerator/docs-devkit/commit/8953f08))
* **theme:** test for available headers before accessing ([91bb50d](https://github.com/appcelerator/docs-devkit/commit/91bb50d))





## [0.1.1](https://github.com/appcelerator/docs-devkit/compare/v0.1.0...v0.1.1) (2019-07-27)


### Bug Fixes

* **apidocs:** use markdown renderer return type ([7e935e5](https://github.com/appcelerator/docs-devkit/commit/7e935e5))





# 0.1.0 (2019-07-27)


### Bug Fixes

* **apidocs:** add platform availability icons ([ece76c7](https://github.com/appcelerator/docs-devkit/commit/ece76c7))
* **apidocs:** process metadata after markdown is completely initialized ([3db479f](https://github.com/appcelerator/docs-devkit/commit/3db479f))
* **docgen:** add missing typescript generator changes ([22d0779](https://github.com/appcelerator/docs-devkit/commit/22d0779))
* **ios:** do not show anchor links for top two level headings ([c4b1497](https://github.com/appcelerator/docs-devkit/commit/c4b1497))
* **theme:** add bottom padding to home page ([6b2d0be](https://github.com/appcelerator/docs-devkit/commit/6b2d0be))
* **theme:** add default content class ([d516092](https://github.com/appcelerator/docs-devkit/commit/d516092))
* **theme:** apply latest theme-default ([7b15292](https://github.com/appcelerator/docs-devkit/commit/7b15292))
* **theme:** guard against undefined paths ([ed03520](https://github.com/appcelerator/docs-devkit/commit/ed03520))
* **theme:** height wrapper to avoid glitches ([7923ded](https://github.com/appcelerator/docs-devkit/commit/7923ded))
* **theme:** mark versions dropdown as can-hide ([eecb704](https://github.com/appcelerator/docs-devkit/commit/eecb704))
* **theme:** only show api sidebar button if page has api docs ([06513cb](https://github.com/appcelerator/docs-devkit/commit/06513cb))
* prevent duplicate versions on full reload ([33c83eb](https://github.com/appcelerator/docs-devkit/commit/33c83eb))
* **theme:** show footer only if configured ([9d9f4d2](https://github.com/appcelerator/docs-devkit/commit/9d9f4d2))
* **theme:** show version dropdown on versioned pages only ([ab18f4d](https://github.com/appcelerator/docs-devkit/commit/ab18f4d))
* **theme:** use correct edit link for pages ([953b39e](https://github.com/appcelerator/docs-devkit/commit/953b39e))
* adapt changed plugin name ([e3f04de](https://github.com/appcelerator/docs-devkit/commit/e3f04de))
* **versioning:** more safeguards in case no versions were created yet ([0615344](https://github.com/appcelerator/docs-devkit/commit/0615344))
* add container plugin ([346d31c](https://github.com/appcelerator/docs-devkit/commit/346d31c))
* add default theme color palette ([31d20e6](https://github.com/appcelerator/docs-devkit/commit/31d20e6))
* compare name instead of assign ([e02d7a2](https://github.com/appcelerator/docs-devkit/commit/e02d7a2))
* reset version number ([d8a4be2](https://github.com/appcelerator/docs-devkit/commit/d8a4be2))
* **versioning:** page metadata and path fixes ([5029baf](https://github.com/appcelerator/docs-devkit/commit/5029baf))
* **versioning:** properly generate versioned edit links ([1be0e45](https://github.com/appcelerator/docs-devkit/commit/1be0e45))
* **versioning:** properly handle static pages ([2f1e49e](https://github.com/appcelerator/docs-devkit/commit/2f1e49e))
* respect locale in version dropdown ([3e80fe9](https://github.com/appcelerator/docs-devkit/commit/3e80fe9))
* update import paths for latest VuePress alpha ([287445c](https://github.com/appcelerator/docs-devkit/commit/287445c))
* use versioned links in navbar ([9a45f85](https://github.com/appcelerator/docs-devkit/commit/9a45f85))


### Features

* custom next version label ([85d0746](https://github.com/appcelerator/docs-devkit/commit/85d0746))
* make footer configurable ([27e4e14](https://github.com/appcelerator/docs-devkit/commit/27e4e14))
* update active header link in sidebar ([31d4da7](https://github.com/appcelerator/docs-devkit/commit/31d4da7))
* update to VuePress 1.0.2 ([74d7ca8](https://github.com/appcelerator/docs-devkit/commit/74d7ca8))
* **apidocs:** add plugin options ([d674e5f](https://github.com/appcelerator/docs-devkit/commit/d674e5f))
* **docgen:** make it work as an independent module ([4ca640a](https://github.com/appcelerator/docs-devkit/commit/4ca640a))
* **docgen:** reference free-form text content from other files ([7eae53f](https://github.com/appcelerator/docs-devkit/commit/7eae53f))
* **theme:** update code color ([15f81f8](https://github.com/appcelerator/docs-devkit/commit/15f81f8))
* **versioning:** add support for non-versioned pages ([d6246cf](https://github.com/appcelerator/docs-devkit/commit/d6246cf))
* **versioning:** search through current version only ([ce69184](https://github.com/appcelerator/docs-devkit/commit/ce69184))

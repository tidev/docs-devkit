const path = require('path')

const fontAwesomePlugin = require('./lib/markdown')

module.exports = (options, context) => {
  const iconsFile = options.iconsFile || path.resolve(context.sourceDir, '.vuepress', 'fa-icons.js')
  return {
    enhanceAppFiles: [
      path.resolve(__dirname, 'lib', 'enhance.js'),
      iconsFile
    ],

    chainMarkdown (config) {
      config.plugin('fontawesome')
        .use(fontAwesomePlugin)
    },

    chainWebpack (config) {
      config.resolve.modules.add(path.join(__dirname, 'node_modules'))
    }
  }
}

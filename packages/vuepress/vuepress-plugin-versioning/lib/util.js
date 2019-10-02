const fs = require('fs-extra')
const path = require('path')

async function snapshotSidebar (siteConfig, versionDestPath) {
  const sidebarConfig = {
    locales: siteConfig.themeConfig.locales,
    sidebar: siteConfig.themeConfig.sidebar
  }

  return fs.writeFile(path.join(versionDestPath, 'sidebar.config.json'), JSON.stringify(sidebarConfig, null, 2))
}

function updateSidebarConfig (config, version) {
  if (config.locales) {
    Object.keys(config.locales).forEach(localePath => {
      const locale = config.locales[localePath]
      if (locale.sidebar) {
        locale.sidebar = rewriteSidebar(locale.sidebar, version, localePath)
      }
    })
  }

  if (config.sidebar) {
    config.sidebar = rewriteSidebar(config.sidebar, version)
  }

  return config
}

function rewriteSidebar (sidebarConfig, version, localePath) {
  if (Array.isArray(sidebarConfig)) {
    return sidebarConfig.map(item => {
      if (Array.isArray(item)) {
        return [generateVersionedPath(item, version, localePath), item[1]]
      } else if (typeof item === 'string') {
        return generateVersionedPath(item, version, localePath)
      } else {
        if (item.path) {
          item.path = `${version}${item.path}`
        } else {
          item.children = rewriteSidebar(item.children, version, localePath)
        }
        return item
      }
    })
  } else {
    return Object.keys(sidebarConfig).reduce((config, key) => {
      config[generateVersionedPath(key, version, localePath)] = sidebarConfig[key]
      return config
    }, {})
  }
}

function generateVersionedPath (path, version, localePath) {
  const localePattern = new RegExp(`^${localePath}`)
  if (localePath && path.match(localePattern)) {
    return path.replace(localePattern, `${localePath}${version}/`)
  } else if (version) {
    return `/${version}/${path}`
  }

  return `/${path}`
}

module.exports = {
  generateVersionedPath,
  snapshotSidebar,
  updateSidebarConfig
}

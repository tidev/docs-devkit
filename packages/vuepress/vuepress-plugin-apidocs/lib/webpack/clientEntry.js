/* global VUEPRESS_VERSION, LAST_COMMIT_HASH*/

import { createApp } from '@vuepress/core/lib/client/app.js'
import { sync } from 'vuex-router-sync'

window.__VUEPRESS__ = {
  version: VUEPRESS_VERSION,
  hash: LAST_COMMIT_HASH
}

const pageLookupCache = new Map()

createApp(false /* isServer */).then(({ app, router }) => {
  const store = app.$options.store
  if (window.__INITIAL_STATE__) {
    store.replaceState(window.__INITIAL_STATE__)
  }
  sync(store, router)

  window.__VUEPRESS_VERSION__ = {
    version: VUEPRESS_VERSION,
    hash: LAST_COMMIT_HASH
  }

  router.onReady(() => {
    const pages = app.$site.pages
    for (let i = 0; i < pages.length; i++) {
      const path = pages[i].path.toLowerCase()
      pageLookupCache.set(path, i)
    }
    if (!window.__INITIAL_STATE__) {
      fetchMetadata(router.currentRoute, pages, store)
    }

    router.beforeResolve((to, from, next) => {
      if (to.path === from.path) {
        return next()
      }
      fetchMetadata(to, pages, store).then(next, next)
    })

    app.$mount('#app')
  })
})

function fetchMetadata (route, pages, store) {
  return new Promise((resolve, reject) => {
    const page = findPageForPath(pages, route.path)
    if (!page) {
      return resolve()
    }

    let metadataKey = page.metadataKey
    if (!metadataKey) {
      // Ignore pages with no API metadata key
      return resolve()
    }

    metadataKey = `${page.version || 'next'}/${metadataKey}`
    if (store.getters['metadata/getMetadata'](metadataKey)) {
      return resolve()
    }

    store.dispatch('metadata/fetchMetadata', metadataKey).then(resolve, reject)
  })
}

function findPageForPath (pages, path) {
  return pages[pageLookupCache.get(path)]
}

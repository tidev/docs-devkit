import metadata from '@dynamic/metadata'
import originalServerEntry from '@vuepress/core/lib/client/serverEntry'
import { sync } from 'vuex-router-sync'

export default context => new Promise((resolve, reject) => {
  originalServerEntry(context).then(app => {
    const router = app.$options.router
    const store = app.$options.store

    sync(store, router)

    router.onReady(() => {
      const matchedComponents = router.getMatchedComponents()
      if (!matchedComponents.length) {
        return reject({ code: 404 })
      }

      const apiRoutePattern = /^\/api\//
      const currentRoutePath = router.currentRoute.path
      if (!apiRoutePattern.test(currentRoutePath)) {
        return resolve(app)
      }

      const metadataKey = app.$page.metadataKey
      if (!metadataKey) {
        // Skip pages with no associated API metadata
        return resolve(app)
      }

      const version = app.$page.version || 'next'
      const versionedMetadataKey = `${version}/${metadataKey}`
      store.replaceState({
        metadata: {
          metadata: {
            [versionedMetadataKey]: metadata[version][metadataKey]
          }
        }
      })
      context.state = store.state

      resolve(app)
    })
  }, reject)
})

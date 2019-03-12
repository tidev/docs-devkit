/* global VUEPRESS_VERSION, LAST_COMMIT_HASH*/

import { createApp } from '@vuepress/core/lib/client/app.js'
import { sync } from 'vuex-router-sync';

const { app, router } = createApp(false /* isServer */)

const store = app.$options.store
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__);
}
sync(store, router);

window.__VUEPRESS_VERSION__ = {
  version: VUEPRESS_VERSION,
  hash: LAST_COMMIT_HASH
}

router.onReady(() => {
  if (!window.__INITIAL_STATE__) {
    fetchMetadata(router.currentRoute);
  }

  router.beforeResolve((to, from, next) => {
    if (to.path === from.path) {
      return next();
    }
    fetchMetadata(to).then(next, next);
  });

  app.$mount('#app')
})

function fetchMetadata(route) {
  return new Promise((resolve, reject) => {
    const page = findPageForPath(app.$site.pages, route.path);
    if (!page) {
      return resolve();
    }

    let metadataKey = page.metadataKey;
    if (!metadataKey) {
      // Ignore pages with no API metadata key
      return resolve();
    }

    metadataKey = `${page.version || 'next'}/${metadataKey}`;
    if (store.state.metadata[metadataKey]) {
      console.log('State data already available');
      return resolve();
    }

    store.dispatch('fetchMetadata', metadataKey).then(resolve, reject);
  });
}

function findPageForPath(pages, path) {
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    if (page.path.toLowerCase() === path.toLowerCase()) {
      return page
    }
  }

  return null;
}
import http from 'axios'

import { LOADING, LOADED } from './mutation-types'

const RequestState = {
  LOADING: 1
}

export function createMetadataModule (store, Vue, baseUrl) {
  return {
    namespaced: true,
    state: {
      metadata: {},
      requests: {}
    },
    getters: {
      getMetadata: (state) => (typeName) => {
        return state.metadata[typeName]
      }
    },
    actions: {
      async fetchMetadata ({ commit, state }, id) {
        if (state.requests[id] === RequestState.LOADING) {
          return new Promise(resolve => {
            const requestUnsubscribe = store.subscribe(mutation => {
              if (mutation.type === `metadata/${LOADED}` && mutation.payload.id === id) {
                // removing the subscription directly inside a subscription handler causes
                // odd behavior. Using setTimeout fixes this
                setTimeout(() => {
                  requestUnsubscribe()
                })
                resolve()
              }
            })
          })
        }
        const url = `${baseUrl}metadata/${id.toLowerCase()}.json`
        commit(LOADING, id)
        const { data } = await http.get(url)
        commit(LOADED, { id, metadata: data })
      }
    },
    mutations: {
      [LOADING]: (state, id) => {
        Vue.set(state.requests, id, RequestState.LOADING)
      },
      [LOADED] (state, { id, metadata }) {
        Vue.set(state.metadata, id, metadata)
        Vue.delete(state.requests, id)
      }
    }
  }
}

import http from 'axios';

export function createMetadataModule(Vue, baseUrl) {
  return {
    state: {
      metadata: {}
    },
    getters: {
      getMetadata: (state) => (typeName) => {
        console.log(`getMetadata ${typeName}`)
        console.log(state.metadata[typeName] || {})
        return state.metadata[typeName] || {};
      }
    },
    actions: {
      fetchMetadata ({ commit }, id) {
        const url = `${baseUrl}metadata/${id.toLowerCase()}.json`;
        return http.get(url).then(response => {
          commit('setMetadata', { id, metadata: response.data });
        });
      }
    },
    mutations: {
      setMetadata (state, { id, metadata }) {
        Vue.set(state.metadata, id, metadata);
      }
    }
  }
}
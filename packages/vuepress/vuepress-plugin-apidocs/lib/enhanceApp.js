import Vuex from 'vuex'
import { createMetadataModule } from './store'

export default ({ Vue, options, router }) => {
  Vue.use(Vuex)
  const store = new Vuex.Store()
  const metadataModule = createMetadataModule(store, Vue, router.options.base)
  store.registerModule('metadata', metadataModule)

  options.store = store
}

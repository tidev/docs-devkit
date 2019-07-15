import Vuex from 'vuex';
import { createMetadataModule } from './utils/store'

export default ({ Vue, options, router }) => {
  Vue.use(Vuex);
  const store = new Vuex.Store({
    modules: {
      metadata: createMetadataModule(Vue, router.options.base)
    }
  })
  options.store = store;
}

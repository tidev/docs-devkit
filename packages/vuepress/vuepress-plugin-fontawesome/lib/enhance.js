import {
  FontAwesomeIcon,
  FontAwesomeLayers,
  FontAwesomeLayersText
} from '@fortawesome/vue-fontawesome'

export default ({ Vue }) => {
  Vue.component('font-awesome-icon', FontAwesomeIcon)
  Vue.component('font-awesome-layers', FontAwesomeLayers)
  Vue.component('font-awesome-layers-text', FontAwesomeLayersText)
}

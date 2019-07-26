<template>
  <div v-if="metadata" class="api-docs">
    <PropertyList :properties="metadata.properties"/>
    <MethodList :methods="metadata.methods"/>
    <EventList :events="metadata.events"/>
    <ConstantList :constants="metadata.constants"/>
  </div>
  <div class="danger custom-block" v-else-if="error">
    <p class="custom-block-title">TYPE NOT FOUND</p>
    <p >Failed to load API docs metadata for type "{{typeName}}". Error: {{error.message}}</p>
  </div>
  <content-loader :width="740" :height="110" class="content-loading" v-else>
    <rect x="0" y="0" rx="3" ry="3" width="200" height="20" />
    <rect x="210" y="0" rx="3" ry="3" width="100" height="20" />

    <rect x="20" y="40" rx="3" ry="3" width="250" height="20" />

    <rect x="0" y="80" rx="3" ry="3" width="400" height="14" />
    <rect x="0" y="100" rx="3" ry="3" width="250" height="14" />

    <rect x="590" y="00" rx="3" ry="3" width="150" height="10" />
    <rect x="660" y="18" rx="3" ry="3" width="80" height="14" />
  </content-loader>
</template>

<script>
import { ContentLoader } from 'vue-content-loader'

import PropertyList from '../components/PropertyList'
import MethodList from '../components/MethodList'
import EventList from '../components/EventList'
import ConstantList from '../components/ConstantList'
import TypeComponentMixin from '../lib/utils/type-component-mixin'

export default {
  components: {
    ContentLoader,
    PropertyList,
    MethodList,
    EventList,
    ConstantList
  },
  mixins: [TypeComponentMixin]
}
</script>

<style lang="stylus">
.member-list
  & h2, h3, h4
    margin-top: -3.1rem;
    padding-top: 4.6rem;
    margin-bottom: 0;

  .member-header
    display flex

    &>h3, h4
      flex-grow 1
</style>


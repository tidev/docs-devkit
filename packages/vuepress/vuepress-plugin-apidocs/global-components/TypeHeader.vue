<template>
  <div class="type-header" v-if="metadata">
    <div class="type-summary">
      <div class="summary-content" v-html="metadata.summary"></div>
      <div class="type-metas">
        <AvailabilityInfo :platforms="metadata.platforms"/>
        <div v-if="metadata.extends" class="type-meta">
          <div class="type-meta-name">
            Extends
          </div>
          <div class="type-meta-value">
            <TypeLink :type="metadata.extends"/>
          </div>
        </div>
      </div>
    </div>
    <div class="tip custom-block" v-if="metadata.type === 'pseudo'">
      <p class="custom-block-title">NOTE</p>
      <p>This is an abstract type. Any object of this structure can be used where this type is used.</p>
    </div>
  </div>
  <div class="danger custom-block" v-else-if="!isKnownType || error">
    <p class="custom-block-title">TYPE NOT FOUND</p>
    <p>Failed to load API docs metadata for type "{{typeName}}".<span v-if="error"> Error: {{error.message}}</span></p>
  </div>
  <content-loader :width="740" :height="100" class="content-loading" v-else>
    <rect x="0" y="0" rx="3" ry="3" width="400" height="14" />
    <rect x="0" y="25" rx="3" ry="3" width="250" height="14" />

    <rect x="590" y="00" rx="3" ry="3" width="150" height="10" />
    <rect x="660" y="18" rx="3" ry="3" width="80" height="14" />
    <rect x="590" y="50" rx="3" ry="3" width="150" height="10" />
    <rect x="660" y="68" rx="3" ry="3" width="80" height="14" />
  </content-loader>
</template>

<script>
import { ContentLoader } from 'vue-content-loader'

import AvailabilityInfo from '../components/AvailabilityInfo'
import TypeComponentMixin from '../lib/utils/type-component-mixin'

export default {
  components: { AvailabilityInfo, ContentLoader },
  mixins: [TypeComponentMixin]
}
</script>

<style lang="stylus">
@require '../styles/main'

.type-summary
  margin 1rem 0
  display flex
  justify-content space-between

  &>.summary-content
    padding-right 1rem

  &>.type-metas
    flex-shrink 0

@media (max-width: $MQMobile)
  .type-summary
    flex-direction column

    &>.summary-content
      padding 0
</style>

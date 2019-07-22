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
</template>

<script>
import AvailabilityInfo from '../components/AvailabilityInfo'

export default {
  components: { AvailabilityInfo },
  props: {
    type: String
  },
  computed: {
    typeName () {
      return `${this.$page.version || 'next'}/${this.type || this.$page.metadataKey}`
    },
    metadata () {
      return this.$store.getters.getMetadata(this.typeName)
    }
  }
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

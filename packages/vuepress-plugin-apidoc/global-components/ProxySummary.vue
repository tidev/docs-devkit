<template>
  <div class="type-header" v-if="metadata">
    <div class="proxy-summary">
      <div class="summary-content" v-html="metadata.summary"></div>
      <div class="proxy-metas">
        <AvailabilityInfo :platforms="metadata.platforms"/>
        <div v-if="metadata.extends" class="proxy-meta">
          <div class="proxy-meta-name">
            Extends
          </div>
          <div class="proxy-meta-value">
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
import AvailabilityInfo from '../components/AvailabilityInfo';

export default {
  components: { AvailabilityInfo },
  computed: {
    metadata: function () {
      const key = `${this.$page.version || 'next'}/${this.$page.metadataKey}`;
      return this.$store.state.metadata[key] || {};
    }
  }
}
</script>

<style lang="stylus">
.proxy-summary
  margin 1rem 0
  display flex
  justify-content space-between

  &>.summary-content
    padding-right 1rem

  &>.proxy-metas
    flex-shrink 0

@media (max-width: $MQMobile)
  .proxy-summary
    flex-direction column

    &>.summary-content
      padding 0

</style>

<template>
  <span class="type-links">
    <template v-for="(typeName, index) in normalizedTypes">
      <type-link :type="typeName" :key="typeName"></type-link>
      <span class="type-devider" v-if="index < normalizedTypes.length - 1" :key="'devider' + index"> | </span>
    </template>
  </span>
</template>

<script>
import TypeLink from './TypeLink'

export default {
  components: {
    TypeLink
  },
  props: {
    types: {
      type: [Array, Object, String],
      required: true
    }
  },
  computed: {
    normalizedTypes: function () {
      const types = this.types.type ? this.types.type : this.types
      if (typeof types === 'string') {
        return types.split('|')
      } else if (Array.isArray(types)) {
        return types.map(type => type.type ? type.type : type)
      } else {
        throw Error(`Unknown type format: ${JSON.stringify(types)}`)
      }
    }
  }
}
</script>

<style lang="stylus">
.type-links
  .type-devider
    color $gray-dk
</style>

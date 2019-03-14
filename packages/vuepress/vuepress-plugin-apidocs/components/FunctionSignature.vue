<template>
  <p class="type-signature function-signature">
    <span class="static" v-if="!instance">(static)</span> <span>{{name}}({{parameterNames.join(', ')}})</span> <span class="return-type">→ <TypeLinks :types="returns"/></span>
  </p>
</template>

<script>
export default {
  props: {
    name: String,
    instance: {
      type: Boolean,
      default: true
    },
    parameters: {
      type: Array,
      default: () => []
    },
    returns: [Array, Object]
  },
  computed: {
    parameterNames: function () {
      return this.parameters.map(value => value.name)
    }
  }
}
</script>

<style lang="stylus">
.function-signature
  &>.static, .return-type
    color: #aaaaaa
</style>


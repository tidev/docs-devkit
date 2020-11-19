<template>
  <div class="type-signature function-signature">
    <span class="static" v-if="!instance">(static)</span> <span>{{name}}({{parameterNames}})</span> <span class="return-type">→ <TypeLinks :types="returns"/></span>
  </div>
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
      let value = ''
      let first = true
      let closeCount = 0
      for (const param of this.parameters) {
        if (param.repeatable) {
          // Close the others!
          value += ']'.repeat(closeCount)
          closeCount = 0
        }
        if (param.optional) {
          value += '['
          closeCount++
        }
        if (!first) {
          value += ', '
        }
        if (param.repeatable) {
          value += '...'
        }
        value += param.name
        first = false
      }
      if (closeCount > 0) {
        value += ']'.repeat(closeCount)
        closeCount = 0
      }
      return value
    }
  }
}
</script>

<style lang="stylus">
.function-signature
  &>.static, .return-type
    color: $gray-dk
</style>


<template>
  <div class="type-signature property-signature">
    <span class="static" v-if="!instance">(static)</span> <span>{{name}}</span> <span class="return-type">:<TypeLinks :types="type"/></span>
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
    type: [Array, String]
  }
}
</script>

<style lang="stylus">
.property-signature
  &>.static, .return-type
    color: #aaaaaa
</style>



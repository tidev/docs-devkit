<template>
  <div v-if="deprecated" class="warning custom-block">
    <p class="custom-block-title">DEPRECATED SINCE {{deprecated.since}}</p>
    <p v-html="deprecated.notes"></p>
  </div>
</template>

<script>
export default {
  props: {
    deprecated: Object
  }
}
</script>

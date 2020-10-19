<template>
  <div class="valid-constants">
    This API can be assigned the following constants:

    <ul>
      <li v-for="constant in constants" :key="constant">
        <type-link :type="constant"/>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    constants: Array
  }
}
</script>

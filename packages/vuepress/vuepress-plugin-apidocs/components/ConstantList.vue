<template>
  <div class="member-list" v-if="constants.length">
    <h2 id="constants">
      <a href="#constants" class="header-anchor">#</a> Constants
    </h2>

    <div v-for="(constant, index) in constants" :key="constant.name">
      <div class="member-header" :id="`${constant.name.toLowerCase()}`">
        <h4 :id="`constants_${constant.name.toLowerCase()}`">
          <a :href="`#${constant.name.toLowerCase()}`" class="header-anchor">#</a> {{constant.name}} <Badge v-if="constant.deprecated" text="DEPRECATED" type="warn"/>
        </h4>
        <AvailabilityInfo :platforms="constant.platforms"/>
      </div>
      <PropertySignature :name="constant.name" :type="constant.type"/>
      <DeprecationAlert :deprecated="constant.deprecated"/>
      <p v-html="constant.summary"></p>
      <p v-html="constant.description"></p>
      <hr v-if="index < constants.length - 1">
    </div>
  </div>
</template>

<script>
import AvailabilityInfo from './AvailabilityInfo'
import DeprecationAlert from './DeprecationAlert'
import PropertySignature from './PropertySignature'

export default {
  components: {
    AvailabilityInfo,
    DeprecationAlert,
    PropertySignature
  },
  props: {
    constants: {
      type: Array,
      default: () => []
    }
  }
}
</script>

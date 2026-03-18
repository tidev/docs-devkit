<template>
  <div class="member-list property-list" v-if="properties.length">
    <h2 id="properties">
      <a href="#properties" class="header-anchor">#</a> Properties
    </h2>

    <div v-for="(property, index) in properties" :key="property.name">
      <div class="member-header" :id="`${property.name.toLowerCase()}`">
        <h3 :id="`properties_${property.name.toLowerCase()}`">
          <a :href="`#${property.name.toLowerCase()}`" class="header-anchor">#</a> {{property.name}} <Badge v-if="property.permission === 'read-only'" text="READONLY" type="light"/><Badge v-if="property.availability === 'creation'" text="CREATION ONLY" type="info"/><Badge v-if="property.deprecated" text="DEPRECATED" type="warn"/>
        </h3>
        <AvailabilityInfo :platforms="property.platforms"/>
      </div>
      <PropertySignature v-bind="property"/>
      <DeprecationAlert :deprecated="property.deprecated"/>
      <div class="member-summary" v-html="property.summary"></div>
      <div class="member-description" v-html="property.description"></div>
      <valid-constants v-if="property.constants" :constants="property.constants"/>
      <p v-if="property.default !== undefined">
        <strong>Default:</strong> <code><type-link :type="normalizeType(property.default)"/></code>
      </p>
      <hr v-if="index < properties.length - 1">
    </div>
  </div>
</template>

<script>
import AvailabilityInfo from './AvailabilityInfo'
import DeprecationAlert from './DeprecationAlert'
import PropertySignature from './PropertySignature'
import ValidConstants from './ValidConstants'

export default {
  components: {
    AvailabilityInfo,
    DeprecationAlert,
    PropertySignature,
    ValidConstants
  },
  props: {
    properties: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    normalizeType (type) {
      const typeName = typeof type
      switch (typeName) {
        case 'boolean':
        case 'number':
          return type.toString()
        case 'string': {
          const cleanTypeName = type.replace(/^<|>$/g, '')
          if (cleanTypeName === 'Undefined') {
            return 'undefined'
          } else {
            return cleanTypeName
          }
        }
        case 'object': {
          if (type === null) {
            return 'null'
          } else {
            return typeName
          }
        }
        default:
          return typeName
      }
    }
  }
}
</script>

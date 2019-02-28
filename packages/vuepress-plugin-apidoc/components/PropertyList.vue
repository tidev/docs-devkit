<template>
  <div class="member-list property-list" v-if="properties.length">
    <h2 id="properties">
      <a href="#properties" class="header-anchor">#</a> Properties
    </h2>

    <template v-for="(property, index) in properties">
      <div class="member-header">
        <h3 :id="property.name.toLowerCase()">
          <a :href="`#${property.name.toLowerCase()}`" class="header-anchor">#</a> {{property.name}} <Badge v-if="property.permission === 'read-only'" text="READONLY" type="light"/><Badge v-if="property.availability === 'creation'" text="CREATION ONLY" type="info"/><Badge v-if="property.deprecated" text="DEPRECATED" type="warn"/>
        </h3>
        <AvailabilityInfo :platforms="property.platforms"/>
      </div>
      <PropertySignature v-bind="property"/>
      <DeprecationAlert :deprecated="property.deprecated"/>
      <div class="member-summary" v-html="property.summary"></div>
      <div class="member-description" v-html="property.description"></div>
      <p v-if="property.defaultValue"><strong>Default:</strong> <code>{{property.defaultValue}}</code></p>
      <hr v-if="index < properties.length - 1">
    </template>
  </div>
</template>

<script>
import AvailabilityInfo from './AvailabilityInfo';
import DeprecationAlert from './DeprecationAlert';
import PropertySignature from './PropertySignature';

export default {
  components: {
    AvailabilityInfo,
    DeprecationAlert,
    PropertySignature
  },
  props: {
    properties: {
      type: Array,
      default: () => []
    }
  }
}
</script>

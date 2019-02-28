<template>
  <div class="api-docs">
    <PropertyList :properties="metadata.properties"/>
    <MethodList :methods="metadata.methods"/>
    <EventList :events="metadata.events"/>
    <ConstantList :constants="metadata.constants"/>
  </div>
</template>

<script>
import PropertyList from '../components/PropertyList';
import MethodList from '../components/MethodList';
import EventList from '../components/EventList';
import ConstantList from '../components/ConstantList';

export default {
  components: {
    PropertyList,
    MethodList,
    EventList,
    ConstantList
  },
  computed: {
    metadata() {
      const key = `${this.$page.version || 'next'}/${this.$page.metadataKey}`;
      return this.$store.state.metadata[key] || {};
    }
  }
}
</script>

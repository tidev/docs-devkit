<template>
  <div class="member-list" v-if="events.length">
    <h2 id="events">
      <a href="#events" class="header-anchor">#</a> Events
    </h2>

    <div v-for="(event, index) in events" :key="event.name">
      <div class="member-header">
        <h3 :id="event.name.toLowerCase()">
          <a :href="`#${event.name.toLowerCase()}`" class="header-anchor">#</a> {{event.name}} <Badge v-if="event.deprecated" text="DEPRECATED" type="warn"/>
        </h3>
        <AvailabilityInfo :platforms="event.platforms"/>
      </div>
      <!--<EventSignature v-bind="property"/>-->
      <DeprecationAlert :deprecated="event.deprecated"/>
      <p v-html="event.summary"></p>
      <p v-html="event.description"></p>
      <h4 v-if="event.properties && event.properties.length">Properties</h4>
      <table v-if="event.properties && event.properties.length" class="parameter-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="property in event.properties" :key="property.name">
            <td>{{property.name}}</td>
            <td><code>{{property.type | formatTypes}}</code></td>
            <td>{{property.summary}}</td>
          </tr>
        </tbody>
      </table>
      <hr v-if="index < events.length - 1">
    </div>
  </div>
</template>

<script>
import AvailabilityInfo from './AvailabilityInfo'
import DeprecationAlert from './DeprecationAlert'

export default {
  components: {
    AvailabilityInfo,
    DeprecationAlert
  },
  props: {
    events: {
      type: Array,
      default: () => []
    }
  }
}
</script>

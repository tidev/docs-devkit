<template>
  <div class="member-list method-list" v-if="methods.length">
    <h2 id="methods">
      <a href="#methods" class="header-anchor">#</a> Methods
    </h2>

    <div v-for="(method, index) in methods" :key="method.name">
      <div class="member-header" :id="`${method.name.toLowerCase()}`">
        <h3 :id="`methods_${method.name.toLowerCase()}`">
          <a :href="`#${method.name.toLowerCase()}`" class="header-anchor">#</a> {{method.name}} <Badge v-if="method.deprecated" text="DEPRECATED" type="warn"/>
        </h3>
        <AvailabilityInfo :platforms="method.platforms"/>
      </div>
      <FunctionSignature v-bind="method"/>
      <DeprecationAlert :deprecated="method.deprecated"/>
      <div class="member-summary" v-html="method.summary"></div>
      <div class="member-description" v-html="method.description"></div>
      <h4 v-if="method.parameters && method.parameters.length">Parameters</h4>
      <table v-if="method.parameters && method.parameters.length" class="table parameter-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="parameter in method.parameters" :key="parameter.name">
            <td><code>{{parameter.name}}</code></td>
            <td><TypeLinks :types="parameter.type"/></td>
            <td class="parameter-description">
              <div v-html="parameter.summary"></div>
              <div v-if="parameter.description" v-html="parameter.description"></div>
            </td>
          </tr>
        </tbody>
      </table>
      <h4>Returns</h4>
      <p v-if="method.returns && method.returns.summary" v-html="method.returns.summary"></p>
      <div class="type-info">
        <dl>
          <dt>Type</dt>
          <dd><TypeLinks :types="method.returns"/></dd>
        </dl>
      </div>
      <hr v-if="index < methods.length - 1">
    </div>
  </div>
</template>

<script>
import AvailabilityInfo from './AvailabilityInfo'
import DeprecationAlert from './DeprecationAlert'
import FunctionSignature from './FunctionSignature'

export default {
  components: {
    AvailabilityInfo,
    DeprecationAlert,
    FunctionSignature
  },
  props: {
    methods: {
      type: Array,
      default: () => []
    }
  }
}
</script>

<style lang="stylus">
.type-info
  dt
    display inline-block
  dd
    display inline-block
</style>

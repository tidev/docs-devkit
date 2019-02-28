<template>
  <span v-if="isGeneric(type)" class="generic-type">{{genericTypeName}}&lt;<router-link v-if="typeLink" :to="typeLink">{{genericParameterName}}</router-link><span v-else class="unknown-type">{{genericParameterName}}</span>&gt;</span>
  <router-link v-else-if="typeLink" :to="typeLink">{{type}}</router-link>
  <span v-else class="unknown-type">{{type}}</span>
</template>

<script>
import typeLinks from '@dynamic/type-links';

export default {
  props: {
    type: {
      type: String,
      required: true
    }
  },
  computed: {
    typeLink() {
      let link;

      if (this.isGeneric(this.type)) {
        link = this.findTypeLink(this.genericParameterName);
      } else {
        link = this.findTypeLink(this.type);
      }

      if (link === null) {
        // @todo link to MDN for known JS types?
        return link;
      }

      if (this.$versions && this.$page.version !== this.$versions[0]) {
        link = `${this.$page.version}/${link}`;
      }

      return link;
    },
    genericTypeName() {
      return this.type.substring(0, this.type.indexOf('<'));
    },
    genericParameterName() {
      return this.type.substring(this.type.indexOf('<') + 1, this.type.length - 1);
    }
  },
  methods: {
    isGeneric(type) {
      return /^(Array|Callback|Dictionary)</.test(type);
    },
    findTypeLink(typeName) {
      let link = typeLinks[typeName];
      if (!link) {
        const lastDotIndex = typeName.lastIndexOf('.');
        const parentTypeName = typeName.substring(0, lastDotIndex);
        if (!typeLinks[parentTypeName]) {
          return null;
        }
        link = `${typeLinks[parentTypeName]}#${typeName.substring(lastDotIndex + 1).toLowerCase()}`;
      }
      return link;
    }
  }
}
</script>

<style lang="stylus">
.unknown-type, .generic-type
  font-weight 500
</style>

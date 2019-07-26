export default {
  data: () => ({
    error: null,
    defaultVersion: 'next'
  }),
  props: {
    type: String,
    version: String
  },
  computed: {
    isKnownType () {
      return this.typeName !== undefined
    },
    typeName () {
      return this.type || this.$page.metadataKey
    },
    currentVersion () {
      return this.version || this.$page.version || this.defaultVersion
    },
    metadataKey () {
      return `${this.currentVersion}/${this.type || this.$page.metadataKey}`
    },
    metadata () {
      return this.$store.getters['metadata/getMetadata'](this.metadataKey)
    }
  },
  async mounted () {
    if (!this.metadata) {
      try {
        await this.$store.dispatch('metadata/fetchMetadata', this.metadataKey)
      } catch (e) {
        this.error = e
      };
    }
  }
}

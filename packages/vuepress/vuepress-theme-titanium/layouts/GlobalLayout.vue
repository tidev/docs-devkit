<template>
  <div class="main-docs-wrapper">
    <div class="main-content-wrapper">
      <component :is="layout"/>
    </div>
    <Footer/>
  </div>
</template>

<script>
import Footer from '../components/Footer.vue'

export default {
  components: {
    Footer
  },
  computed: {
    layout () {
      if (this.$page.path) {
        const layout = this.$page.frontmatter.layout
        if (layout && (this.$vuepress.getLayoutAsyncComponent(layout) ||
          this.$vuepress.getVueComponent(layout))) {
          return layout
        }
        return 'Layout'
      }
      return 'NotFound'
    }
  }
}
</script>

<style lang="stylus">
.main-content-wrapper
  min-height 100vh
</style>

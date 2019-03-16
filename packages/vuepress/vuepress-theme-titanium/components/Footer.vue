<template>
  <footer class="footer">
    <section class="sitemap">
      <section v-for="sitemapConfig in sitemap" class="sitemap-section" :key="sitemapConfig.title">
        <h5>{{ sitemapConfig.title }}</h5>
        <ul>
          <li v-for="link in sitemapConfig.links" :key="link.text"><a :href="link.link" :target="/^https?:\/\//.test(link.link) ? '_blank' : '_self'">{{ link.text }}</a></li>
        </ul>
      </section>
    </section>
    <a v-if="logo" :href="logoLink" target="_blank">
      <img :src="$withBase(logo)"/>
    </a>
    <section class="copyright">
      {{ copyright }}
    </section>
  </footer>
</template>

<script>
export default {
  computed: {
    copyright () {
      const { themeConfig } = this.$site
      return themeConfig && themeConfig.footerCopyright
    },
    logo () {
      const { themeConfig } = this.$site
      return themeConfig && themeConfig.footerLogo
    },
    logoLink () {
      const { themeConfig } = this.$site
      return themeConfig && themeConfig.footerLogoLink || '/'
    },
    sitemap () {
      const { themeConfig } = this.$site
      const sitemap = themeConfig.footerSitemap || []
      return Object.keys(sitemap).map(sitemapColumnTitle => {
        const sitemapColumnConfig = sitemap[sitemapColumnTitle]
        return {
          title: sitemapColumnTitle,
          links: sitemapColumnConfig
        }
      })
    }
  }
}
</script>

<style lang="stylus">
.footer
  background #231f20
  padding-bottom 2rem
  padding-top 2rem
  >.sitemap
    display flex
    justify-content space-between
    margin 0 auto 3rem
    max-width $contentWidth
    >.sitemap-section
      >h5
        color #ca2127
      >ul
        list-style none
        padding-left 0
        >li
         >a
          color #999
          &:hover
            color #fff

  >a
    display block
    text-align center
    margin 1.5rem auto
    width 150px
    opacity 0.4
    transition opacity .15s ease-in-out
    &:hover
      opacity 1
    >img
      max-width 100%
  >.copyright
    text-align center
    color #999

@media (max-width: $MQMobile)
  .footer
    >.sitemap
     display block
     margin 0 2rem
</style>

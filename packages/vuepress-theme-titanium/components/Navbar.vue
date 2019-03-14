<template>
  <header class="navbar">
    <SidebarButton @toggle-sidebar="$emit('toggle-sidebar')"/>

    <router-link
      :to="$localePath"
      class="home-link"
    >
      <img
        class="logo"
        v-if="$site.themeConfig.logo"
        :src="$withBase($site.themeConfig.logo)"
        :alt="$siteTitle"
      >
      <span
        ref="siteName"
        class="site-name"
        v-if="$siteTitle"
        :class="{ 'can-hide': $site.themeConfig.logo }"
      >{{ $siteTitle }}</span>
    </router-link>

    <div v-if="hasVersions" class="versions-dropdown">
      <DropdownLink :item="versionsDropdown"/>
    </div>

    <div
      class="links"
      :style="linksWrapMaxWidth ? {
        'max-width': linksWrapMaxWidth + 'px'
      } : {}"
    >
      <AlgoliaSearchBox
        v-if="isAlgoliaSearch"
        :options="algolia"
      />
      <SearchBox v-else-if="$site.themeConfig.search !== false"/>
      <NavLinks class="can-hide"/>
    </div>

    <ApiSidebarButton @toggle-api-sidebar="$emit('toggle-api-sidebar')"/>
  </header>
</template>

<script>
import AlgoliaSearchBox from '@AlgoliaSearchBox'
import SearchBox from '@SearchBox'

import ApiSidebarButton from './ApiSidebarButton'
import DropdownLink from './DropdownLink.vue'
import NavLinks from './NavLinks.vue'
import SidebarButton from './SidebarButton.vue'

export default {
  components: { ApiSidebarButton, DropdownLink, SidebarButton, NavLinks, SearchBox, AlgoliaSearchBox },

  data () {
    return {
      linksWrapMaxWidth: null
    }
  },

  mounted () {
    const MOBILE_DESKTOP_BREAKPOINT = 719 // refer to config.styl
    const NAVBAR_VERTICAL_PADDING = parseInt(css(this.$el, 'paddingLeft')) + parseInt(css(this.$el, 'paddingRight'))
    const handleLinksWrapWidth = () => {
      if (document.documentElement.clientWidth < MOBILE_DESKTOP_BREAKPOINT) {
        this.linksWrapMaxWidth = null
      } else {
        this.linksWrapMaxWidth = this.$el.offsetWidth - NAVBAR_VERTICAL_PADDING -
          (this.$refs.siteName && this.$refs.siteName.offsetWidth || 0)
      }
    }
    handleLinksWrapWidth()
    window.addEventListener('resize', handleLinksWrapWidth, false)
  },

  computed: {
    algolia () {
      return this.$themeLocaleConfig.algolia || this.$site.themeConfig.algolia || {}
    },

    isAlgoliaSearch () {
      return this.algolia && this.algolia.apiKey && this.algolia.indexName
    },

    hasVersions () {
      return this.$versions && this.$versions.length > 0
    },

    versionsDropdown () {
      const currentVersion = this.$versions[0]
      const currentLink = this.$page.path
      const routes = this.$router.options.routes
      return {
        text: this.$page.version,
        items: ['next', ...this.$versions].map(version => {
          const text = version
          let link
          if (version === this.$page.version) {
            link = currentLink
          } else {
            link = currentLink.replace(`/${this.$page.version}`, '')
            if (version !== currentVersion) {
              // try to stay on current page for different version
              link = `/${version}${link}`
            }
            if (!routes.some(route => route.path === link)) {
              // fallback to homepage
              link = version === currentVersion ? '/' : `/${version}/`
            }
          }
          const item = { text, link }
          if (version === currentVersion) {
            item.subText = 'current'
          } else if (version === 'next') {
            item.text = 'master'
            item.subText = 'next'
          }
          return item
        })
      }
    }
  }
}

function css (el, property) {
  // NOTE: Known bug, will return 'auto' if style value is 'auto'
  const win = el.ownerDocument.defaultView
  // null means not to return pseudo styles
  return win.getComputedStyle(el, null)[property]
}
</script>

<style lang="stylus">
$navbar-vertical-padding = 0.7rem
$navbar-horizontal-padding = 1.5rem

.navbar
  padding $navbar-vertical-padding $navbar-horizontal-padding
  line-height $navbarHeight - 1.4rem
  a, span, img
    display inline-block
  .logo
    height $navbarHeight - 1.4rem
    min-width $navbarHeight - 1.4rem
    margin-right 0.8rem
    vertical-align top
  .site-name
    font-size 1.3rem
    font-weight 600
    color $textColor
    position relative
  .links
    padding-left 1.5rem
    box-sizing border-box
    background-color white
    white-space nowrap
    font-size 0.9rem
    position absolute
    right $navbar-horizontal-padding
    top $navbar-vertical-padding
    display flex
    .search-box
      flex: 0 0 auto
      vertical-align top

  .versions-dropdown
    display inline-block
    position relative
    margin-left 1.5rem
    .dropdown-wrapper
      .nav-dropdown
        left -1.25rem
        right inherit
        .dropdown-item
          a
            color $textColor
            &:hover
              color $accentColor
            &.router-link-active
              color $accentColor
              &:hover
                color $accentColor

@media (max-width: $MQMobile)
  .navbar
    padding-left 4rem
    .can-hide
      display none
    .links
      padding-left 1.5rem
      right 4rem
</style>

<template>
  <div class="main-docs-wrapper">
    <div
      class="theme-container"
      :class="pageClasses"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <Navbar @toggle-sidebar="toggleSidebar" @toggle-api-sidebar="toggleApiSidebar"/>
      <div class="sidebar-mask" @click="toggleSidebar(false); toggleApiSidebar(false)"></div>

      <Sidebar :items="sidebarItems">
        <slot name="sidebar-top" slot="top"/>
        <slot name="sidebar-bottom" slot="bottom"/>
      </Sidebar>

      <ApiPage :sidebar-items="sidebarItems"/>

      <ApiSidebar :currentAnchor="currentAnchor" v-if="$page.metadataKey"/>
    </div>
    <Footer/>
  </div>
</template>

<script>
import throttle from 'lodash.throttle'
import nprogress from 'nprogress'
import Vue from 'vue'

import ApiPage from '../components/ApiPage.vue'
import ApiSidebar from '../components/ApiSidebar.vue'
import Footer from '../components/Footer.vue'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { resolveSidebarItems } from '../util'

function calculateCurrentAnchor (anchors) {
  const l = anchors.length
  if (anchors[0].top > 0 && anchors[0].top < 10) {
    return anchors[0]
  }

  if (anchors[l - 1].top < 0) {
    return anchors[l - 1]
  }

  for (let i = 0; i < l; i++) {
    const anchor = anchors[i]
    const nextAnchor = anchors[i + 1]
    if (anchor.top < 0 && nextAnchor.top > 0) {
      if (nextAnchor.top < 10) {
        return nextAnchor
      }
      return anchor
    }
  }

  return anchors[0]
}

function getAnchors (sidebarLinks) {
  return [].slice
    .call(document.querySelectorAll('.header-anchor'))
    .filter(anchor => sidebarLinks.some(sidebarLink => sidebarLink.hash === anchor.hash))
    .map(el => {
      return {
        el,
        hash: decodeURIComponent(el.hash),
        top: el.getBoundingClientRect().top - 90
        /* AHL_TOP_OFFSET is to Subtract height of navbar & anchor's padding top */
      }
    })
}

export default {
  components: { ApiPage, ApiSidebar, Footer, Sidebar, Navbar },

  data () {
    return {
      currentAnchor: null,
      isSidebarOpen: false,
      isApiSidebarOpen: false
    }
  },

  computed: {
    sidebarItems () {
      return resolveSidebarItems(
        this.$page,
        this.$page.regularPath,
        this.$site,
        this.$localePath
      )
    },

    pageClasses () {
      const userPageClass = this.$page.frontmatter.pageClass
      return [
        {
          'sidebar-open': this.isSidebarOpen,
          'api-sidebar-open': this.isApiSidebarOpen
        },
        userPageClass
      ]
    }
  },

  watch: {
    '$page': function() {
      this.$sidebarLinks = null;
    }
  },

  mounted () {
    // configure progress bar
    nprogress.configure({ showSpinner: false })

    this.$router.beforeEach((to, from, next) => {
      if (to.path !== from.path && !Vue.component(to.name)) {
        nprogress.start()
      }
      next()
    })

    this.$router.afterEach((to, from) => {
      nprogress.done()
      this.isSidebarOpen = false
      this.isApiSidebarOpen = false
    })


    window.addEventListener('scroll', this.onScroll)

    if (this.$route.hash) {
      const hash = decodeURIComponent(this.$route.hash)
      const anchor = document.getElementById(hash.slice(1))
      if (anchor) {
        const anchorLink = anchor.querySelector('a.header-anchor')
        setTimeout(() => {
          window.scroll({
            top: anchorLink.offsetTop - 70,
            left: 0,
            behavior: 'auto'
          })
        })
      }
    }
  },

  beforeDestroy () {
    window.removeEventListener('scroll', this.onScroll)
  },

  methods: {
    toggleSidebar (to) {
      this.isSidebarOpen = typeof to === 'boolean' ? to : !this.isSidebarOpen
    },

    toggleApiSidebar (to) {
      console.log('toggle')
      this.isApiSidebarOpen = typeof to === 'boolean' ? to : !this.isApiSidebarOpen
    },

    // side swipe
    onTouchStart (e) {
      this.touchStart = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      }
    },

    onTouchEnd (e) {
      const dx = e.changedTouches[0].clientX - this.touchStart.x
      const dy = e.changedTouches[0].clientY - this.touchStart.y
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        if (dx > 0 && this.touchStart.x <= 80) {
          this.toggleSidebar(true)
        } else {
          this.toggleSidebar(false)
        }
      }
    },

    onScroll: throttle(function () {
      if (!this.$sidebarLinks) {
        this.$sidebarLinks = [].slice.call(document.querySelectorAll('.api-sidebar-link'))
      }

      const anchors = getAnchors(this.$sidebarLinks)
      if (anchors.length === 0) {
        return
      }
      this.currentAnchor = calculateCurrentAnchor(anchors)
    }, 300)
  }
}
</script>

<style src="prismjs/themes/prism-tomorrow.css"></style>
<style src="../styles/theme.styl" lang="stylus"></style>


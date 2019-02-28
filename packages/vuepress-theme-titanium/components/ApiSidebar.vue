<template>
  <div class="api-sidebar-wrapper">
    <div class="api-sidebar-content">
      <div ref="sidebar" class="api-sidebar">
        <ul class="api-sidebar-links" v-if="items.length">
          <li v-for="(item, i) in items" :key="i">
            <ApiSidebarLink :item="item"/>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { groupHeaders } from '../util';

import ApiSidebarLink from './ApiSidebarLink.vue'

export default {
  components: { ApiSidebarLink },

  props: {
    currentAnchor: Object
  },

  computed: {
    items() {
      const headers = groupHeaders(this.$page.headers || []);
      return headers.map(header => {
        const currentAnchor = this.currentAnchor || { hash: this.$route.hash, path: this.$route.path };
        const selfActive = currentAnchor.hash === '#' + header.slug;
        const active = selfActive || (header.children && header.children.some(c => currentAnchor.hash === '#' + c.slug));
        return {
          type: 'auto',
          title: header.title,
          basePath: this.$page.path,
          path: this.$page.path + '#' + header.slug,
          active: active,
          children: (header.children || []).map(child => {
            child.active = currentAnchor.hash === '#' + child.slug;
            return child;
          })
        }
      });
    }
  }
}
</script>

<style lang="stylus">
.api-sidebar-content
  margin 2rem 1rem 2rem 0

  .api-sidebar
    font-size 0.82rem
    box-sizing border-box
    height "calc(100vh - %s)" % ($navbarHeight + 4rem)
    overflow-y auto

    ul
      padding 0
      margin 0
      list-style-type none
    >ul
      border-left 1px solid $borderColor

    .api-sidebar-links
      padding 1rem 0

@media (max-width: $MQMobile)
  .api-sidebar-content
    margin 0
    .api-sidebar
      font-size 1rem
      height "calc(100vh - %s)" % $navbarHeight
</style>

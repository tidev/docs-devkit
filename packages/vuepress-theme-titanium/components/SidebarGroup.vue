<template>
  <div
    class="sidebar-group"
    :class="{ first, collapsable }"
  >
    <p
      class="sidebar-heading"
      :class="{ open }"
      @click="$emit('toggle')"
    >
      <span>{{ item.title }}</span>

      <svg
        v-if="collapsable"
        class="sidebar-arrow"
        :class="open ? 'down' : 'right'"
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 49.484 28.284"
      >
        <g transform="translate(-229 -126.358)">
          <rect fill="currentColor" width="35" height="5" rx="2" transform="translate(229 151.107) rotate(-45)"/>
          <rect fill="currentColor" width="35" height="5" rx="2" transform="translate(274.949 154.642) rotate(-135)"/>
        </g>
      </svg>
    </p>

    <DropdownTransition>
      <ul
        ref="items"
        class="sidebar-group-items"
        v-if="open || !collapsable"
      >
        <li v-for="(child, index) in item.children" :key="index">
          <SidebarLink :item="child"/>
        </li>
      </ul>
    </DropdownTransition>
  </div>
</template>

<script>
import DropdownTransition from './DropdownTransition.vue'
import SidebarLink from './SidebarLink.vue'

export default {
  name: 'SidebarGroup',
  props: ['item', 'first', 'open', 'collapsable'],
  components: { SidebarLink, DropdownTransition }
}
</script>

<style lang="stylus">
.sidebar-group
  &:not(.first)
    margin-top 1em
  .sidebar-group
    padding-left 0.5em
  &:not(.collapsable)
    .sidebar-heading
      cursor auto
      color inherit

.sidebar-heading
  color #999
  transition color .15s ease
  cursor pointer
  font-size 1.1em
  font-weight bold
  // text-transform uppercase
  padding 0 1.5rem
  margin-top 0
  margin-bottom 0.5rem
  position relative
  &.open, &:hover
    color inherit
  .sidebar-arrow
    position absolute
    top 0.4em
    right 0.5rem
    width: 1rem
    height: 1rem
    transition transform .15s ease
    &.right
      transform: rotate(90deg)
    &.down
      transform: rotate(180deg)
  &:.open .sidebar-arrow
    top -0.18em

.sidebar-group-items
  transition height .1s ease-out
  overflow hidden
</style>

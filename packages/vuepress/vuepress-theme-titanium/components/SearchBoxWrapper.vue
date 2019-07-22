<template>
  <SearchBox v-if="!$versions"/>
  <VersionedSearchBox v-else/>
</template>

<script>
import SearchBox from '@SearchBox'

export default {
  components: {
    SearchBox,
    VersionedSearchBox: () => import('vuepress-plugin-versioning/components/SearchBox')
  }
}
</script>

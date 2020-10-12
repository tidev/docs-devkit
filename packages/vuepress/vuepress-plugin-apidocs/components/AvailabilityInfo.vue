<template>
  <div class="type-meta availability">
    <div class="type-meta-name">Availability</div>
    <div class="type-meta-value available-platforms">
      <div class="platform-item" v-for="platform in normalizedPlaforms" :key="platform.name">
        <img :src="imageForPlatform(platform.name)" class="platform-logo"/> <span>{{platform.since}}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    platforms: Array
  },
  computed: {
    normalizedPlaforms: function () {
      if (!this.platforms) {
        return []
      }

      const normalizedPlaforms = Array.from(this.platforms)

      // Find the index of both platforms
      const iphoneIndex = this.platforms.findIndex(platform => platform.name === 'iphone')
      const ipadIndex = this.platforms.findIndex(platform => platform.name === 'ipad')

      // If iPhone or iPad platform is not supported anyway, return early
      if (iphoneIndex === -1 || ipadIndex === -1) {
        return this.platforms
      }

      // If both platforms exist and their versions match, update iPhone to iOS and remove iPad
      if (this.platforms[iphoneIndex].version === this.platforms[ipadIndex].version) {
        const version = this.platforms[iphoneIndex].since
        normalizedPlaforms[iphoneIndex] = { name: 'ios', pretty_name: 'iOS', since: version }
        normalizedPlaforms.splice(ipadIndex, 1)
      }

      return normalizedPlaforms
    }
  },
  methods: {
    imageForPlatform (platformName) {
      switch (platformName) {
        case 'android': return require('@apidocs/assets/android-logo.png')
        case 'ios': return require('@apidocs/assets/apple-logo.png')
        case 'iphone': return require('@apidocs/assets/iphone-logo.png')
        case 'ipad': return require('@apidocs/assets/ipad-logo.png')
        case 'macos': return require('@apidocs/assets/macos-logo.png')
        case 'windowsphone': return require('@apidocs/assets/windows-logo.png')
      }
    }
  }
}
</script>

<style lang="stylus">
@require '../styles/main'

.availability
  &>.available-platforms
    display flex
    flex-shrink 0
    justify-content flex-end

    &>.platform-item
      color $lightTextColor
      margin-left: 0.8rem
      display flex
      flex-shrink 0
      align-items center

      &>.platform-logo
        height 1rem
        width 1rem

      &>span
        margin-left: 0.25rem

@media (max-width: $MQMobile)
  .availability
    &>ul
      flex-direction column
      align-items flex-end
      &>li
        margin 0
</style>

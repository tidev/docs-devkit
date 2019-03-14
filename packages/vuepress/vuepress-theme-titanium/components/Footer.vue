<template>
  <footer class="footer">
    <section class="sitemap">
      <section class="sitemap-section">
        <h5>Docs</h5>
        <ul>
          <li><a href="https://docs.appcelerator.com/" target="_blank">Alloy</a></li>
          <li><a href="https://docs.appcelerator.com/" target="_blank">Hyperloop</a></li>
        </ul>
      </section>
      <section class="sitemap-section">
        <h5>Community</h5>
        <ul>
          <li><a href="">Slack</a></li>
        </ul>
      </section>
      <section class="sitemap-section">
        <h5>Social</h5>
        <ul>
          <li><a href="https://github.com/appcelerator" target="_blank">Github</a></li>
          <li><a href="https://twitter.com/appcelerator" target="_blank">Twitter</a></li>
          <li><a href="http://www.linkedin.com/company/200115" target="_blank">LinkedIn</a></li>
        </ul>
      </section>
    </section>
    <a href="https://appcelerator.com" target="_blank">
      <img :src="$withBase('/images/axway-appcelerator-logo.png')"/>
    </a>
    <section class="copyright">
      Copyright © 2018-present Axway Appcelerator
    </section>
  </footer>
</template>

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

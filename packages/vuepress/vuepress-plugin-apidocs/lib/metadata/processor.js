const { getLinkForKeyPath } = require('./service')

/**
 * Processor for metadata that powers API reference pages.
 *
 * Applies transforms to the Metadata so we can properly use it in our VuePress environment.
 * Also collects additionals headers required for the sidebar navigation on API pages.
 *
 * Each instance of this processor can only be used to transform one single type.
 */
class MetadataProcessor {
  constructor (options) {
    this.markdown = options.md
    this.base = options.context.base
    this.version = options.version
    this.versions = options.versions
    this.additionalHeaders = []
    this.constantNamingPattern = /^[A-Z0-9_]+$/
    this.hasConstants = false
  }

  /**
   * Prepares metadata for usage in VuePress and collects additional headers
   * which will be inserted manually into the page. Changes to the metadata
   * will be written back into the given object.
   */
  transoformMetadataAndCollectHeaders (metadata) {
    delete metadata.description
    delete metadata.examples

    this.filterInheritedMembers(metadata)

    this.sortByName(metadata.properties)
    this.sortByName(metadata.methods)

    // We need to temporarily disbale the vue router link rule since the rendered markdown
    // will be directly inserted via v-html so Vue components won't work
    const vueRouterLinkRule = this.markdown.renderer.rules.link_open
    this.markdown.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options)
    }
    metadata.summary = this.renderMarkdown(metadata.summary)
    this.transformMembersAndCollectHeaders('properties', metadata)
    this.transformMembersAndCollectHeaders('methods', metadata)
    this.transformMembersAndCollectHeaders('events', metadata)
    this.markdown.renderer.rules.link_open = vueRouterLinkRule

    this.splitPropertiesAndConstants(metadata)
  }

  appendAdditionalHeaders (page) {
    page.headers = (page.headers || []).concat(this.additionalHeaders)
    if (this.hasConstants) {
      page.headers.push({
        level: 2,
        title: 'Constants',
        slug: 'constants'
      })
    }
  }

  filterInheritedMembers (metadata) {
    const filterInherited = member => {
      if (member.inherits && member.inherits !== metadata.name) {
        return false
      }

      return true
    }
    metadata.properties = metadata.properties.filter(filterInherited)
    metadata.methods = metadata.methods.filter(filterInherited)
    metadata.events = metadata.events.filter(filterInherited)
  }

  transformMembersAndCollectHeaders (memberType, metadata) {
    const membersMetadata = metadata[memberType]
    if (!membersMetadata || membersMetadata.length === 0) {
      return
    }

    const headers = []
    membersMetadata.forEach((memberMetadata, index) => {
      if (memberMetadata.summary) {
        membersMetadata[index].summary = this.renderMarkdown(memberMetadata.summary)
      }
      if (memberMetadata.description) {
        membersMetadata[index].description = this.renderMarkdown(memberMetadata.description)
      }
      if (memberMetadata.examples && memberMetadata.examples.length) {
        let combinedExamplesMarkdown = '#### Examples\n\n'
        memberMetadata.examples.forEach(example => {
          combinedExamplesMarkdown += `##### ${example.description}\n${example.code}`
        })
        memberMetadata.examples = this.renderMarkdown(combinedExamplesMarkdown)
      }
      if (memberMetadata.deprecated && memberMetadata.deprecated.notes) {
        memberMetadata.deprecated.notes = this.renderMarkdown(memberMetadata.deprecated.notes)
      }
      if (memberMetadata.returns && memberMetadata.returns.summary) {
        memberMetadata.returns.summary = this.renderMarkdown(memberMetadata.returns.summary)
      }

      if (memberType === 'properties' && this.constantNamingPattern.test(memberMetadata.name)) {
        this.hasConstants = true
        return
      }

      headers.push({
        level: 3,
        title: memberMetadata.name,
        slug: memberMetadata.name.toLowerCase()
      })
    })
    if (headers.length) {
      this.additionalHeaders.push({
        level: 2,
        title: memberType.charAt(0).toUpperCase() + memberType.slice(1),
        slug: memberType
      })
      this.additionalHeaders = this.additionalHeaders.concat(headers)
    }
  }

  renderMarkdown (markdownString) {
    markdownString = this.rewriteTypeLinks(markdownString)
    // @todo validate data.typeLinks
    const { html } = this.markdown.render(markdownString)
    return html
  }

  rewriteTypeLinks (markdownString) {
    const customLinkPattern = /<([^>\/]+)>/g
    const mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
    const version = (this.versions.length === 0 || this.version === this.versions[0]) ? null : this.version

    markdownString = markdownString.replace(customLinkPattern, (match, linkValue) => {
      const link = getLinkForKeyPath(linkValue, this.base, version)
      if (link) {
        return `[${link.name}](${link.path})`
      }
      return match
    })

    markdownString = markdownString.replace(mdLinkPattern, (match, linkText, linkValue) => {
      const link = getLinkForKeyPath(linkValue, this.base, version)
      if (link) {
        return `[${link.name}](${link.path})`
      }
      return match
    })

    return markdownString
  }

  sortByName (unsortedArray) {
    if (!unsortedArray) {
      return
    }
    unsortedArray.sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
  }

  splitPropertiesAndConstants (metadata) {
    const properties = []
    const constants = []
    metadata.properties.forEach(property => {
      if (this.constantNamingPattern.test(property.name)) {
        constants.push(property)
      } else {
        properties.push(property)
      }
    })
    metadata.properties = properties
    metadata.constants = constants
  }
}

module.exports = MetadataProcessor

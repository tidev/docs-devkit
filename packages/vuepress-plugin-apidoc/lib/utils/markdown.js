const { isValidType } = require('./metadata')

const typeLinkPattern = /^<([a-zA-Z][a-zA-Z0-9._]+)>/

/**
 * Renderer rule for link tokens to create <type-link> tags which will render
 * the matching router-link for the type.
 *
 * @param {Object} md markdown-it instance
 */
function linkConverterPlugin (md) {
  const renderLinkOpen = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }
  const renderLinkClose = md.renderer.rules.link_close || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }
  let hasOpenTypeLink

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx]
    const hrefIndex = token.attrIndex('href')
    if (hrefIndex === -1) {
      return renderLinkOpen(tokens, idx, options, env, self)
    }

    const link = token.attrs[hrefIndex]
    const href = link[1]
    if (isValidType(href)) {
      hasOpenTypeLink = true
      tokens[idx] = toTypeLink(token, link)
      return self.renderToken(tokens, idx, options)
    }

    return renderLinkOpen(tokens, idx, options, env, self)
  }

  md.renderer.rules.link_close = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    if (hasOpenTypeLink) {
      token.tag = 'type-link'
      hasOpenTypeLink = false
      return self.renderToken(tokens, idx, options)
    }

    return renderLinkClose(tokens, idx, options, env, self)
  }

  function toTypeLink (token, link) {
    link[0] = 'type'
    const type = link[1]

    // markdown-it encodes the uri
    link[1] = decodeURI(type)

    // export the router links for testing
    const typeLinks = md.$data.typeLinks || (md.$data.typeLinks = [])
    typeLinks.push(type)

    return Object.assign({}, token, {
      tag: 'type-link'
    })
  }
}

/**
 * Adds a new rule to the inline parser to automatically create link tokens
 * for types, e.g. `<Titanium.UI.View>`.
 *
 * This rule needs to be added before the html_inline rule to catch pseudo
 * types like `<ItemTemplate>` or they would be intepreted as HTML tags.
 *
 * @param {Object} md markdown-it instance
 */
function typeAutolink (md) {
  md.inline.ruler.after('autolink', 'type-autolink', (state, silent) => {
    const pos = state.pos
    if (state.src.charCodeAt(pos) !== 0x3C/* < */) {
      return false
    }

    const tail = state.src.slice(pos)
    if (tail.indexOf('>') === -1) {
      return false
    }

    if (typeLinkPattern.test(tail)) {
      const linkMatch = tail.match(typeLinkPattern)
      const url = linkMatch[0].slice(1, -1)
      if (!isValidType(url)) {
        return false
      }
      if (!silent) {
        let token
        token = state.push('link_open', 'a', 1)
        token.attrs = [['href', url]]
        token.markup = 'autolink'
        token.info = 'auto'

        token = state.push('text', '', 0)
        token.content = url

        token = state.push('link_close', 'a', -1)
        token.markup = 'autolink'
        token.info = 'auto'
      }
      state.pos += linkMatch[0].length
      return true
    }

    return false
  })
}

/**
 * Wraps the Vue html_block rule and tests for our type links first so they
 * won't be falsely turned into html_block tokens.
 *
 * @param {Object} md
 */
function vueComponentPatch (md) {
  const htmlBlockRuleIndex = md.block.ruler.__find__('html_block')
  const vueHtmlBlockRule = md.block.ruler.__rules__[htmlBlockRuleIndex].fn
  md.block.ruler.at('html_block', (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const lineText = state.src.slice(pos, max)
    if (typeLinkPattern.test(lineText)) {
      const match = lineText.match(typeLinkPattern)
      if (isValidType(match[1])) {
        return false
      }
    }

    return vueHtmlBlockRule(state, startLine, endLine, silent)
  })
}

module.exports = {
  linkConverterPlugin,
  typeAutolink,
  vueComponentPatch
}

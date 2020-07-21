/**
 * MarkdownIt FontAwesome icons plugin, based on the emoji plugin
 *
 * @see https://github.com/markdown-it/markdown-it-emoji
 */

const iconPattern = /\:(fa\w)-([\w\-]+)\:/
const replacePattern = new RegExp(iconPattern.source, 'g')

module.exports = md => {
  md.renderer.rules.fontawesome = fontAwesomeRenderer
  md.core.ruler.push('fontawesome', createFontAwesomeRule(md))
}

function fontAwesomeRenderer (tokens, idx) {
  return tokens[idx].content
}

function createFontAwesomeRule (md) {
  const arrayReplaceAt = md.utils.arrayReplaceAt

  function splitTextToken (text, level, Token) {
    let token
    let lastPosition = 0
    const nodes = []

    text.replace(replacePattern, function (match, prefix, icon, offset) {
      // Add new tokens to pending list
      if (offset > lastPosition) {
        token = new Token('text', '', 0)
        token.content = text.slice(lastPosition, offset)
        nodes.push(token)
      }

      token = new Token('fontawesome', '', 0)
      token.markup = icon
      token.content = `<font-awesome-icon :icon="['${prefix}', '${icon}']" />`
      nodes.push(token)

      lastPosition = offset + match.length
    })

    if (lastPosition < text.length) {
      token = new Token('text', '', 0)
      token.content = text.slice(lastPosition)
      nodes.push(token)
    }

    return nodes
  }

  return function iconReplace (state) {
    const blockTokens = state.tokens
    let autolinkLevel = 0

    for (let j = 0, l = blockTokens.length; j < l; j++) {
      if (blockTokens[j].type !== 'inline') {
        continue
      }

      let tokens = blockTokens[j].children
      // We scan from the end, to keep position when new tags added.
      // Use reversed logic in links start/end match
      for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i]

        if (token.type === 'link_open' || token.type === 'link_close') {
          if (token.info === 'auto') {
            autolinkLevel -= token.nesting
          }
        }

        if (token.type === 'text' && autolinkLevel === 0 && iconPattern.test(token.content)) {
          // replace current node
          blockTokens[j].children = tokens = arrayReplaceAt(
            tokens, i, splitTextToken(token.content, token.level, state.Token)
          )
        }
      }
    }
  }
}

'use strict'

/**
 * Module dependencies.
 */

const { EventEmitter } = require('events')
const { getOptions } = require('loader-utils')
const { fs, path, hash, parseFrontmatter, inferTitle, extractHeaders } = require('@vuepress/shared-utils')
const LRU = require('lru-cache')
const md = require('@vuepress/markdown')

const cache = new LRU({ max: 1000 })
const devCache = new LRU({ max: 1000 })

/**
 * Expose markdown loader.
 */

module.exports = function (src) {
  const isProd = process.env.NODE_ENV === 'production'
  const isServer = this.target === 'node'
  const options = getOptions(this)
  const loader = Object.create(this)
  const { sourceDir, extractHeaders: extractHeadersPattern = ['h2', 'h3'] } = options
  let { markdown } = options
  if (!markdown) {
    markdown = md()
  }

  // we implement a manual cache here because this loader is chained before
  // vue-loader, and will be applied on the same file multiple times when
  // selecting the individual blocks.
  const file = this.resourcePath
  const key = hash(file + src)
  const cached = cache.get(key)
  if (cached && (isProd || /\?vue/.test(this.resourceQuery))) {
    return cached
  }

  const frontmatter = parseFrontmatter(src)
  const content = frontmatter.content

  if (!isProd && !isServer) {
    const inferredTitle = inferTitle(frontmatter.data, frontmatter.content)
    const headers = extractHeaders(content, extractHeadersPattern, markdown)
    delete frontmatter.content

    // diff frontmatter and title, since they are not going to be part of the
    // returned component, changes in frontmatter do not trigger proper updates
    const cachedData = devCache.get(file)
    if (cachedData && (
      cachedData.inferredTitle !== inferredTitle
      || JSON.stringify(cachedData.frontmatterData) !== JSON.stringify(frontmatter.data)
      || headersChanged(cachedData.headers, headers)
    )) {
      // frontmatter changed... need to do a full reload
      module.exports.frontmatterEmitter.emit('update', file)
    }

    devCache.set(file, {
      headers,
      frontmatterData: frontmatter.data,
      inferredTitle
    })
  }

  // the render method has been augmented to allow plugins to
  // register data during render
  const { html } = markdown.render(content, {
    loader,
    frontmatter: frontmatter.data,
    relativePath: path.relative(sourceDir, file).replace(/\\/g, '/')
  })

  const res = (
    `<template>\n`
    + `<div>${html}</div>\n`
    + `</template>\n`
    + `<script>\n`
    + `export default {\n`
    + `data: () => (${JSON.stringify(frontmatter.data)}),\n`
    + `meta: ${JSON.stringify(frontmatter.data)},\n`
    + `}\n`
    + `</script>`
  )
  cache.set(key, res)
  return res
}

function headersChanged (a, b) {
  if (a.length !== b.length) return true
  return a.some((h, i) => (
    h.title !== b[i].title
    || h.level !== b[i].level
  ))
}

module.exports.frontmatterEmitter = new EventEmitter()

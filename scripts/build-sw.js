#!/usr/bin/env node
'use strict'

/*
 * Copies scripts/sw-src.js to out/sw.js.
 *
 * There is no precache manifest to inject — the worker caches exactly one hand-written page — so
 * unlike bridge-ui this needs no workbox-build and no build-time codegen. It exists at all so that
 * the served worker is a build output: a source file that is never directly servable can be
 * swapped for the kill switch without touching what the site publishes.
 *
 * Runs from postbuild, AFTER next-sitemap, because it writes into out/.
 */

const fs = require('fs')
const path = require('path')

const SW_SRC = path.join(__dirname, 'sw-src.js')
const OUT_DIR = path.join(__dirname, '..', 'out')
const SW_DEST = path.join(OUT_DIR, 'sw.js')

if (!fs.existsSync(OUT_DIR)) {
  console.error(`build-sw: ${OUT_DIR} does not exist — run the Next build first.`)
  process.exit(1)
}

fs.copyFileSync(SW_SRC, SW_DEST)
const { size } = fs.statSync(SW_DEST)
console.log(`build-sw: wrote out/sw.js (${(size / 1024).toFixed(1)} kB)`)

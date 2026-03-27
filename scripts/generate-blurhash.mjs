#!/usr/bin/env node
/**
 * Generate BlurHash strings for all photos in photos.json.
 *
 * Reads each thumbnail, computes a 4x3 BlurHash, and adds it to photos.json.
 * Skips photos that already have a blurhash field.
 *
 * Usage:
 *   node scripts/generate-blurhash.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { encode } from 'blurhash'

const PHOTOS_PATH = path.resolve('public/photos.json')
const THUMBS_DIR = path.resolve('thumbs')
const HASH_WIDTH = 32 // decode dimensions (small is fine)
const COMPONENTS_X = 4
const COMPONENTS_Y = 3

async function main() {
  const photos = JSON.parse(fs.readFileSync(PHOTOS_PATH, 'utf-8'))
  console.log(`Processing ${photos.length} photos...\n`)

  let generated = 0
  let skipped = 0

  for (const photo of photos) {
    if (photo.blurhash) {
      skipped++
      continue
    }

    const filename = photo.url.split('/').pop()
    // Try thumbnail first (smaller, faster), fall back to downloading
    const thumbPath = path.join(THUMBS_DIR, filename)

    try {
      let buffer
      if (fs.existsSync(thumbPath)) {
        buffer = fs.readFileSync(thumbPath)
      } else {
        // Download thumbnail
        console.log(`  Downloading ${filename}...`)
        const thumbUrl = photo.thumb || photo.url
        const res = await fetch(thumbUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        buffer = Buffer.from(await res.arrayBuffer())
      }

      // Resize to small dimensions for hashing
      const { data, info } = await sharp(buffer)
        .raw()
        .ensureAlpha()
        .resize(HASH_WIDTH, null, { fit: 'inside' })
        .toBuffer({ resolveWithObject: true })

      const hash = encode(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
        COMPONENTS_X,
        COMPONENTS_Y
      )

      photo.blurhash = hash
      generated++
      console.log(`[${generated + skipped}/${photos.length}] ${filename} → ${hash}`)
    } catch (err) {
      console.error(`  ✗ ${filename}: ${err.message}`)
    }
  }

  fs.writeFileSync(PHOTOS_PATH, JSON.stringify(photos, null, 2) + '\n')
  console.log(`\nDone! ${generated} generated, ${skipped} skipped (already have hash)`)
}

main().catch(console.error)

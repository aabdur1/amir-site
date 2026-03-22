#!/usr/bin/env node
/**
 * Generate web-optimized thumbnails for the gallery.
 *
 * Downloads each photo from CloudFront, resizes to 1600px wide (quality 80),
 * and saves to ./thumbs/. Then updates photos.json with a `thumb` field
 * pointing to the CloudFront thumbs/ path.
 *
 * Usage:
 *   node scripts/generate-thumbnails.mjs
 *
 * After running:
 *   1. Upload the ./thumbs/ folder to your S3 bucket under a /thumbs/ prefix
 *   2. The thumbs will be available at https://d36t8s1mzbufg5.cloudfront.net/thumbs/<filename>
 *   3. Commit the updated photos.json
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PHOTOS_PATH = path.resolve('public/photos.json')
const THUMBS_DIR = path.resolve('thumbs')
const CLOUDFRONT_BASE = 'https://d36t8s1mzbufg5.cloudfront.net'
const THUMB_WIDTH = 1600
const THUMB_QUALITY = 80

async function main() {
  // Read photos.json
  const photos = JSON.parse(fs.readFileSync(PHOTOS_PATH, 'utf-8'))
  console.log(`Processing ${photos.length} photos...\n`)

  // Create thumbs directory
  fs.mkdirSync(THUMBS_DIR, { recursive: true })

  let processed = 0
  let skipped = 0

  for (const photo of photos) {
    const filename = photo.url.split('/').pop()
    const thumbPath = path.join(THUMBS_DIR, filename)

    // Skip if already generated
    if (fs.existsSync(thumbPath)) {
      photo.thumb = `${CLOUDFRONT_BASE}/thumbs/${filename}`
      skipped++
      continue
    }

    try {
      // Download original
      console.log(`[${processed + skipped + 1}/${photos.length}] Downloading ${filename}...`)
      const res = await fetch(photo.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = Buffer.from(await res.arrayBuffer())

      // Resize and compress
      await sharp(buffer)
        .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
        .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
        .toFile(thumbPath)

      const originalSize = buffer.length
      const thumbSize = fs.statSync(thumbPath).size
      const ratio = ((1 - thumbSize / originalSize) * 100).toFixed(0)
      console.log(
        `  ✓ ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(thumbSize / 1024).toFixed(0)}KB (${ratio}% smaller)`
      )

      // Add thumb URL to photo entry
      photo.thumb = `${CLOUDFRONT_BASE}/thumbs/${filename}`
      processed++
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`)
    }
  }

  // Write updated photos.json
  fs.writeFileSync(PHOTOS_PATH, JSON.stringify(photos, null, 2) + '\n')

  console.log(`\nDone! ${processed} generated, ${skipped} skipped (already exist)`)
  console.log(`\nNext steps:`)
  console.log(`  1. Upload ./thumbs/ to S3: aws s3 sync ./thumbs/ s3://YOUR-BUCKET/thumbs/`)
  console.log(`  2. Commit the updated public/photos.json`)
  console.log(`  3. The gallery will now load ${THUMB_WIDTH}px thumbnails (~200-400KB) instead of originals (~9MB)`)
}

main().catch(console.error)

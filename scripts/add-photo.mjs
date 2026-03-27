#!/usr/bin/env node
/**
 * Add one or more photos to the gallery.
 *
 * Usage:
 *   node scripts/add-photo.mjs <photo1> [photo2] [photo3] ... [--date YYYY-MM-DD] [--camera "Model"] [--lens "Lens"]
 *
 * Examples:
 *   node scripts/add-photo.mjs ~/Photos/DSC00123.jpg
 *   node scripts/add-photo.mjs ~/Photos/*.jpg
 *   node scripts/add-photo.mjs photo1.jpg photo2.jpg --camera "X100VI" --lens "23mm F2"
 *
 * For each photo it:
 *   1. Uploads the original to S3
 *   2. Generates a 1600px thumbnail
 *   3. Uploads the thumbnail to S3 /thumbs/
 *   4. Adds the entry to photos.json
 *
 * --date/--camera/--lens flags apply to ALL photos in the batch.
 * If not provided, auto-detects from filename or prompts (once for the batch).
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { encode } from 'blurhash'
import readline from 'node:readline'

const S3_BUCKET = 'amirabdurrahim-photos'
const CLOUDFRONT_BASE = 'https://d36t8s1mzbufg5.cloudfront.net'
const PHOTOS_PATH = path.resolve('public/photos.json')
const THUMBS_DIR = path.resolve('thumbs')
const THUMB_WIDTH = 1600
const THUMB_QUALITY = 80

const CAMERA_DEFAULTS = {
  DSCF: { camera: 'X100VI', lens: '23mm F2' },
  DSC0: { camera: 'ILCE-6700', lens: '18-50mm F2.8 DC DN | Contemporary 021' },
  DSC08: { camera: 'ILCE-6700', lens: '18-50mm F2.8 DC DN | Contemporary 021' },
  DSC09: { camera: 'ILCE-6700', lens: '18-50mm F2.8 DC DN | Contemporary 021' },
  _DSC: { camera: 'ILCE-6300', lens: '18-50mm F2.8 DC DN | Contemporary 021' },
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer) }))
}

function parseArgs(args) {
  const result = { files: [], date: null, camera: null, lens: null }
  let i = 0
  while (i < args.length) {
    if (args[i] === '--date') { result.date = args[++i]; i++ }
    else if (args[i] === '--camera') { result.camera = args[++i]; i++ }
    else if (args[i] === '--lens') { result.lens = args[++i]; i++ }
    else { result.files.push(args[i]); i++ }
  }
  return result
}

function extractDateFromFilename(filename) {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})-/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  return null
}

function guessCamera(filename) {
  const base = path.basename(filename).replace(/^\d{8}-/, '')
  for (const [prefix, defaults] of Object.entries(CAMERA_DEFAULTS)) {
    if (base.startsWith(prefix)) return defaults
  }
  return null
}

async function processPhoto(filePath, { date, camera, lens }, photos) {
  const filename = path.basename(filePath)
  console.log(`\n── ${filename}`)

  // Determine date (from flag, filename, or prompt)
  let photoDate = date || extractDateFromFilename(filename)
  if (!photoDate) photoDate = await ask('  Date (YYYY-MM-DD): ')

  // Determine camera + lens (from flag, filename prefix, or prompt)
  const guess = guessCamera(filename)
  let photoCamera = camera || guess?.camera
  let photoLens = lens || guess?.lens
  if (!photoCamera) photoCamera = await ask('  Camera model: ')
  if (!photoLens) photoLens = await ask('  Lens: ')

  console.log(`  ${photoDate} · ${photoCamera} · ${photoLens}`)

  // Upload original
  console.log('  Uploading original...')
  execFileSync('aws', ['s3', 'cp', filePath, `s3://${S3_BUCKET}/${filename}`], { stdio: 'inherit' })

  // Generate thumbnail
  console.log('  Generating thumbnail...')
  fs.mkdirSync(THUMBS_DIR, { recursive: true })
  const thumbPath = path.join(THUMBS_DIR, filename)
  const buffer = fs.readFileSync(filePath)
  await sharp(buffer)
    .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
    .toFile(thumbPath)

  const originalSize = buffer.length
  const thumbSize = fs.statSync(thumbPath).size
  console.log(`  ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(thumbSize / 1024).toFixed(0)}KB (${((1 - thumbSize / originalSize) * 100).toFixed(0)}% smaller)`)

  // Generate BlurHash
  console.log('  Generating BlurHash...')
  const thumbBuffer = fs.readFileSync(thumbPath)
  const { data: rawData, info } = await sharp(thumbBuffer)
    .raw()
    .ensureAlpha()
    .resize(32, null, { fit: 'inside' })
    .toBuffer({ resolveWithObject: true })
  const blurhash = encode(new Uint8ClampedArray(rawData), info.width, info.height, 4, 3)
  console.log(`  ${blurhash}`)

  // Upload thumbnail
  console.log('  Uploading thumbnail...')
  execFileSync('aws', ['s3', 'cp', thumbPath, `s3://${S3_BUCKET}/thumbs/${filename}`], { stdio: 'inherit' })

  // Add to photos array
  photos.unshift({
    url: `${CLOUDFRONT_BASE}/${filename}`,
    date: photoDate,
    camera: photoCamera,
    lens: photoLens,
    thumb: `${CLOUDFRONT_BASE}/thumbs/${filename}`,
    blurhash,
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.files.length === 0) {
    console.error('Usage: node scripts/add-photo.mjs <photo1> [photo2] ... [--date YYYY-MM-DD] [--camera "Model"] [--lens "Lens"]')
    process.exit(1)
  }

  // Resolve and validate all paths
  const filePaths = args.files.map(f => path.resolve(f))
  for (const fp of filePaths) {
    if (!fs.existsSync(fp)) {
      console.error(`File not found: ${fp}`)
      process.exit(1)
    }
  }

  console.log(`\nAdding ${filePaths.length} photo${filePaths.length > 1 ? 's' : ''}...\n`)

  const photos = JSON.parse(fs.readFileSync(PHOTOS_PATH, 'utf-8'))

  for (const fp of filePaths) {
    await processPhoto(fp, { date: args.date, camera: args.camera, lens: args.lens }, photos)
  }

  // Write updated photos.json
  fs.writeFileSync(PHOTOS_PATH, JSON.stringify(photos, null, 2) + '\n')

  console.log(`\n✓ Done! ${filePaths.length} photo${filePaths.length > 1 ? 's' : ''} added (${photos.length} total)`)
  console.log(`\nNext: git add public/photos.json && git commit -m "feat: add ${filePaths.length} photos" && git push`)
}

main().catch(console.error)

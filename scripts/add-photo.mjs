#!/usr/bin/env node
/**
 * Add a photo to the gallery in one command.
 *
 * Usage:
 *   node scripts/add-photo.mjs <path-to-photo> [--date YYYY-MM-DD] [--camera "Model"] [--lens "Lens"]
 *
 * Examples:
 *   node scripts/add-photo.mjs ~/Photos/DSC00123.jpg
 *   node scripts/add-photo.mjs ~/Photos/DSCF0723.jpg --camera "X100VI" --lens "23mm F2"
 *
 * What it does:
 *   1. Uploads the original to S3 (amirabdurrahim-photos)
 *   2. Generates a 1600px thumbnail
 *   3. Uploads the thumbnail to S3 /thumbs/
 *   4. Adds the entry to photos.json (with thumb URL)
 *   5. Prints next steps (commit & push)
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import readline from 'node:readline'

const S3_BUCKET = 'amirabdurrahim-photos'
const CLOUDFRONT_BASE = 'https://d36t8s1mzbufg5.cloudfront.net'
const PHOTOS_PATH = path.resolve('public/photos.json')
const THUMBS_DIR = path.resolve('thumbs')
const THUMB_WIDTH = 1600
const THUMB_QUALITY = 80

// Camera defaults based on filename prefix
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
  const result = { filePath: null, date: null, camera: null, lens: null }
  let i = 0
  while (i < args.length) {
    if (args[i] === '--date') { result.date = args[++i]; i++ }
    else if (args[i] === '--camera') { result.camera = args[++i]; i++ }
    else if (args[i] === '--lens') { result.lens = args[++i]; i++ }
    else { result.filePath = args[i]; i++ }
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

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.filePath) {
    console.error('Usage: node scripts/add-photo.mjs <path-to-photo> [--date YYYY-MM-DD] [--camera "Model"] [--lens "Lens"]')
    process.exit(1)
  }

  const filePath = path.resolve(args.filePath)
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const filename = path.basename(filePath)
  console.log(`\nAdding photo: ${filename}\n`)

  // Determine date
  let date = args.date || extractDateFromFilename(filename)
  if (!date) date = await ask('Date (YYYY-MM-DD): ')

  // Determine camera + lens
  const guess = guessCamera(filename)
  let camera = args.camera || guess?.camera
  let lens = args.lens || guess?.lens
  if (!camera) camera = await ask('Camera model: ')
  if (!lens) lens = await ask('Lens: ')

  console.log(`  Date:   ${date}`)
  console.log(`  Camera: ${camera}`)
  console.log(`  Lens:   ${lens}\n`)

  // 1. Upload original to S3
  console.log('1. Uploading original to S3...')
  execFileSync('aws', ['s3', 'cp', filePath, `s3://${S3_BUCKET}/${filename}`], { stdio: 'inherit' })

  // 2. Generate thumbnail
  console.log('\n2. Generating thumbnail...')
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

  // 3. Upload thumbnail to S3
  console.log('\n3. Uploading thumbnail to S3...')
  execFileSync('aws', ['s3', 'cp', thumbPath, `s3://${S3_BUCKET}/thumbs/${filename}`], { stdio: 'inherit' })

  // 4. Update photos.json
  console.log('\n4. Updating photos.json...')
  const photos = JSON.parse(fs.readFileSync(PHOTOS_PATH, 'utf-8'))
  photos.unshift({
    url: `${CLOUDFRONT_BASE}/${filename}`,
    date,
    camera,
    lens,
    thumb: `${CLOUDFRONT_BASE}/thumbs/${filename}`,
  })
  fs.writeFileSync(PHOTOS_PATH, JSON.stringify(photos, null, 2) + '\n')

  console.log(`\n✓ Done! Photo added to gallery (${photos.length} total)`)
  console.log(`\nNext: git add public/photos.json && git commit -m "feat: add ${camera} photo (${date})" && git push`)
}

main().catch(console.error)

#!/usr/bin/env node
/**
 * Open a native Finder file picker to select photos, then process them.
 *
 * Usage:
 *   node scripts/add-photo-gui.mjs [--camera "Model"] [--lens "Lens"]
 *
 * Opens a macOS Finder dialog to select one or more images.
 * Selected photos are processed through the same pipeline as add-photo.mjs.
 */

import { execFileSync } from 'node:child_process'
import path from 'node:path'

const appleScript = [
  'set theFiles to choose file with prompt "Select photos to add to gallery" of type {"public.jpeg", "public.png", "public.tiff", "public.heic"} with multiple selections allowed',
  'set posixPaths to {}',
  'repeat with f in theFiles',
  'set end of posixPaths to POSIX path of f',
  'end repeat',
  'set text item delimiters of AppleScript to linefeed',
  'return posixPaths as text',
].join('\n')

try {
  console.log('Opening file picker...\n')

  // Use execFileSync with osascript -e to avoid shell injection
  const result = execFileSync('osascript', ['-e', appleScript], { encoding: 'utf-8' }).trim()

  if (!result) {
    console.log('No files selected.')
    process.exit(0)
  }

  // osascript returns newline-separated POSIX paths
  const files = result.split('\n').map(f => f.trim()).filter(Boolean)
  console.log(`Selected ${files.length} photo${files.length > 1 ? 's' : ''}:\n`)
  files.forEach(f => console.log(`  ${path.basename(f)}`))
  console.log()

  // Forward to add-photo.mjs with all selected files + any flags passed to this script
  const flags = process.argv.slice(2)
  const addPhotoScript = path.resolve('scripts/add-photo.mjs')

  execFileSync('node', [addPhotoScript, ...files, ...flags], {
    stdio: 'inherit',
    cwd: process.cwd(),
  })
} catch (err) {
  if (err.status === 1) {
    console.log('Cancelled.')
  } else {
    console.error('Error:', err.message)
  }
}

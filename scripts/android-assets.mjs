// Genera los iconos y pantallas de arranque de Android a partir del logo de OBD COOL.
// Uso: npm run android:assets
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const RES = join('android', 'app', 'src', 'main', 'res')
const LOGO_PATH = join('public', 'logo.svg')
const BACKGROUND = '#070b10'

const DENSITIES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
}

const SPLASH_SIZES = {
  drawable: [480, 320],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
}

const logo = await readFile(LOGO_PATH, 'utf8')

// Versión sin fondo ni borde: solo el coche y la onda, para el icono adaptativo.
const foregroundSvg = logo
  .replace(/\s*<rect width="512" height="512" rx="112" fill="url\(#bg\)"\/>/, '')
  .replace(/\s*<rect x="32" y="32" width="448" height="448" rx="88"[^/]*\/>/, '')

async function renderSvg(svg, size) {
  return sharp(Buffer.from(svg))
    .resize(Math.round(size), Math.round(size), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

async function roundIcon(buffer, size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ffffff"/></svg>`,
  )
  return sharp(buffer)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

for (const [density, scale] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${density}`)
  const legacySize = Math.round(48 * scale)
  const legacy = await renderSvg(logo, legacySize)
  await writeFile(join(dir, 'ic_launcher.png'), legacy)
  await writeFile(join(dir, 'ic_launcher_round.png'), await roundIcon(legacy, legacySize))

  const adaptiveSize = Math.round(108 * scale)
  const foreground = await renderSvg(foregroundSvg, adaptiveSize * 0.72)
  const padded = await sharp({
    create: {
      width: adaptiveSize,
      height: adaptiveSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: foreground, gravity: 'center' }])
    .png()
    .toBuffer()
  await writeFile(join(dir, 'ic_launcher_foreground.png'), padded)

  console.log(`iconos ${density}: ${legacySize}px / adaptativo ${adaptiveSize}px`)
}

const splashLogo = Buffer.from(foregroundSvg)

for (const [dirName, [width, height]] of Object.entries(SPLASH_SIZES)) {
  const short = Math.min(width, height)
  const logoSize = Math.round(short * 0.34)
  const icon = await sharp(splashLogo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const splash = await sharp({
    create: { width, height, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toBuffer()

  await writeFile(join(RES, dirName, 'splash.png'), splash)
  console.log(`splash ${dirName}: ${width}x${height}`)
}

// Fondo del icono adaptativo a juego con el logo.
await writeFile(
  join(RES, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0b1220</color>\n</resources>\n`,
)

console.log('Listo: iconos y splashes de Android actualizados.')

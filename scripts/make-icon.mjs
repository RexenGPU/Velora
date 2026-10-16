import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'
import Jimp from 'jimp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'build')
fs.mkdirSync(outDir, { recursive: true })

const SOURCE = 'D:\\Téléchargements\\logo_cutout.png'
// Repo-local fallback so a fresh clone can regenerate all icons.
const REPO_LOGO = path.join(root, 'src', 'assets', 'logo.png')

/**
 * Read the source logo and prepare it for icon generation:
 * trim transparent padding, add a slim margin, resize to a clean 256px square
 * so the mark fills the taskbar icon instead of floating in whitespace.
 * Falls back to the committed logo, then to drawing the Velora shield.
 */
async function getLogoPng() {
  const source = fs.existsSync(SOURCE) ? SOURCE : fs.existsSync(REPO_LOGO) ? REPO_LOGO : null
  if (source) {
    const img = await Jimp.read(source)
    img.autocrop()
    const max = Math.max(img.bitmap.width, img.bitmap.height)
    const margin = Math.round(max * 0.03)
    const size = max + margin * 2
    const canvas = new Jimp(size, size)
    canvas.composite(
      img,
      Math.round((size - img.bitmap.width) / 2),
      Math.round((size - img.bitmap.height) / 2),
    )
    canvas.resize(256, 256)
    const buf = await canvas.getBufferAsync(Jimp.MIME_PNG)
    console.log(`Using ${source} — trimmed ${img.bitmap.width}x${img.bitmap.height} → 256x256 with margin`)
    return buf
  }
  console.log('No logo found — generating the Velora shield instead.')
  return drawShieldPng()
}

/* ---------- Fallback: programmatic Velora shield ---------- */

const W = 512
const H = 512

function drawShieldPng() {
  const px = Buffer.alloc(W * H * 4)
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

  function blend(x, y, r, g, b, a) {
    const i = (y * W + x) * 4
    const srcA = a / 255
    const dstA = px[i + 3] / 255
    const outA = srcA + dstA * (1 - srcA)
    if (outA <= 0) return
    px[i] = Math.round((r * srcA + px[i] * dstA * (1 - srcA)) / outA)
    px[i + 1] = Math.round((g * srcA + px[i + 1] * dstA * (1 - srcA)) / outA)
    px[i + 2] = Math.round((b * srcA + px[i + 2] * dstA * (1 - srcA)) / outA)
    px[i + 3] = Math.round(outA * 255)
  }

  function sdRoundedBox(px_, py_, cx, cy, hw, hh, r) {
    const qx = Math.abs(px_ - cx) - hw + r
    const qy = Math.abs(py_ - cy) - hh + r
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  }

  function sdSegment(px_, py_, x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy
    const t = clamp(((px_ - x1) * dx + (py_ - y1) * dy) / len2, 0, 1)
    return Math.hypot(px_ - (x1 + t * dx), py_ - (y1 + t * dy))
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = x + 0.5
      const fy = y + 0.5
      const dBox = sdRoundedBox(fx, fy, W / 2, H / 2, W / 2, H / 2, 96)
      const aBox = clamp(0.5 - dBox, 0, 1)
      if (aBox > 0) {
        blend(x, y, 11, 14, 20, aBox * 255)
        const dV =
          Math.min(sdSegment(fx, fy, 150, 130, 256, 380), sdSegment(fx, fy, 256, 380, 362, 130)) - 22
        const aV = clamp(0.5 - dV, 0, 1)
        if (aV > 0) {
          const t = clamp((fy - 130) / 250, 0, 1)
          blend(x, y, Math.round(77 + (43 - 77) * t), Math.round(163 + (212 - 163) * t), Math.round(255 + (232 - 255) * t), aV * 255)
        }
        const dDot = Math.hypot(fx - 378, fy - 108) - 30
        const aDot = clamp(0.5 - dDot, 0, 1)
        if (aDot > 0) blend(x, y, 43, 212, 232, aDot * 255)
      }
    }
  }

  const crcTable = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c
  }
  const crc32 = (buf) => {
    let c = -1
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ -1) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0)
  ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc((W * 4 + 1) * H)
  for (let y = 0; y < H; y++) {
    const rowStart = y * (W * 4 + 1)
    raw[rowStart] = 0
    px.copy(raw, rowStart + 1, y * W * 4, (y + 1) * W * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------- Outputs ---------- */

const png = await getLogoPng()

fs.writeFileSync(path.join(outDir, 'icon.png'), png)
const copyTo = (dest) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(path.join(outDir, 'icon.png'), dest)
}
copyTo(path.join(root, 'src', 'assets', 'logo.png'))
copyTo(path.join(root, 'electron', 'logo.png'))
copyTo(path.join(root, 'public', 'favicon.png'))

const ico = await pngToIco(png)
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico)

console.log(
  `Wrote build/icon.ico (${(ico.length / 1024).toFixed(0)} KB), build/icon.png, src/assets/logo.png, electron/logo.png, public/favicon.png`,
)

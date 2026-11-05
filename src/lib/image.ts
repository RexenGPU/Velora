/**
 * Downscale a user-picked image to a wallpaper data URL.
 * Runs entirely in the renderer — the file never leaves the device.
 */
export async function fileToWallpaperDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  const maxDim = 1920
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, width, height)

  let dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  if (dataUrl.length > 1_200_000) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.62)
  }
  return dataUrl.length < 1_500_000 ? dataUrl : null
}

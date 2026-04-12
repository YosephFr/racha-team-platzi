import { writeFileSync } from 'fs'
import sharp from 'sharp'

export async function processImage(inputPath) {
  const outputPath = inputPath.replace(/\.[^.]+$/, '-processed.jpg')

  let buffer = await sharp(inputPath)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  let quality = 75
  while (buffer.length > 2 * 1024 * 1024 && quality > 30) {
    buffer = await sharp(inputPath)
      .rotate()
      .resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer()
    quality -= 10
  }

  writeFileSync(outputPath, buffer)
  console.log(
    `[image] Processed: ${(buffer.length / 1024).toFixed(0)}KB (quality: ${quality < 75 ? quality + 10 : 85})`
  )
  return outputPath
}

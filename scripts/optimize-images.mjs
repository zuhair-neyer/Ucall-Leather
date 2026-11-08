import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
const directory = path.resolve("public")
for (const name of await fs.readdir(directory)) {
  if (!/\.jpe?g$/i.test(name)) continue
  const source = path.join(directory, name), destination = source.replace(/\.jpe?g$/i, ".webp")
  const result = await sharp(source).rotate().resize({ width: name.startsWith("hero") ? 1800 : 1200, withoutEnlargement: true }).webp({ quality: name.startsWith("hero") ? 74 : 78, effort: 6 }).toFile(destination)
  console.log(`${name} -> ${path.basename(destination)}: ${Math.round(result.size / 1024)} KB`)
}

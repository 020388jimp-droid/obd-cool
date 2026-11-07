import { copyFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const index = join(dist, 'index.html')
const notFound = join(dist, '404.html')

try {
  await access(index, constants.F_OK)
  await copyFile(index, notFound)
  console.log('postbuild: dist/404.html creado para GitHub Pages.')
} catch {
  console.error('postbuild: no se encontró dist/index.html. Ejecuta vite build primero.')
  process.exitCode = 1
}

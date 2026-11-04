import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// Generates dist/sw.js from src/sw.template.js. The cache version is a hash of everything
// built, so any change gets a new cache and old ones are deleted on activate.
function serviceWorker() {
  let outDir
  return {
    name: 'wheel-service-worker',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir },
    closeBundle() {
      const template = readFileSync('src/sw.template.js', 'utf8')
      const files = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter((f) => f.isFile() && f.name !== 'sw.js')
        .map((f) => path.relative(outDir, path.join(f.parentPath, f.name)).split(path.sep).join('/'))
        .sort()
      const hash = createHash('sha256').update(template)
      for (const f of files) hash.update(f).update(readFileSync(path.join(outDir, f)))
      const precache = ['/', ...files.filter((f) => f !== 'index.html').map((f) => `/${f}`)]
      writeFileSync(path.join(outDir, 'sw.js'), template
        .replace('%%VERSION%%', hash.digest('hex').slice(0, 12))
        .replace('%%PRECACHE%%', JSON.stringify(precache)))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
  server: {
    // `npm run dev:api` runs the API on 3000
    proxy: { '/api': 'http://localhost:3000' },
  },
})

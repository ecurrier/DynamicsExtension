import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const output = join(process.cwd(), '.output', 'chrome-mv3')
if (!existsSync(output)) {
  console.error('Run `npm run build` first; .output/chrome-mv3 was not found.')
  process.exit(1)
}

copyFileSync(join(process.cwd(), 'dev', 'harness', 'chrome-shim.js'), join(output, 'chrome-shim.js'))

for (const [source, target] of [
  ['popup.html', 'harness.html'],
  ['results-viewer.html', 'harness-results.html'],
  ['plugin-traces.html', 'harness-traces.html'],
  ['data-transporter.html', 'harness-transporter.html'],
]) {
  const html = readFileSync(join(output, source), 'utf8').replace(
    '<script type="module"',
    '<script src="./chrome-shim.js"></script><script type="module"',
  )
  writeFileSync(join(output, target), html)
}

console.log('Harness written to .output/chrome-mv3/harness.html, harness-results.html, and harness-traces.html')
console.log('Serve the folder, for example: npx serve -l 5173 .output/chrome-mv3')

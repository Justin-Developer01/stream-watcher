import { readFileSync } from 'node:fs'
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')))
let diffs = 0
for (const sc of Object.keys(a)) {
  const A = a[sc], B = b[sc] ?? {}
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    if (k.includes('>script:')) continue
    if (A[k] !== B[k]) { diffs++; if (diffs <= 15) console.log(sc, k.slice(-90), '\n  before', A[k]?.slice(0, 200), '\n  after ', B[k]?.slice(0, 200)) }
  }
}
console.log('differences:', diffs)

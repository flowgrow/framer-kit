import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { prepareWorker } from '../scripts/prepare-worker.mjs'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, {recursive:true,force:true}))) })
async function fixture() {
 const root = await mkdtemp(join(tmpdir(),'framer-worker-test-')); roots.push(root)
 await mkdir(join(root,'worker')); await mkdir(join(root,'dist'))
 await writeFile(join(root,'package.json'),JSON.stringify({version:'0.5.4'}))
 await writeFile(join(root,'worker/releases.json'),JSON.stringify(['0.5.3','0.5.4']))
 await writeFile(join(root,'worker/manifest.json'),'unchanged')
 for(const name of ['index.js','ramka.js','scroll-snap.js','index.d.ts','ramka.d.ts','scroll-snap.d.ts']) await writeFile(join(root,'dist',name),'new build')
 const prefix = 'builds/'+'a'.repeat(24)
 const history = {versions:['0.5.3'],builds:{[prefix]:['index.js']}}
 const assets = new Map([
  [`/${prefix}/index.js`,'old hashed build'],
  ['/0.5.3/index.js','export * from "./chunk.js";'],
  ['/0.5.3/chunk.js','export const load = () => import("./lazy.js");\n//# sourceMappingURL=chunk.js.map'],
  ['/0.5.3/lazy.js','old lazy module'],
  ['/0.5.3/chunk.js.map','{"version":3}'],
  ['/0.5.3/index.d.ts','export * from "./types.js";'],
  ['/0.5.3/types.d.ts','export declare const old: boolean;'],
  ...['ramka.js','scroll-snap.js','ramka.d.ts','scroll-snap.d.ts'].map(name=>['/0.5.3/'+name,'old entry'])
 ])
 const requested=[]
 const fetchAsset=async url=>{
  expect(new URL(url).origin).toBe('https://cdn.test'); requested.push(new URL(url).pathname)
  if(new URL(url).pathname==='/health') return Response.json(history)
  const value=assets.get(new URL(url).pathname)
  return new Response(value??'missing',{status:value===undefined?404:200})
 }
 return {root,prefix,history,assets,requested,fetchAsset,origin:'https://cdn.test'}
}
describe('direct Worker preparation',()=>{
 it('copies the local build and retains historical module graphs, types, maps and hashes',async()=>{
  const f=await fixture(); const manifest=await prepareWorker(f)
  expect(manifest.current).toBe('0.5.4')
  expect(manifest.files['0.5.3']).toEqual(expect.arrayContaining(['chunk.js','lazy.js','types.d.ts','chunk.js.map']))
  for(const [path,content] of f.assets) expect(await readFile(join(f.root,'worker/.generated/assets',path),'utf8')).toBe(content)
  expect(await readFile(join(f.root,'worker/.generated/assets/0.5.4/index.js'),'utf8')).toBe('new build')
 })
 it('uses a recorded inventory to preserve files outside the import graph',async()=>{
  const f=await fixture(); f.assets.set('/0.5.3/orphan.js','keep this URL too')
  f.history.files={'0.5.3':['orphan.js']}
  const manifest=await prepareWorker(f)
  expect(manifest.files['0.5.3']).toEqual(['orphan.js'])
  expect(await readFile(join(f.root,'worker/.generated/assets/0.5.3/orphan.js'),'utf8')).toBe('keep this URL too')
 })
 it('stops if any historical file is unavailable without replacing the manifest',async()=>{
  const f=await fixture(); f.assets.delete('/0.5.3/lazy.js')
  await expect(prepareWorker(f)).rejects.toThrow('Cannot retain')
  expect(await readFile(join(f.root,'worker/manifest.json'),'utf8')).toBe('unchanged')
 })
 it('refuses to replace an already deployed version',async()=>{
  const f=await fixture();f.history.versions.push('0.5.4')
  await expect(prepareWorker(f)).rejects.toThrow('already deployed')
 })
})

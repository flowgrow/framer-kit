import {describe,it,expect} from 'vitest'
import {assertProductionRelease} from '../scripts/check-prod-release.mjs'
describe('production release gate',()=>{
 it('requires a strictly newer semantic release',()=>{
  expect(()=>assertProductionRelease('0.5.2','0.5.1',['0.5.1','0.5.2'])).not.toThrow()
  expect(()=>assertProductionRelease('0.5.1','0.5.1',['0.5.1'])).toThrow('increment')
  expect(()=>assertProductionRelease('0.5.0','0.5.1',['0.5.0'])).toThrow('increment')
  expect(()=>assertProductionRelease('0.5.10','0.5.9',['0.5.10'])).not.toThrow()
 })
 it('requires the package and CDN release list to agree',()=>{
  expect(()=>assertProductionRelease('0.5.2','0.5.1',['0.5.1'])).toThrow('releases.json')
 })
})

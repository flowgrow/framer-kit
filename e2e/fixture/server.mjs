import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
const root = fileURLToPath(new URL('../..', import.meta.url))
const vite = await createServer({ root, configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom', resolve: { dedupe: ['react', 'react-dom'], alias: { framer: fileURLToPath(new URL('./framer.ts', import.meta.url)) } } })
createHttpServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/image.svg') { res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="steelblue"/></svg>');return }
  if (url.pathname !== '/') { vite.middlewares(req,res,()=>{res.statusCode=404;res.end()});return }
  res.setHeader('Content-Type','text/html')
  res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="mount"></div></body></html>')
}).listen(4180,'127.0.0.1')

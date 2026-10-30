import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'
const root = fileURLToPath(new URL('../..', import.meta.url))
const vite = await createServer({ root, configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom', resolve: { dedupe: ['react', 'react-dom'], alias: { framer: fileURLToPath(new URL('./framer.ts', import.meta.url)) } } })
createHttpServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/cms') { res.setHeader('Content-Type','application/json'); setTimeout(() => res.end('[]'), 500); return }
  if (url.pathname === '/image.svg') { res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="steelblue"/></svg>');return }
  if (url.pathname !== '/') { vite.middlewares(req,res,()=>{res.statusCode=404;res.end()});return }
  try {
    const { App } = await vite.ssrLoadModule('/e2e/fixture/App.tsx')
    const html = renderToString(React.createElement(App, { cms: url.searchParams.has('cms'), autoHeight: url.searchParams.has('autoHeight'), settingsDelay: url.searchParams.has('settingsDelay') }))
    res.setHeader('Content-Type','text/html')
    res.end(await vite.transformIndexHtml(req.url, `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
      body { margin: 0; } main { width: min(960px, 100%); margin: auto; display: flex; flex-direction: column; gap: 24px; }
      section { padding: 24px; } .stack { display:flex; gap:24px; align-items:center; height:min-content; }
      .slide { width:640px; height:240px; flex-shrink:1; } img { display:block; width:100%; height:100%; object-fit:cover; }
      [data-loader] { flex:none; } @media(max-width:600px) { .slide { width:240px; height:180px; } }
    </style></head><body><div id="root">${url.searchParams.has('preview') ? '' : html}</div><script type="module" src="/e2e/fixture/client.tsx"></script></body></html>`))
  } catch(e) { vite.ssrFixStacktrace(e);console.error(e);res.statusCode=500;res.end(String(e)) }
}).listen(4181,'127.0.0.1')

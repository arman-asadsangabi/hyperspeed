import type { IncomingMessage, ServerResponse } from 'node:http'
import { app } from './app'

export const config = {
  runtime: 'nodejs',
}

/**
 * Vercel's Node.js runtime passes a Node IncomingMessage / ServerResponse pair
 * (not Web Request / Response), so Hono's middleware throws on `req.headers.get`.
 * Convert at the boundary, and forward the Web Response back through the Node res.
 *
 * If Vercel ever upgrades to passing native Web Request (some runtimes already
 * do — e.g. Edge), the first branch forwards directly without conversion.
 */
export default async function handler(
  req: IncomingMessage | Request,
  res?: ServerResponse,
): Promise<Response | void> {
  // Web Request path (Edge / future Node runtimes that expose fetch-style req)
  if (typeof (req as Request).headers?.get === 'function' && !res) {
    return app.fetch(req as Request)
  }

  // Node IncomingMessage path — convert to Web Request, run Hono, pipe back out.
  const nodeReq = req as IncomingMessage
  const webRes = await app.fetch(nodeRequestToWebRequest(nodeReq))

  if (!res) {
    // No res passed — return the Web Response (some Vercel paths accept this).
    return webRes
  }

  await writeWebResponseToNodeResponse(webRes, res)
}

function nodeRequestToWebRequest(req: IncomingMessage): Request {
  const proto =
    (Array.isArray(req.headers['x-forwarded-proto'])
      ? req.headers['x-forwarded-proto'][0]
      : req.headers['x-forwarded-proto']) ?? 'https'
  const host =
    (Array.isArray(req.headers['x-forwarded-host'])
      ? req.headers['x-forwarded-host'][0]
      : req.headers['x-forwarded-host']) ??
    req.headers.host ??
    'localhost'
  const url = new URL(req.url ?? '/', `${proto}://${host}`)

  const headers = new Headers()
  for (const [key, val] of Object.entries(req.headers)) {
    if (val == null) continue
    if (Array.isArray(val)) {
      for (const v of val) headers.append(key, v)
    } else {
      headers.set(key, String(val))
    }
  }

  const method = (req.method ?? 'GET').toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  return new Request(url.toString(), {
    method,
    headers,
    // Stream the Node request body as a Web ReadableStream.
    body: hasBody ? nodeToWebStream(req) : null,
    // Required by the Web spec when body is a stream.
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
}

function nodeToWebStream(req: IncomingMessage): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      req.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
      req.on('end', () => controller.close())
      req.on('error', (err) => controller.error(err))
    },
  })
}

async function writeWebResponseToNodeResponse(
  webRes: Response,
  nodeRes: ServerResponse,
): Promise<void> {
  nodeRes.statusCode = webRes.status
  webRes.headers.forEach((value, key) => {
    // Skip transfer-encoding — Vercel's wrapper sets it.
    if (key.toLowerCase() === 'transfer-encoding') return
    nodeRes.setHeader(key, value)
  })

  if (!webRes.body) {
    nodeRes.end()
    return
  }

  const reader = webRes.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    nodeRes.write(Buffer.from(value))
  }
  nodeRes.end()
}

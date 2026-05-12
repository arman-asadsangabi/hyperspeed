import { app } from './app'

export const config = {
  runtime: 'edge',
}

export default function handler(request: Request): Response | Promise<Response> {
  return app.fetch(request)
}

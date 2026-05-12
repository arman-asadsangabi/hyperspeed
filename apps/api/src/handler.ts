import { app } from './app'

export const config = {
  runtime: 'nodejs',
}

export default async function handler(request: Request): Promise<Response> {
  return app.fetch(request)
}

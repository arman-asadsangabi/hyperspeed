import Stripe from 'stripe'

let _stripe: Stripe | undefined

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  _stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    // Pin a stable API version so Stripe doesn't change behavior under us.
    apiVersion: '2026-04-22.dahlia',
    appInfo: { name: 'Hyperspeed', version: '0.0.0' },
  })
  return _stripe
}

export const STUDENT_PRICE_ID = process.env.STRIPE_STUDENT_PRICE_ID ?? ''
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''

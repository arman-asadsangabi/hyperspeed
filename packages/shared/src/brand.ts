export const BRAND = {
  name: 'Hyperspeed',
  tagline: 'Expertise infrastructure for AI',
  description: 'B2B expertise infrastructure for AI companies',
  domain: 'hyperspeed.work',
} as const

export const COLORS = {
  primary: '#2563EB',
  primaryDeep: '#1E40AF',
  primaryLight: '#DBEAFE',
  primaryPale: '#EFF6FF',
  ink: '#0F172A',
  slate: '#475569',
  border: '#CBD5E1',
  white: '#FFFFFF',
} as const

export const FONTS = {
  sans: 'Inter, "Geist", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Geist Mono", ui-monospace, monospace',
} as const

export type BrandColor = keyof typeof COLORS

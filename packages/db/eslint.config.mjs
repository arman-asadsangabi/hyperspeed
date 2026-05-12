import base from '../../eslint.config.mjs'

export default [...base, { ignores: ['scripts/**', 'drizzle/**'] }]

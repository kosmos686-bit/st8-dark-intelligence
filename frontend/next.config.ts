import type { NextConfig } from 'next'

const isPages = process.env.GITHUB_PAGES === 'true'

const config: NextConfig = {
  output: isPages ? 'export' : 'standalone',
  basePath: isPages ? '/st8-dark-intelligence' : '',
  images: { unoptimized: isPages },
  trailingSlash: isPages,
  ...(isPages ? {} : {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/:path*`,
        },
      ]
    },
  }),
}

export default config

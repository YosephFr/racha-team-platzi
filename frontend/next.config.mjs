import withSerwist from '@serwist/next'

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS || '').split(',').filter(Boolean),
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default withSerwist({
  swSrc: 'src/sw.js',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)

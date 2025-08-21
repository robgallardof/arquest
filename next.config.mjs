import withPWA from 'next-pwa'

const isProd = process.env.NODE_ENV === 'production'

const withPWAInit = withPWA({
  dest: 'public',
  disable: !isProd,  
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  reactStrictMode: true,
  swcMinify: true,
}

export default withPWAInit(nextConfig)

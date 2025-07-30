/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'nftstorage.link',
      'ipfs.io',
      'gateway.pinata.cloud',
      'image-api.photoroom.com'
    ],
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_TW_CLIENT_ID: process.env.NEXT_PUBLIC_TW_CLIENT_ID,
    NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  },
  serverExternalPackages: [
    'thirdweb',
    'ethers'
  ],
  // BALANCED APPROACH: Security with performance optimization
  typescript: {
    // Maintain type checking but with timeout protection
    ignoreBuildErrors: false,
  },
  eslint: {
    // SECURITY: ESLint enabled with performance optimization
    ignoreDuringBuilds: false,
    dirs: ['src/pages', 'src/components', 'src/lib'], // Limit scope for performance
  },
  // Build optimization to prevent deployment timeouts
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  // fixes wallet connect dependency issue https://docs.walletconnect.com/web3modal/nextjs/about#extra-configuration
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;

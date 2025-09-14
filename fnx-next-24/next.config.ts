import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cld-app-assets.s3.ap-south-1.amazonaws.com',
        port: '',
        pathname: '/logo/**',
      },
    ],
    domains: ['app.clodura.com'],
  },
  devIndicators: {
    position: 'bottom-right',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
};

export default nextConfig;

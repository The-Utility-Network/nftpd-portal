// next.config.js

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(wav|mp3)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/sounds/[name][ext]',
      },
    });

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.reservoir.tools',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_THIRDWEB_CLIENT: process.env.THIRDWEB_CLIENT_ID,
  },
};

export default nextConfig;
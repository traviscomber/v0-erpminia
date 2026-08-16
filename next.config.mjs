/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@napi-rs/lzma'],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({ '@napi-rs/lzma': 'commonjs @napi-rs/lzma' });
    }
    return config;
  },
};

export default nextConfig;

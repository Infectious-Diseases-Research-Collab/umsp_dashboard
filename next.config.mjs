/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  webpack: (config) => {
    // Redirect plotly.js to the minified dist bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      'plotly.js/dist/plotly': 'plotly.js-dist-min',
      'plotly.js': 'plotly.js-dist-min',
    };
    return config;
  },
};

export default nextConfig;

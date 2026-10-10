/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14 的写法：Prisma 引擎按原生包加载，避免被打包进 server bundle
  experimental: { serverComponentsExternalPackages: ["@prisma/client"] },
};

export default nextConfig;

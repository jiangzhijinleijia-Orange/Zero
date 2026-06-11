import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 画像最適化は使わない(Vercel の Image Optimization 使用量を発生させない。NF-8)
  images: { unoptimized: true },
};

export default nextConfig;

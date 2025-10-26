import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Eliminado modularizeImports para 'lucide-react' debido a errores de resolución
  // Usar importaciones nombradas: import { Icon } from 'lucide-react'
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3001"],
    },
  },
};

export default nextConfig;

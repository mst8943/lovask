import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/[^/]+\/(?!_next).*$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
          networkTimeoutSeconds: 5
        }
      },
      {
        urlPattern: /^https?:\/\/[^/]+\/api\/.*$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api',
          expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 5
        }
      },
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'supabase-images',
          expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }
        }
      },
      {
        urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-images',
          expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }
        }
      }
    ],
  },
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      }
    ]
  },
  // Next.js 16'da Turbopack varsayılan olduğu için ve PWA eklentisi Webpack kullandığı için
  // bu uyarıyı boş bir turbopack objesiyle susturuyoruz.
  turbopack: {
    // Boş bırakıyoruz
  }
};

export default withPWAConfig(nextConfig);

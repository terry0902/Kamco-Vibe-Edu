import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 런타임에 읽는 샘플 매뉴얼이 배포본에서 빠지지 않게 한다.
  outputFileTracingIncludes: {
    "/api/chat": ["./manuals/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

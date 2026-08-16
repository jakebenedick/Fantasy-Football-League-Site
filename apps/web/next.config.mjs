/** @type {import('next').NextConfig} */
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  ...(staticExport
    ? { output: "export", trailingSlash: true }
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: `${
                process.env.API_PROXY_URL || "http://127.0.0.1:8000"
              }/api/:path*`,
            },
          ];
        },
      }),
};

export default nextConfig;

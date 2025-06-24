/** @type {import('next').NextConfig} */
const nextConfig = {};

// Import server initialization in production
if (process.env.NODE_ENV === "production") {
  await import("./src/app/server.ts");
}

export default nextConfig;

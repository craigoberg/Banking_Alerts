import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is opened at 127.0.0.1 while Next treats localhost as the
  // source host. Without this, dev assets and hot reload are blocked.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;

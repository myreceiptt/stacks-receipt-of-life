import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Di sisi server, semua import '@stacks/connect'
      // diarahkan ke stub kita.
      config.resolve.alias["@stacks/connect"] = path.resolve(
        __dirname,
        "src/lib/stacks-connect-stub"
      );
      // atau "src/lib/stacks-connect-stub.ts" juga boleh,
      // webpack tetap bisa resolve.
    }

    return config;
  },
};

export default nextConfig;

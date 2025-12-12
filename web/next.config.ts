import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    const alias = { ...(config.resolve.alias ?? {}) };

    if (isServer) {
      // Di sisi server, semua import '@stacks/connect' diarahkan ke stub kita.
      alias["@stacks/connect"] = path.resolve(
        __dirname,
        "src/lib/stacks-connect-stub"
      );
    } else {
      // Di client, jangan ada alias supaya pakai modul asli.
      delete alias["@stacks/connect"];
    }

    config.resolve.alias = alias;

    return config;
  },
};

export default nextConfig;

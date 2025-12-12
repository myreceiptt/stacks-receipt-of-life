import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Pastikan alias tidak bocor antar target: clone alias map dulu.
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
    };

    if (isServer) {
      // Di sisi server, semua import '@stacks/connect' diarahkan ke stub kita.
      config.resolve.alias["@stacks/connect"] = path.resolve(
        __dirname,
        "src/lib/stacks-connect-stub"
      );
    } else {
      // Di client, pakai modul asli.
      config.resolve.alias["@stacks/connect"] = require.resolve("@stacks/connect");
    }

    return config;
  },
};

export default nextConfig;

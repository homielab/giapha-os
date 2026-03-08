import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { readFileSync } from "fs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  webpack: (config) => {
    // Exclude Supabase Edge Functions from Next.js build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [...(config.watchOptions?.ignored || []), "**/supabase/**"],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);

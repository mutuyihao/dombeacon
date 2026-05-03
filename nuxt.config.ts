// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from "nuxt/config";
import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/i18n"],
  i18n: {
    locales: [
      { code: "en", iso: "en-US", file: "en-US.json", name: "English" },
      { code: "zh", iso: "zh-CN", file: "zh-CN.json", name: "中文" },
    ],
    lazy: true,
    langDir: "locales",
    defaultLocale: "zh",
    strategy: "no_prefix",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
  },
  css: [fileURLToPath(new URL("./assets/css/main.css", import.meta.url))],
  app: {
    head: {
      title: "Domain Ops Radar",
      meta: [
        { name: "description", content: "Self-hosted Domain Ops Radar for tracking domain opportunities and portfolio management" },
      ],
    },
  },
  vite: {
    plugins: [tsconfigPaths()],
  },
  postcss: {
    plugins: {
      "@tailwindcss/postcss": {},
      autoprefixer: {},
    },
  },
});

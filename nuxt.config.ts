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
      title: "DomBeacon (域灯)",
      meta: [
        {
          name: "description",
          content:
            "Self-hosted domain ops beacon for tracking wanted domain opportunities, managing owned portfolios, monitoring expiration and SSL risks, and turning domain events into actionable alerts.",
        },
        // Default (light) theme color; `useTheme()` will update it on the client
        // when the user selects dark mode or system resolves to dark.
        { name: "theme-color", content: "#EDF5F3" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        { name: "apple-mobile-web-app-title", content: "DomBeacon" },
      ],
      link: [
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/icons/icon-192.svg" },
      ],
    },
  },
  runtimeConfig: {
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
    vapidSubject: process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    public: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
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

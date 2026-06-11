import { getBooleanEnv, getEnvText } from "../utils/env";
import { logger } from "../utils/logger";

const hasApplicationAuth = () => {
  const hasBasicAuth =
    Boolean(getEnvText("BASIC_AUTH_USERNAME")) &&
    Boolean(getEnvText("BASIC_AUTH_PASSWORD"));
  const hasBearerAuth = Boolean(getEnvText("DOMBEACON_API_TOKEN"));
  return hasBasicAuth || hasBearerAuth;
};

export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV === "production" && !hasApplicationAuth()) {
    logger.warn("No application authentication is configured", {
      impact:
        "DomBeacon should stay behind a trusted network, VPN, or reverse proxy.",
      remediation:
        "Set BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD, or set DOMBEACON_API_TOKEN.",
    });
  }

  if (getBooleanEnv("ALLOW_PRIVATE_WEBHOOK_TARGETS")) {
    logger.warn("Private webhook targets are allowed", {
      impact:
        "Webhook SSRF protection is relaxed for LAN/private destinations.",
      remediation:
        "Use only for trusted internal webhook targets and keep the app behind auth.",
    });
  }
});

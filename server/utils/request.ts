import { isTruthyEnvValue } from "./env";

export const shouldTrustProxyHeaders = () =>
  isTruthyEnvValue(process.env.TRUST_PROXY_HEADERS);

export const getRequestClientKey = (event: any) => {
  const headers = event.node?.req?.headers || {};
  const headerValue = (name: string) => {
    const value = headers[name] || headers[name.toLowerCase()];
    if (Array.isArray(value)) return String(value[0] || "");
    return String(value || "");
  };

  const forwardedFor = shouldTrustProxyHeaders()
    ? headerValue("x-forwarded-for").split(",")[0].trim()
    : "";
  const realIp = shouldTrustProxyHeaders()
    ? headerValue("x-real-ip").trim()
    : "";

  return (
    forwardedFor ||
    realIp ||
    event.node?.req?.socket?.remoteAddress ||
    event.node?.req?.connection?.remoteAddress ||
    "unknown"
  );
};

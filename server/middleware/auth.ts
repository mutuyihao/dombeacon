import {
  createError,
  defineEventHandler,
  getRequestHeader,
  getRequestURL,
} from "h3";
import { timingSafeEqual } from "node:crypto";
import { getBooleanEnv, getEnvText } from "../utils/env";

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const parseBasicAuth = (authorization: string) => {
  const match = authorization.match(/^basic\s+(.+)$/i);
  if (!match) return null;

  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
};

const isPublicPath = (pathname: string) => {
  if (pathname === "/api/health" && !getBooleanEnv("AUTH_PROTECT_HEALTH")) {
    return true;
  }
  return false;
};

const isAuthorized = (authorization: string) => {
  const apiToken = getEnvText("DOMBEACON_API_TOKEN");
  if (apiToken) {
    const bearer = authorization.match(/^bearer\s+(.+)$/i)?.[1]?.trim() || "";
    if (bearer && safeEqual(bearer, apiToken)) return true;
  }

  const username = getEnvText("BASIC_AUTH_USERNAME");
  const password = getEnvText("BASIC_AUTH_PASSWORD");
  if (username && password) {
    const credentials = parseBasicAuth(authorization);
    if (
      credentials &&
      safeEqual(credentials.username, username) &&
      safeEqual(credentials.password, password)
    ) {
      return true;
    }
  }

  return false;
};

export default defineEventHandler((event) => {
  const hasBasicAuth =
    getEnvText("BASIC_AUTH_USERNAME") && getEnvText("BASIC_AUTH_PASSWORD");
  const hasBearerAuth = getEnvText("DOMBEACON_API_TOKEN");
  if (!hasBasicAuth && !hasBearerAuth) return;

  const pathname = getRequestURL(event).pathname;
  if (isPublicPath(pathname)) return;

  const authorization = getRequestHeader(event, "authorization") || "";
  if (isAuthorized(authorization)) return;

  event.node.res.setHeader(
    "WWW-Authenticate",
    'Basic realm="DomBeacon", charset="UTF-8"',
  );
  throw createError({
    statusCode: 401,
    statusMessage: "Unauthorized",
    message: "Authentication required.",
  });
});

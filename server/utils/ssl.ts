import http from "node:http";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import tls from "node:tls";
import { domainToASCII } from "node:url";
import { db } from "../db";
import { sslStatusLatest, sslStatusHistory } from "../db/schema";
import { eq } from "drizzle-orm";

export interface SSLCheckResult {
  domainId: number;
  domain: string;
  checkedHost?: string;
  hasSSL: boolean;
  isValid: boolean;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  daysUntilExpiry?: number;
  error?: string;
  validationError?: string;
  changed: boolean;
}

type SSLCheckCoreResult = Omit<SSLCheckResult, "domainId" | "changed">;

interface SSLCheckOptions {
  timeout: number;
  redirectTimeout: number;
  followRedirects: boolean;
  maxRedirects: number;
  resolveHost: (hostname: string) => Promise<ResolvedHostAddress[]>;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_SSL_TIMEOUT_MS = 10000;
const DEFAULT_REDIRECT_TIMEOUT_MS = 2500;
const DEFAULT_MAX_REDIRECTS = 5;

type ResolvedHostAddress = {
  address: string;
  family: 4 | 6;
};

const resolveHostDefault = async (
  hostname: string,
): Promise<ResolvedHostAddress[]> => {
  const ipFamily = isIP(hostname);
  if (ipFamily) {
    return [{ address: hostname, family: ipFamily as 4 | 6 }];
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return addresses.map((entry) => ({
    address: entry.address,
    family: entry.family as 4 | 6,
  }));
};

const normalizeCheckOptions = (
  timeoutOrOptions?: number | Partial<SSLCheckOptions>,
): SSLCheckOptions => {
  if (typeof timeoutOrOptions === "number") {
    return {
      timeout: timeoutOrOptions,
      redirectTimeout: DEFAULT_REDIRECT_TIMEOUT_MS,
      followRedirects: true,
      maxRedirects: DEFAULT_MAX_REDIRECTS,
      resolveHost: resolveHostDefault,
    };
  }

  return {
    timeout: timeoutOrOptions?.timeout ?? DEFAULT_SSL_TIMEOUT_MS,
    redirectTimeout:
      timeoutOrOptions?.redirectTimeout ?? DEFAULT_REDIRECT_TIMEOUT_MS,
    followRedirects: timeoutOrOptions?.followRedirects ?? true,
    maxRedirects: timeoutOrOptions?.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
    resolveHost: timeoutOrOptions?.resolveHost ?? resolveHostDefault,
  };
};

const normalizeHost = (value: string) => {
  try {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    const bracketlessRaw = raw.replace(/^\[|\]$/g, "");
    if (isIP(bracketlessRaw)) return bracketlessRaw;

    const hostLike = raw.includes("://")
      ? new URL(raw).hostname
      : raw.startsWith("[")
        ? raw.slice(1, raw.indexOf("]"))
        : raw.split(/[/?#]/, 1)[0]?.split("@").pop()?.split(":", 1)[0] || "";
    const cleanedHost = hostLike
      .replace(/^\[|\]$/g, "")
      .replace(/^\.+|\.+$/g, "");

    return isIP(cleanedHost) ? cleanedHost : domainToASCII(cleanedHost);
  } catch {
    return "";
  }
};

const ipv4ToParts = (address: string) => {
  const parts = address.split(".").map((part) => Number(part));
  return parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : null;
};

const isBlockedIPv4 = (address: string) => {
  const parts = ipv4ToParts(address);
  if (!parts) return true;

  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
};

const parseIPv6Bytes = (address: string) => {
  let normalized = address.toLowerCase().split("%", 1)[0];
  const embeddedIPv4Match = normalized.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);

  if (embeddedIPv4Match) {
    const parts = ipv4ToParts(embeddedIPv4Match[2]);
    if (!parts) return null;
    const high = (parts[0] << 8) | parts[1];
    const low = (parts[2] << 8) | parts[3];
    normalized = `${embeddedIPv4Match[1]}${high.toString(16)}:${low.toString(
      16,
    )}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(":").filter(Boolean) : [];
  const right = halves[1] ? halves[1].split(":").filter(Boolean) : [];
  const missing = halves.length === 2 ? 8 - left.length - right.length : 0;
  if (missing < 0) return null;

  const groups = halves.length === 2
    ? [...left, ...Array(missing).fill("0"), ...right]
    : left;
  if (groups.length !== 8) return null;

  const words = groups.map((group) => Number.parseInt(group, 16));
  if (
    words.some(
      (word) => !Number.isInteger(word) || word < 0 || word > 0xffff,
    )
  ) {
    return null;
  }

  return words.flatMap((word) => [(word >> 8) & 0xff, word & 0xff]);
};

const isBlockedIPv6 = (address: string) => {
  const bytes = parseIPv6Bytes(address);
  if (!bytes) return true;

  const isAllZero = bytes.every((byte) => byte === 0);
  const isLoopback =
    bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1;
  const isIPv4Mapped =
    bytes.slice(0, 10).every((byte) => byte === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff;

  if (isIPv4Mapped) {
    return isBlockedIPv4(bytes.slice(12).join("."));
  }

  return (
    isAllZero ||
    isLoopback ||
    (bytes[0] & 0xfe) === 0xfc ||
    (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) ||
    bytes[0] === 0xff ||
    (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) ||
    (bytes[0] === 0x20 && bytes[1] === 0x01 && (bytes[2] & 0xfe) === 0) ||
    (bytes[0] === 0x20 && bytes[1] === 0x02)
  );
};

export const isBlockedForPublicSSLScan = (address: string) => {
  const family = isIP(address);
  if (family === 4) return isBlockedIPv4(address);
  if (family === 6) return isBlockedIPv6(address);
  return true;
};

const resolvePublicHostTarget = async (
  hostname: string,
  options: SSLCheckOptions,
) => {
  const literalFamily = isIP(hostname);
  const addresses: ResolvedHostAddress[] = literalFamily
    ? [{ address: hostname, family: literalFamily as 4 | 6 }]
    : await options.resolveHost(hostname);
  if (!addresses.length) {
    throw new Error(`DNS resolution returned no addresses for ${hostname}`);
  }

  const blocked = addresses.find((entry) =>
    isBlockedForPublicSSLScan(entry.address),
  );
  if (blocked) {
    throw new Error(
      `Blocked non-public address for ${hostname}: ${blocked.address}`,
    );
  }

  return addresses[0];
};

const calculateDaysUntilExpiry = (validTo: Date, now = new Date()) =>
  Math.floor((validTo.getTime() - now.getTime()) / MS_PER_DAY);

const getIssuerName = (cert: tls.PeerCertificate) =>
  cert.issuer?.O || cert.issuer?.CN || "Unknown";

const getValidationError = (
  hostname: string,
  cert: tls.PeerCertificate,
  socket: tls.TLSSocket,
  validFrom: Date,
  validTo: Date,
) => {
  const errors: string[] = [];
  const now = new Date();

  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) {
    errors.push("Certificate validity dates are unavailable");
  } else if (now < validFrom) {
    errors.push("Certificate is not valid yet");
  } else if (now > validTo) {
    errors.push("Certificate has expired");
  }

  const hostnameError = tls.checkServerIdentity(hostname, cert);
  if (hostnameError) {
    errors.push(hostnameError.message);
  }

  if (!socket.authorized && socket.authorizationError) {
    errors.push(String(socket.authorizationError));
  }

  return Array.from(new Set(errors)).join("; ") || undefined;
};

const requestRedirectLocation = async (
  url: URL,
  options: SSLCheckOptions,
  method: string,
) => {
  const target = await resolvePublicHostTarget(url.hostname, options);

  return new Promise<string | null>((resolve) => {
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: target.address,
        port: url.port || 80,
        path: `${url.pathname}${url.search}`,
        method,
        timeout: options.redirectTimeout,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          Host: url.host,
          "User-Agent":
            "Mozilla/5.0 (compatible; DomBeacon SSL Checker; +https://localhost)",
        },
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        const location = res.headers.location;
        res.destroy();
        resolve(
          statusCode >= 300 && statusCode < 400 && location
            ? String(location)
            : null,
        );
      },
    );

    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
    req.end();
  });
};

const getRedirectLocation = async (url: URL, options: SSLCheckOptions) => {
  const headLocation = await requestRedirectLocation(url, options, "HEAD");
  if (headLocation) return headLocation;

  // Some sites do not implement HEAD consistently but redirect normal browser
  // navigation. Fall back to GET and close the response as soon as headers arrive.
  return requestRedirectLocation(url, options, "GET");
};

const discoverBrowserLikeHost = async (
  hostname: string,
  options: SSLCheckOptions,
) => {
  if (!options.followRedirects) return hostname;

  let current = new URL(`http://${hostname}/`);
  for (let i = 0; i < options.maxRedirects; i++) {
    if (current.protocol === "https:") {
      return normalizeHost(current.hostname) || hostname;
    }

    if (current.protocol !== "http:") return hostname;

    const location = await getRedirectLocation(current, options);
    if (!location) return hostname;

    const next = new URL(location, current);
    if (next.protocol === "https:") {
      const nextHost = normalizeHost(next.hostname) || hostname;
      await resolvePublicHostTarget(nextHost, options);
      return nextHost;
    }
    current = next;
  }

  return hostname;
};

const readCertificateViaTLS = (
  originalDomain: string,
  checkedHost: string,
  targetAddress: string,
  timeout: number,
): Promise<SSLCheckCoreResult> =>
  new Promise((resolve) => {
    let settled = false;

    const finish = (result: SSLCheckCoreResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const socket = tls.connect({
      host: targetAddress,
      servername: checkedHost,
      port: 443,
      rejectUnauthorized: false,
      timeout,
    });

    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate(true);
      socket.end();

      if (!cert || Object.keys(cert).length === 0) {
        finish({
          domain: originalDomain,
          checkedHost,
          hasSSL: false,
          isValid: false,
          error: "TLS connected but no peer certificate was returned",
        });
        return;
      }

      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);
      const validationError = getValidationError(
        checkedHost,
        cert,
        socket,
        validFrom,
        validTo,
      );

      finish({
        domain: originalDomain,
        checkedHost,
        hasSSL: true,
        isValid: !validationError,
        issuer: getIssuerName(cert),
        validFrom,
        validTo,
        daysUntilExpiry: calculateDaysUntilExpiry(validTo),
        validationError,
      });
    });

    socket.once("timeout", () => {
      socket.destroy();
      finish({
        domain: originalDomain,
        checkedHost,
        hasSSL: false,
        isValid: false,
        error: "TLS connection timeout",
      });
    });

    socket.once("error", (error) => {
      finish({
        domain: originalDomain,
        checkedHost,
        hasSSL: false,
        isValid: false,
        error: error.message,
      });
    });
  });

/**
 * Check SSL certificate for a domain
 */
export const checkSSLCertificate = async (
  domain: string,
  timeoutOrOptions?: number | Partial<SSLCheckOptions>,
): Promise<SSLCheckCoreResult> => {
  const options = normalizeCheckOptions(timeoutOrOptions);
  const hostname = normalizeHost(domain);

  if (!hostname) {
    return {
      domain,
      hasSSL: false,
      isValid: false,
      error: "Invalid domain",
    };
  }

  try {
    await resolvePublicHostTarget(hostname, options);
    const checkedHost = await discoverBrowserLikeHost(hostname, options);
    const target = await resolvePublicHostTarget(checkedHost, options);
    return readCertificateViaTLS(
      domain,
      checkedHost,
      target.address,
      options.timeout,
    );
  } catch (error: any) {
    return {
      domain,
      checkedHost: hostname,
      hasSSL: false,
      isValid: false,
      error: error?.message || "SSL host safety check failed",
    };
  }
};

/**
 * Update SSL status in database
 */
export const updateSSLStatus = async (
  domainId: number,
  result: Omit<SSLCheckResult, "domainId" | "changed">,
): Promise<{ changed: boolean }> => {
  const now = new Date();

  // Get current status
  const current = await db
    .select()
    .from(sslStatusLatest)
    .where(eq(sslStatusLatest.domainId, domainId))
    .limit(1);

  const currentStatus = current[0];
  let changed = false;
  const shouldPreserveExistingCert =
    !!result.error && currentStatus?.hasSSL === true;

  // Detect changes
  if (shouldPreserveExistingCert) {
    changed = false;
  } else if (currentStatus) {
    changed =
      currentStatus.checkedHost !== (result.checkedHost || result.domain) ||
      currentStatus.hasSSL !== result.hasSSL ||
      currentStatus.isValid !== result.isValid ||
      currentStatus.issuer !== result.issuer ||
      currentStatus.validationError !== (result.validationError || null) ||
      (currentStatus.validTo?.getTime() !== result.validTo?.getTime());
  } else {
    changed = true; // First check
  }

  // Prepare data
  let statusData;
  if (shouldPreserveExistingCert && currentStatus) {
    // Network failures during automatic scans should not destroy the last
    // known-good certificate snapshot. Keep the successful cert facts and
    // record the failed attempt separately.
    statusData = {
      checkedHost: currentStatus.checkedHost,
      hasSSL: currentStatus.hasSSL,
      isValid: currentStatus.isValid,
      issuer: currentStatus.issuer,
      validFrom: currentStatus.validFrom,
      validTo: currentStatus.validTo,
      daysUntilExpiry: currentStatus.validTo
        ? calculateDaysUntilExpiry(currentStatus.validTo, now)
        : currentStatus.daysUntilExpiry,
      checkedAt: currentStatus.checkedAt,
      validationError: currentStatus.validationError,
      lastError: result.error || null,
      lastErrorAt: now,
    };
  } else {
    statusData = {
      checkedHost: result.checkedHost || result.domain,
      hasSSL: result.hasSSL,
      isValid: result.isValid,
      issuer: result.issuer || null,
      validFrom: result.validFrom || null,
      validTo: result.validTo || null,
      daysUntilExpiry: result.daysUntilExpiry ?? null,
      checkedAt: now,
      validationError: result.validationError || null,
      lastError: result.error || null,
      lastErrorAt: result.error ? now : null,
    };
  }

  // Update latest status
  if (currentStatus) {
    await db
      .update(sslStatusLatest)
      .set(statusData)
      .where(eq(sslStatusLatest.domainId, domainId));
  } else {
    await db.insert(sslStatusLatest).values({
      domainId,
      ...statusData,
    });
  }

  // Record history if changed
  if (changed && !result.error) {
    await db.insert(sslStatusHistory).values({
      domainId,
      checkedHost: result.checkedHost || result.domain,
      hasSSL: result.hasSSL,
      isValid: result.isValid,
      issuer: result.issuer || null,
      validFrom: result.validFrom || null,
      validTo: result.validTo || null,
      daysUntilExpiry: result.daysUntilExpiry ?? null,
      validationError: result.validationError || null,
      checkedAt: now,
    });
  }

  return { changed };
};

/**
 * Check SSL for a domain and update database
 */
export const scanDomainSSL = async (
  domainId: number,
  domain: string,
): Promise<SSLCheckResult> => {
  const result = await checkSSLCertificate(domain);
  const { changed } = await updateSSLStatus(domainId, result);

  return {
    domainId,
    domain,
    ...result,
    changed,
  };
};

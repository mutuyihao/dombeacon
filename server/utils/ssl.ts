import https from "https";
import tls from "tls";
import { db } from "../db";
import { sslStatusLatest, sslStatusHistory } from "../db/schema";
import { eq } from "drizzle-orm";

export interface SSLCheckResult {
  domainId: number;
  domain: string;
  hasSSL: boolean;
  isValid: boolean;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  daysUntilExpiry?: number;
  error?: string;
  changed: boolean;
}

/**
 * Check SSL certificate for a domain
 */
export const checkSSLCertificate = async (
  domain: string,
  timeout: number = 10000,
): Promise<Omit<SSLCheckResult, "domainId" | "changed">> => {
  return new Promise((resolve) => {
    const options = {
      host: domain,
      port: 443,
      method: "GET",
      rejectUnauthorized: false, // Allow checking invalid certs
      timeout,
    };

    const req = https.request(options, (res) => {
      const cert = (res.socket as tls.TLSSocket).getPeerCertificate();

      if (!cert || Object.keys(cert).length === 0) {
        resolve({
          domain,
          hasSSL: false,
          isValid: false,
          error: "No certificate found",
        });
        return;
      }

      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);
      const now = new Date();
      const daysUntilExpiry = Math.floor(
        (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const isValid =
        (res.socket as tls.TLSSocket).authorized ||
        (now >= validFrom && now <= validTo);

      resolve({
        domain,
        hasSSL: true,
        isValid,
        issuer: cert.issuer?.O || cert.issuer?.CN || "Unknown",
        validFrom,
        validTo,
        daysUntilExpiry,
      });
    });

    req.on("error", (error) => {
      resolve({
        domain,
        hasSSL: false,
        isValid: false,
        error: error.message,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        domain,
        hasSSL: false,
        isValid: false,
        error: "Connection timeout",
      });
    });

    req.end();
  });
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
      currentStatus.hasSSL !== result.hasSSL ||
      currentStatus.isValid !== result.isValid ||
      currentStatus.issuer !== result.issuer ||
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
      hasSSL: currentStatus.hasSSL,
      isValid: currentStatus.isValid,
      issuer: currentStatus.issuer,
      validFrom: currentStatus.validFrom,
      validTo: currentStatus.validTo,
      daysUntilExpiry: currentStatus.daysUntilExpiry,
      checkedAt: currentStatus.checkedAt,
      lastError: result.error || null,
      lastErrorAt: now,
    };
  } else {
    statusData = {
      hasSSL: result.hasSSL,
      isValid: result.isValid,
      issuer: result.issuer || null,
      validFrom: result.validFrom || null,
      validTo: result.validTo || null,
      daysUntilExpiry: result.daysUntilExpiry ?? null,
      checkedAt: now,
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
      hasSSL: result.hasSSL,
      isValid: result.isValid,
      issuer: result.issuer || null,
      validFrom: result.validFrom || null,
      validTo: result.validTo || null,
      daysUntilExpiry: result.daysUntilExpiry ?? null,
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

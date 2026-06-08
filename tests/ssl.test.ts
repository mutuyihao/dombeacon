import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeTLSSocket extends EventEmitter {
  authorized = true;
  authorizationError = null;
  end = vi.fn();
  destroy = vi.fn();

  getPeerCertificate() {
    return {
      issuer: { O: "Test CA" },
      valid_from: "Jan 01 00:00:00 2020 GMT",
      valid_to: "Jan 01 00:00:00 2099 GMT",
    };
  }
}

describe("checkSSLCertificate()", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  const publicResolver = vi.fn(async (hostname: string) => {
    const addresses: Record<string, string> = {
      "example.com": "93.184.216.34",
      "www.example.com": "93.184.216.35",
    };
    return [
      {
        address: addresses[hostname] || "93.184.216.36",
        family: 4,
      },
    ];
  });

  it("reads the certificate directly after TLS handshake without waiting for HTTP response", async () => {
    const socket = new FakeTLSSocket();
    const connect = vi.fn(() => {
      queueMicrotask(() => socket.emit("secureConnect"));
      return socket;
    });

    vi.doMock("node:tls", () => ({
      default: {
        connect,
        checkServerIdentity: vi.fn(() => undefined),
      },
      checkServerIdentity: vi.fn(() => undefined),
    }));

    const { checkSSLCertificate } = await import("../server/utils/ssl");
    const result = await checkSSLCertificate("https://example.com/path", {
      followRedirects: false,
      timeout: 1000,
      resolveHost: publicResolver,
    });

    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "93.184.216.34",
        servername: "example.com",
        port: 443,
        rejectUnauthorized: false,
      }),
    );
    expect(result).toMatchObject({
      domain: "https://example.com/path",
      checkedHost: "example.com",
      hasSSL: true,
      isValid: true,
      issuer: "Test CA",
    });
    expect(socket.end).toHaveBeenCalled();
  });

  it("falls back to GET redirects to match the browser HTTPS host", async () => {
    const socket = new FakeTLSSocket();
    const connect = vi.fn(() => {
      queueMicrotask(() => socket.emit("secureConnect"));
      return socket;
    });
    const request = vi.fn((options, callback) => {
      const req = new EventEmitter() as EventEmitter & {
        destroy: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };

      req.destroy = vi.fn();
      req.end = vi.fn(() => {
        queueMicrotask(() => {
          const isHead = options.method === "HEAD";
          callback({
            statusCode: isHead ? 405 : 301,
            headers: isHead ? {} : { location: "https://www.example.com/" },
            destroy: vi.fn(),
          });
        });
      });

      return req;
    });

    vi.doMock("node:http", () => ({
      default: { request },
      request,
    }));
    vi.doMock("node:tls", () => ({
      default: {
        connect,
        checkServerIdentity: vi.fn(() => undefined),
      },
      checkServerIdentity: vi.fn(() => undefined),
    }));

    const { checkSSLCertificate } = await import("../server/utils/ssl");
    const result = await checkSSLCertificate("example.com", {
      timeout: 1000,
      redirectTimeout: 1000,
      resolveHost: publicResolver,
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "HEAD",
        hostname: "93.184.216.34",
        headers: expect.objectContaining({ Host: "example.com" }),
      }),
      expect.any(Function),
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        hostname: "93.184.216.34",
        headers: expect.objectContaining({ Host: "example.com" }),
      }),
      expect.any(Function),
    );
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "93.184.216.35",
        servername: "www.example.com",
      }),
    );
    expect(result.checkedHost).toBe("www.example.com");
    expect(result.hasSSL).toBe(true);
  });

  it("blocks direct private IP targets before opening TLS", async () => {
    const connect = vi.fn();

    vi.doMock("node:tls", () => ({
      default: {
        connect,
        checkServerIdentity: vi.fn(() => undefined),
      },
      checkServerIdentity: vi.fn(() => undefined),
    }));

    const { checkSSLCertificate } = await import("../server/utils/ssl");
    const result = await checkSSLCertificate("https://127.0.0.1", {
      followRedirects: false,
      timeout: 1000,
    });

    expect(connect).not.toHaveBeenCalled();
    expect(result.hasSSL).toBe(false);
    expect(result.error).toContain("Blocked non-public address");
  });

  it("blocks public hostnames that resolve to private addresses", async () => {
    const connect = vi.fn();

    vi.doMock("node:tls", () => ({
      default: {
        connect,
        checkServerIdentity: vi.fn(() => undefined),
      },
      checkServerIdentity: vi.fn(() => undefined),
    }));

    const { checkSSLCertificate } = await import("../server/utils/ssl");
    const result = await checkSSLCertificate("example.com", {
      followRedirects: false,
      timeout: 1000,
      resolveHost: vi.fn(async () => [{ address: "10.0.0.5", family: 4 }]),
    });

    expect(connect).not.toHaveBeenCalled();
    expect(result.checkedHost).toBe("example.com");
    expect(result.error).toContain("Blocked non-public address");
  });

  it("blocks redirects to private HTTPS targets before opening TLS", async () => {
    const request = vi.fn((options, callback) => {
      const req = new EventEmitter() as EventEmitter & {
        destroy: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };

      req.destroy = vi.fn();
      req.end = vi.fn(() => {
        queueMicrotask(() => {
          callback({
            statusCode: 301,
            headers: { location: "https://127.0.0.1/admin" },
            destroy: vi.fn(),
          });
        });
      });

      return req;
    });
    const connect = vi.fn();

    vi.doMock("node:http", () => ({
      default: { request },
      request,
    }));
    vi.doMock("node:tls", () => ({
      default: {
        connect,
        checkServerIdentity: vi.fn(() => undefined),
      },
      checkServerIdentity: vi.fn(() => undefined),
    }));

    const { checkSSLCertificate } = await import("../server/utils/ssl");
    const result = await checkSSLCertificate("example.com", {
      timeout: 1000,
      redirectTimeout: 1000,
      resolveHost: publicResolver,
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(connect).not.toHaveBeenCalled();
    expect(result.error).toContain("Blocked non-public address");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isEncryptedSecret,
  maskSecretText,
  parseProtectedJson,
  protectSecretText,
  revealSecretText,
  stringifyProtectedJson,
} from "../server/utils/secrets";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("stored secret helpers", () => {
  it("encrypts and decrypts text when a stable key is configured", () => {
    vi.stubEnv("SECRET_ENCRYPTION_KEY", "test-storage-key");

    const protectedValue = protectSecretText("secret-token");

    expect(isEncryptedSecret(protectedValue)).toBe(true);
    expect(protectedValue).not.toContain("secret-token");
    expect(revealSecretText(protectedValue)).toBe("secret-token");
  });

  it("keeps legacy plaintext readable when no key is configured", () => {
    expect(protectSecretText("legacy-token")).toBe("legacy-token");
    expect(revealSecretText("legacy-token")).toBe("legacy-token");
  });

  it("masks encrypted values after decrypting them", () => {
    vi.stubEnv("SECRET_ENCRYPTION_KEY", "test-storage-key");

    const protectedValue = protectSecretText("SCT1234567890");

    expect(maskSecretText(protectedValue)).toBe("SCT1****7890");
  });

  it("round-trips protected JSON", () => {
    vi.stubEnv("SECRET_ENCRYPTION_KEY", "test-storage-key");

    const protectedValue = stringifyProtectedJson({
      Authorization: "Bearer abc",
    });

    expect(isEncryptedSecret(protectedValue)).toBe(true);
    expect(parseProtectedJson(protectedValue, {})).toEqual({
      Authorization: "Bearer abc",
    });
  });
});

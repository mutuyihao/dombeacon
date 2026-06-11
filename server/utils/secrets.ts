import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const SECRET_PREFIX = "enc:v1:";
const SECRET_SALT = "dombeacon-secret-storage-v1";

const getSecretKeyMaterial = () =>
  (process.env.SECRET_ENCRYPTION_KEY || "").trim();

const getEncryptionKey = () => {
  const material = getSecretKeyMaterial();
  if (!material) return null;
  return createHash("sha256").update(SECRET_SALT).update(material).digest();
};

export const isEncryptedSecret = (value: string | null | undefined) =>
  typeof value === "string" && value.startsWith(SECRET_PREFIX);

export const protectSecretText = (value: string | null | undefined) => {
  if (value === null || value === undefined) return null;
  const text = String(value);
  if (!text || isEncryptedSecret(text)) return text;

  const key = getEncryptionKey();
  if (!key) return text;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${SECRET_PREFIX}${[
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".")}`;
};

export const revealSecretText = (value: string | null | undefined) => {
  if (!value) return "";
  if (!isEncryptedSecret(value)) return String(value);

  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      "A stable SECRET_ENCRYPTION_KEY is required to decrypt stored secrets.",
    );
  }

  const payload = value.slice(SECRET_PREFIX.length);
  const [ivRaw, tagRaw, ciphertextRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error("Stored secret has an invalid encrypted format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

export const maskSecretText = (
  value: string | null | undefined,
  visibleChars = 4,
) => {
  try {
    const plain = revealSecretText(value);
    if (!plain) return "";
    if (plain.length <= visibleChars * 2) return "****";
    return `${plain.slice(0, visibleChars)}****${plain.slice(-visibleChars)}`;
  } catch {
    return "****";
  }
};

export const parseProtectedJson = <T>(
  value: string | null | undefined,
  fallback: T,
): T => {
  try {
    const plain = revealSecretText(value);
    return plain ? JSON.parse(plain) : fallback;
  } catch {
    return fallback;
  }
};

export const stringifyProtectedJson = (value: unknown) =>
  protectSecretText(JSON.stringify(value));

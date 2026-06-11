import { isIP } from "node:net";

export const ipv4ToParts = (address: string) => {
  const parts = address.split(".").map((part) => Number(part));
  return parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : null;
};

export const isBlockedIPv4 = (address: string) => {
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

export const parseIPv6Bytes = (address: string) => {
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

  const groups =
    halves.length === 2
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

export const isBlockedIPv6 = (address: string) => {
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
    (bytes[0] === 0x20 &&
      bytes[1] === 0x01 &&
      bytes[2] === 0x0d &&
      bytes[3] === 0xb8) ||
    (bytes[0] === 0x20 && bytes[1] === 0x01 && (bytes[2] & 0xfe) === 0) ||
    (bytes[0] === 0x20 && bytes[1] === 0x02)
  );
};

export const isBlockedPrivateOrReservedAddress = (address: string) => {
  const family = isIP(address);
  if (family === 4) return isBlockedIPv4(address);
  if (family === 6) return isBlockedIPv6(address);
  return true;
};

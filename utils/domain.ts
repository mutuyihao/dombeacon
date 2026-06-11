export const normalizeDomainInput = (value: unknown) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
};

export const isValidDomainName = (
  value: unknown,
  options?: { allowSingleLabel?: boolean },
) => {
  const domain = normalizeDomainInput(value);
  if (!domain || domain.length > 253 || domain.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2 && !options?.allowSingleLabel) return false;

  return labels.every((label) => {
    return (
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    );
  });
};

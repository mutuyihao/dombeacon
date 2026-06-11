const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

export const getEnvText = (name: string) =>
  String(process.env[name] || "").trim();

export const isTruthyEnvValue = (value: string | undefined | null) =>
  TRUTHY_ENV_VALUES.has(String(value || "").trim().toLowerCase());

export const getBooleanEnv = (name: string, defaultValue = false) => {
  const value = getEnvText(name);
  return value ? isTruthyEnvValue(value) : defaultValue;
};

export const getIntegerEnv = (
  name: string,
  defaultValue: number,
  minValue?: number,
) => {
  const value = Number(process.env[name]);
  const nextValue = Number.isFinite(value)
    ? Math.floor(value)
    : defaultValue;
  return minValue === undefined ? nextValue : Math.max(minValue, nextValue);
};

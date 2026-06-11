export type ClientApiEnvelope<T = unknown> = {
  code: number;
  msg?: string;
  data: T;
};

export const unwrapApiEnvelope = <T = unknown>(
  response: ClientApiEnvelope<T> | null | undefined,
  fallbackMessage = "Request failed",
) => {
  if (!response || response.code !== 0) {
    throw new Error(response?.msg || fallbackMessage);
  }

  return response.data;
};


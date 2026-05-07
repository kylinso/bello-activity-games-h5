export const getRequestErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message || record.msg;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
};

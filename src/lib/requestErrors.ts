import axios from 'axios';
import type { ActivityError } from '@/types/activity';
import { isActivityError } from '@/types/activity';

interface ErrorResponseEnvelope {
  msg?: unknown;
  message?: unknown;
}

const networkError = (): ActivityError => ({
  code: 'NETWORK_ERROR',
  message: 'Network request failed.',
});

export const normalizeRequestError = (error: unknown): ActivityError => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as ErrorResponseEnvelope | undefined;
    const responseMessage = responseData?.msg || responseData?.message;

    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return {
        code: 'UNKNOWN',
        message: responseMessage,
      };
    }

    return networkError();
  }

  if (isActivityError(error)) {
    return error;
  }

  return networkError();
};

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

import { describe, expect, it } from 'vitest';
import { normalizeRequestError } from './requestErrors';

describe('normalizeRequestError', () => {
  it('returns the backend message without retaining the Axios request object', () => {
    const error = {
      code: 'ERR_BAD_REQUEST',
      config: {
        headers: {
          Authorization: 'Bearer secret-token',
        },
      },
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: {
        data: {
          code: 2,
          msg: 'Invalid game result.',
        },
      },
    };

    expect(normalizeRequestError(error)).toEqual({
      code: 'UNKNOWN',
      message: 'Invalid game result.',
    });
  });

  it('preserves a normalized application error', () => {
    const error = {
      code: 'CONFIG_INVALID' as const,
      message: 'Invalid game configuration.',
    };

    expect(normalizeRequestError(error)).toBe(error);
  });

  it('maps an Axios network failure to a safe network error', () => {
    expect(
      normalizeRequestError({
        code: 'ERR_NETWORK',
        config: {
          headers: {
            Authorization: 'Bearer secret-token',
          },
        },
        isAxiosError: true,
        message: 'Network Error',
      }),
    ).toEqual({
      code: 'NETWORK_ERROR',
      message: 'Network request failed.',
    });
  });
});

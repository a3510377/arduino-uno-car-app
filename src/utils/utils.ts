export const retry = async <T>(
  fn: () => T,
  timeout: number = 1000,
  step: number = 250
): Promise<T> => {
  let elapsed = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof RetryNextException) {
        if (elapsed >= timeout) {
          throw new RetryStopException();
        }
        elapsed += step;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, step));
  }
};

export class RetryNextException extends Error {}
export class RetryStopException extends Error {}

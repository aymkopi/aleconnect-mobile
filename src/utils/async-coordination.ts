export function createKeyedSerialExecutor() {
  const tails = new Map<unknown, Promise<void>>();

  return async function runSerially<Result>(
    key: unknown,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    const previous = tails.get(key) ?? Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    tails.set(key, tail);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (tails.get(key) === tail) tails.delete(key);
    }
  };
}

export function createPromiseRegistry<Key, Value>() {
  const requests = new Map<Key, Promise<Value>>();

  return {
    run(key: Key, create: () => Promise<Value>): Promise<Value> {
      const active = requests.get(key);
      if (active) return active;

      const request = create().finally(() => {
        if (requests.get(key) === request) requests.delete(key);
      });
      requests.set(key, request);
      return request;
    },
    clear(key?: Key) {
      if (key === undefined) requests.clear();
      else requests.delete(key);
    },
  };
}

// Crea un archivo test/setup.ts
import { expect } from '@jest/globals';

expect.extend({
  toBeNumberOrNull(received) {
    const pass = typeof received === 'number' || received === null;
    return {
      message: () => `Expected ${received} to be number or null`,
      pass
    };
  }
});

// En el test:
precio: expect.toBeNumberOrNull()

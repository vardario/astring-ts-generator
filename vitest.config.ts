import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    onConsoleLog(log, type) {
      if (type === 'stderr') {
        return false;
      }

      return true;
    }
  }
});

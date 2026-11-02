import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // trash-can으로 옮긴 파일의 테스트가 실행되지 않도록 대상을 lib로 한정한다.
    include: ["lib/**/*.test.ts"],
  },
});

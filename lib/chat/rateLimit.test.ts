import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, MAX_REQUESTS_PER_WINDOW, resetRateLimit } from "./rateLimit";

describe("isRateLimited", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("한도까지는 허용하고 넘으면 막는다", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i += 1) {
      expect(isRateLimited("a", now + i)).toBe(false);
    }
    expect(isRateLimited("a", now + 100)).toBe(true);
  });

  it("호출한 쪽마다 따로 센다", () => {
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW + 1; i += 1) isRateLimited("a", 1000);
    expect(isRateLimited("b", 1000)).toBe(false);
  });

  it("10분이 지나면 다시 허용한다", () => {
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW + 1; i += 1) isRateLimited("a", 1000);
    expect(isRateLimited("a", 1000 + 10 * 60 * 1000 + 1)).toBe(false);
  });
});

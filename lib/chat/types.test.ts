import { describe, expect, it } from "vitest";
import { isInputTooLong, MAX_INPUT_LENGTH } from "./types";

describe("isInputTooLong", () => {
  it("상한은 2,000자다", () => {
    expect(MAX_INPUT_LENGTH).toBe(2000);
  });

  it("2,000자까지는 허용한다", () => {
    expect(isInputTooLong("가".repeat(2000))).toBe(false);
  });

  it("2,001자부터 거절한다", () => {
    expect(isInputTooLong("가".repeat(2001))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

describe("TypeScript test setup", () => {
  it("runs TypeScript tests", () => {
    const message: string = "ready";

    expect(message).toBe("ready");
  });
});

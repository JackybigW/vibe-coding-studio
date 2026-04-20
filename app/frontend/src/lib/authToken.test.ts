import { afterEach, describe, expect, it } from "vitest";

import { buildAuthHeaders } from "./authToken";

describe("buildAuthHeaders", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("adds bearer authorization when localStorage token exists", () => {
    window.localStorage.setItem("token", "test-token");

    expect(buildAuthHeaders()).toEqual({
      Authorization: "Bearer test-token",
    });
  });

  it("returns empty headers when localStorage token is missing", () => {
    expect(buildAuthHeaders()).toEqual({});
  });
});

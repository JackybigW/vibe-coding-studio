import { describe, expect, it } from "vitest";
import { buildPreviewUrl } from "./workspaceRuntime";

describe("buildPreviewUrl", () => {
  it("keeps backend preview paths untouched", () => {
    expect(buildPreviewUrl("/api/v1/workspace-runtime/projects/42/preview/")).toBe(
      "/api/v1/workspace-runtime/projects/42/preview/"
    );
  });
});

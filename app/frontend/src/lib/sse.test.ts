import { describe, expect, it } from "vitest";

import { consumeSseBuffer } from "./sse";

describe("consumeSseBuffer", () => {
  it("parses SSE events separated by CRLF line endings", () => {
    const payload = `event: session\r\ndata: {"type":"session","trace_id":"abc123"}\r\n\r\n`;

    const result = consumeSseBuffer(payload);

    expect(result.rest).toBe("");
    expect(result.events).toEqual([
      {
        event: "session",
        payload: { type: "session", trace_id: "abc123" },
      },
    ]);
  });

  it("keeps incomplete trailing chunks in the buffer", () => {
    const payload = `event: assistant\r\ndata: {"type":"assistant","content":"hi"}`;

    const result = consumeSseBuffer(payload);

    expect(result.events).toEqual([]);
    expect(result.rest).toBe(payload);
  });
});

interface ParsedSseEvent {
  event: string;
  payload: Record<string, unknown>;
}

interface ConsumeSseBufferResult {
  events: ParsedSseEvent[];
  rest: string;
}

const SSE_BOUNDARY = /\r?\n\r?\n/;

export function consumeSseBuffer(buffer: string): ConsumeSseBufferResult {
  const events: ParsedSseEvent[] = [];
  const chunks = buffer.split(SSE_BOUNDARY);
  const rest = chunks.pop() ?? "";

  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/);
    const event = lines.find((line) => line.startsWith("event: "))?.replace(/^event:\s*/, "") ?? "message";
    const data = lines.find((line) => line.startsWith("data: "))?.replace(/^data:\s*/, "");

    if (!data) continue;

    events.push({
      event,
      payload: JSON.parse(data) as Record<string, unknown>,
    });
  }

  return { events, rest };
}

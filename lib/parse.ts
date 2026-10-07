// Pure helpers for reading the model's reply and the SSE stream that carries it.
// These used to live inline in app/page.tsx; they're here so they can be tested
// without a browser or a network.

export interface SseEvent {
  text?: string;
  done?: boolean;
  error?: string;
}

export interface ParsedReply {
  rubric: string;
  body: string;
  citation: string;
}

/**
 * Split an SSE buffer into complete events plus whatever is left over.
 * A network chunk can end mid-event, so the leftover `rest` must be prepended
 * to the next chunk before parsing again.
 */
export function parseSseEvents(buffer: string): { events: SseEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: SseEvent[] = [];

  for (const part of parts) {
    if (!part.startsWith("data: ")) continue;
    events.push(JSON.parse(part.slice(6)) as SseEvent);
  }

  return { events, rest };
}

/**
 * Pull the "RUBRIC: ..." heading off the front of the reply.
 * Returns null until the first line is complete (no newline yet), so the UI can
 * wait instead of flashing a half-written heading.
 */
export function splitRubric(raw: string): { rubric: string; body: string } | null {
  const nl = raw.indexOf("\n");
  if (nl === -1) return null;

  const firstLine = raw.slice(0, nl).trim();
  const rubric = firstLine.startsWith("RUBRIC:") ? firstLine.slice(7).trim() : firstLine;

  return { rubric, body: raw.slice(nl + 1).trimStart() };
}

/** If the last line starts with †, treat it as the citation and remove it from the body. */
export function extractCitation(body: string): { body: string; citation: string } {
  const lines = body.trimEnd().split("\n");
  const lastLine = lines[lines.length - 1].trim();

  if (!lastLine.startsWith("†")) {
    return { body, citation: "" };
  }

  return {
    body: lines.slice(0, -1).join("\n").trimEnd(),
    citation: lastLine.slice(1).trim(),
  };
}

/** Parse a complete reply into rubric, body, and citation. */
export function parseReply(raw: string): ParsedReply {
  const split = splitRubric(raw) ?? { rubric: "", body: raw.trimStart() };
  const { body, citation } = extractCitation(split.body);
  return { rubric: split.rubric, body, citation };
}

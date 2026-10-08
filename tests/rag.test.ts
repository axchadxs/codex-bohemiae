import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before the vi.mock calls below, so these fns exist when the mocks are built.
const mocks = vi.hoisted(() => ({
  searchRecords: vi.fn(),
  create: vi.fn(),
}));

// Replace the real SDKs. No network, no API keys, no cost.
vi.mock("@pinecone-database/pinecone", () => ({
  Pinecone: class {
    index() {
      return { searchRecords: mocks.searchRecords };
    }
  },
}));

vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: mocks.create } };
  },
}));

import { buildContext, streamRagResponse } from "@/lib/rag";

/** Fake Groq stream: an async iterable that yields chunks shaped like the real SDK's. */
async function* fakeGroqStream(pieces: string[], failAfter?: Error) {
  for (const text of pieces) {
    yield { choices: [{ delta: { content: text } }] };
  }
  if (failAfter) throw failAfter;
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return out;
    out += decoder.decode(value, { stream: true });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.searchRecords.mockResolvedValue({
    result: {
      hits: [
        { fields: { text: "Žižka won at Vítkov Hill.", source: "Jan Žižka" } },
        { fields: { text: "Wagons formed a fortress." } },
      ],
    },
  });
});

describe("buildContext", () => {
  it("numbers each source and separates them", () => {
    const context = buildContext([
      { fields: { text: "A text", source: "Article A" } },
      { fields: { text: "B text", source: "Article B" } },
    ]);
    expect(context).toBe("[Source 1 — Article A]\nA text\n\n---\n\n[Source 2 — Article B]\nB text");
  });

  it("falls back to a default label when a hit has no source", () => {
    expect(buildContext([{ fields: { text: "Orphan chunk" } }])).toContain(
      "[Source 1 — Bohemian history]"
    );
  });

  it("returns an empty string when nothing was retrieved", () => {
    expect(buildContext([])).toBe("");
  });
});

describe("streamRagResponse", () => {
  it("retrieves the top 4 chunks and puts them in the prompt sent to the LLM", async () => {
    mocks.create.mockResolvedValue(fakeGroqStream(["hi"]));

    await readAll(await streamRagResponse("Who was Žižka?"));

    expect(mocks.searchRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { topK: 4, inputs: { text: "Who was Žižka?" } },
      })
    );

    const request = mocks.create.mock.calls[0][0];
    expect(request.stream).toBe(true);
    const userMessage = request.messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("[Source 1 — Jan Žižka]");
    expect(userMessage.content).toContain("Wagons formed a fortress.");
    expect(userMessage.content).toContain("Question: Who was Žižka?");
  });

  it("emits each token as an SSE data event, then a done event", async () => {
    mocks.create.mockResolvedValue(fakeGroqStream(["RUBRIC: X\n", "Body."]));

    const output = await readAll(await streamRagResponse("q"));

    expect(output).toBe(
      'data: {"text":"RUBRIC: X\\n"}\n\n' + 'data: {"text":"Body."}\n\n' + 'data: {"done":true}\n\n'
    );
  });

  it("skips chunks that carry no text", async () => {
    mocks.create.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: {} }] };
        yield { choices: [{ delta: { content: "real" } }] };
      })()
    );

    const output = await readAll(await streamRagResponse("q"));

    expect(output).toBe('data: {"text":"real"}\n\n' + 'data: {"done":true}\n\n');
  });

  it("sends an error event (and still closes) if the LLM stream fails midway", async () => {
    mocks.create.mockResolvedValue(fakeGroqStream(["partial"], new Error("rate limited")));

    const output = await readAll(await streamRagResponse("q"));

    expect(output).toContain('data: {"text":"partial"}');
    expect(output).toContain('data: {"error":"rate limited"}');
    expect(output).not.toContain('"done":true');
  });
});

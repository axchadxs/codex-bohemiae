import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ streamRagResponse: vi.fn() }));

vi.mock("@/lib/rag", () => ({ streamRagResponse: mocks.streamRagResponse }));

import { POST } from "@/app/api/chat/route";

function chatRequest(body: unknown) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/chat", () => {
  it.each([
    ["missing question", {}],
    ["empty question", { question: "" }],
    ["whitespace-only question", { question: "   " }],
  ])("returns 400 for a %s without calling the RAG pipeline", async (_label, body) => {
    const res = await POST(chatRequest(body));

    expect(res.status).toBe(400);
    expect(mocks.streamRagResponse).not.toHaveBeenCalled();
  });

  it("streams the RAG response back as text/event-stream", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"done":true}\n\n'));
        controller.close();
      },
    });
    mocks.streamRagResponse.mockResolvedValue(stream);

    const res = await POST(chatRequest({ question: "Who was Žižka?" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(mocks.streamRagResponse).toHaveBeenCalledWith("Who was Žižka?");
    expect(await res.text()).toBe('data: {"done":true}\n\n');
  });
});

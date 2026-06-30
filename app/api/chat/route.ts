import { NextRequest } from "next/server";
import { streamRagResponse } from "@/lib/rag";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const question: string = body?.question ?? "";

  if (!question.trim()) {
    return new Response("question is required", { status: 400 });
  }

  const stream = await streamRagResponse(question);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import KnotworkBorder from "@/components/KnotworkBorder";
import ChatMessage from "@/components/ChatMessage";

type UserMessage = { role: "user"; content: string };
type AssistantMessage = { role: "assistant"; rubric: string; body: string; citation: string };
type Message = UserMessage | AssistantMessage;

interface StreamingState {
  rubric: string;
  body: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMsg, setStreamingMsg] = useState<StreamingState | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMsg?.body]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    setInput("");
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setStreamingMsg({ rubric: "", body: "" });

    let rawBuffer = "";
    let rubricExtracted = false;
    let rubricEndIdx = 0;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        const parts = sseBuffer.split("\n\n");
        sseBuffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload: { text?: string; done?: boolean; error?: string } = JSON.parse(
            part.slice(6)
          );

          if (payload.error) throw new Error(payload.error);
          if (payload.done) break outer;

          if (payload.text) {
            rawBuffer += payload.text;

            if (!rubricExtracted) {
              const nl = rawBuffer.indexOf("\n");
              if (nl !== -1) {
                const firstLine = rawBuffer.slice(0, nl);
                rubricExtracted = true;
                rubricEndIdx = nl + 1;
                const rubric = firstLine.startsWith("RUBRIC:")
                  ? firstLine.slice(7).trim()
                  : firstLine.trim();
                setStreamingMsg({
                  rubric,
                  body: rawBuffer.slice(rubricEndIdx).trimStart(),
                });
              }
              // Don't update UI yet — waiting for rubric line to complete
            } else {
              setStreamingMsg((prev) =>
                prev ? { ...prev, body: rawBuffer.slice(rubricEndIdx).trimStart() } : null
              );
            }
          }
        }
      }

      // Finalize: extract citation from last line
      const rubricLineRaw = rawBuffer.slice(0, rubricEndIdx).trim();
      const rubric = rubricLineRaw.startsWith("RUBRIC:")
        ? rubricLineRaw.slice(7).trim()
        : rubricLineRaw;

      let body = rawBuffer.slice(rubricEndIdx).trimStart();
      let citation = "";

      const lines = body.trimEnd().split("\n");
      const lastLine = lines[lines.length - 1].trim();
      if (lastLine.startsWith("†")) {
        citation = lastLine.slice(1).trim();
        body = lines.slice(0, -1).join("\n").trimEnd();
      }

      setMessages((prev) => [...prev, { role: "assistant", rubric, body, citation }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          rubric: "Erratum",
          body:
            "The Codex is unable to answer at this time. Ensure your API keys are set and Pinecone has been ingested.",
          citation: "",
        },
      ]);
    } finally {
      setStreamingMsg(null);
      setIsLoading(false);
    }
  }

  return (
    <div className="page">
      <KnotworkBorder id="knotwork-top" />

      <header className="header">
        <div className="header-title">
          <span className="header-codex">Codex Bohemiae</span>
          <span className="header-subtitle">
            A Scholarly Guide to Medieval Bohemia, c. 1403
          </span>
        </div>
        <span className="header-chapter">Liber I ✦ Cap. IV</span>
      </header>

      <KnotworkBorder id="knotwork-mid" />

      <main className="content-area">
        <div className="outer-frame">
          <div className="inner-frame">
            <span className="corner-ornament tl">◆</span>
            <span className="corner-ornament tr">◆</span>
            <span className="corner-ornament bl">◆</span>
            <span className="corner-ornament br">◆</span>

            <div className="messages">
              {messages.length === 0 && !streamingMsg && (
                <p className="empty-state">
                  Pose your query to the Codex.
                  <br />
                  It shall consult the sources of Bohemian memory.
                </p>
              )}

              {messages.map((msg, i) => (
                <ChatMessage key={i} {...msg} />
              ))}

              {streamingMsg && (
                <ChatMessage
                  role="assistant"
                  rubric={streamingMsg.rubric}
                  body={streamingMsg.body}
                  citation=""
                  isStreaming
                />
              )}

              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      </main>

      <KnotworkBorder id="knotwork-bot" />

      <form onSubmit={handleSubmit} className="input-bar">
        <input
          className="input-field"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pose your inquiry to the Codex…"
          disabled={isLoading}
          autoComplete="off"
        />
        <button className="consult-button" type="submit" disabled={isLoading}>
          {isLoading ? "…" : "Consult"}
        </button>
      </form>
    </div>
  );
}

import Groq from "groq-sdk";
import { Pinecone } from "@pinecone-database/pinecone";

const SYSTEM_PROMPT = `You are the Codex Bohemiae — a scholarly narrator of medieval Bohemian history, c. 1403. You speak with authority and vivid precision, grounded strictly in the retrieved sources provided. You are a reference work given voice, not a character in a roleplay.

Format your response EXACTLY as follows, with no deviation:

RUBRIC: [A short Latin-style heading for this topic, 5–8 words, e.g. "De Bello Hussitarum · Caput Primum"]

[Your scholarly response: 2–4 paragraphs of authoritative prose. Begin with a capital letter. Write in the manner of a learned medieval chronicle. Use no markdown, no headers, no bullet points — plain prose only.]

† [A single citation: Author, Title, c. Year — drawn from the retrieved sources or the most relevant real historical work on this topic]

Do not add any text before RUBRIC: or after the † citation line.`;

/** Format retrieved Pinecone hits into the numbered context block sent to the LLM. */
export function buildContext(hits: { fields: unknown }[]): string {
  return hits
    .map((hit, i) => {
      const f = hit.fields as Record<string, string>;
      return `[Source ${i + 1} — ${f.source ?? "Bohemian history"}]\n${f.text ?? ""}`;
    })
    .join("\n\n---\n\n");
}

export async function streamRagResponse(question: string): Promise<ReadableStream<Uint8Array>> {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index({ name: process.env.PINECONE_INDEX! });

  const searchResponse = await index.searchRecords({
    query: {
      topK: 4,
      inputs: { text: question },
    },
    fields: ["text", "source"],
  });

  const context = buildContext(searchResponse.result.hits);

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const groqStream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    stream: true,
    temperature: 0.4,
    max_tokens: 800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Retrieved sources:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        for await (const chunk of groqStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) send({ text });
        }
        send({ done: true });
      } catch (err) {
        send({ error: err instanceof Error ? err.message : "Stream error" });
      } finally {
        controller.close();
      }
    },
  });
}

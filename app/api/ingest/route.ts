import { ingestArticles } from "@/lib/ingest";

export async function POST() {
  try {
    const result = await ingestArticles();
    return Response.json(result);
  } catch (err) {
    console.error("[ingest route]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Ingest failed" },
      { status: 500 }
    );
  }
}

import wiki from "wikipedia";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Pinecone } from "@pinecone-database/pinecone";

const ARTICLES = [
  "Hussite Wars",
  "Jan Žižka",
  "Wenceslaus IV of Bohemia",
  "Sigismund, Holy Roman Emperor",
  "Battle of Vítkov Hill",
  "Wagenburg",
];

const BATCH_SIZE = 96;

export async function ingestArticles() {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const indexName = process.env.PINECONE_INDEX!;

  // Create the integrated-inference index if it doesn't already exist.
  // suppressConflicts makes this safe to call on repeat runs.
  console.log("[ingest] Ensuring index exists…");
  await pinecone.createIndexForModel({
    name: indexName,
    cloud: process.env.PINECONE_CLOUD ?? "aws",
    region: process.env.PINECONE_REGION ?? "us-east-1",
    embed: {
      model: "llama-text-embed-v2",
      fieldMap: { text: "text" },
    },
    suppressConflicts: true,
    waitUntilReady: true,
  });

  const index = pinecone.index({ name: indexName });

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });

  let totalChunks = 0;

  for (const title of ARTICLES) {
    console.log(`[ingest] Loading: ${title}`);
    const page = await wiki.page(title, { autoSuggest: false });
    const content = await page.content();
    const chunks = await splitter.splitText(content);
    console.log(`[ingest]   → ${chunks.length} chunks`);

    const records = chunks.map((text, i) => ({
      _id: `${title.replace(/\W+/g, "-").toLowerCase()}-${i}`,
      text,
      source: title,
    }));

    for (let j = 0; j < records.length; j += BATCH_SIZE) {
      await index.upsertRecords({ records: records.slice(j, j + BATCH_SIZE) });
    }

    totalChunks += chunks.length;
    console.log(`[ingest]   ✓ Upserted ${records.length} records`);
  }

  console.log(`[ingest] Done — ${totalChunks} total chunks across ${ARTICLES.length} articles`);
  return { ok: true, articles: ARTICLES.length, chunks: totalChunks };
}

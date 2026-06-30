---
# Codex Bohemiae

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-00B388?style=flat-square&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

> *A scholarly guide to medieval Bohemia, c. 1403*

A RAG chatbot that answers questions about the world of **Kingdom Come: Deliverance 2** — grounded in real history. Ask about Jan Žižka, the Hussite Wars, Wenceslaus IV, or Wagenburg tactics and receive a response in the voice of an illuminated manuscript, sourced from Wikipedia and cited like a medieval chronicle.

---

## Features

- **Illuminated manuscript UI** — parchment palette, SVG knotwork borders, historiated drop-cap initials, Cinzel + IM Fell English typography
- **Real-time streaming** — responses stream token by token via Groq's SSE API
- **RAG pipeline** — user query → Pinecone vector search → retrieved context → Groq generation
- **Integrated embeddings** — Pinecone handles embedding automatically via `llama-text-embed-v2`; no separate embeddings service needed
- **Manuscript citations** — every response ends with a `†` footnote citing the source

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| LLM | Groq — `llama-3.3-70b-versatile` |
| Vector DB | Pinecone (integrated inference) |
| Embedding model | `llama-text-embed-v2` (hosted by Pinecone) |
| Text splitting | LangChain `RecursiveCharacterTextSplitter` |
| Data source | Wikipedia |
| Fonts | Cinzel + IM Fell English (Google Fonts) |
| Deployment | Vercel |

## How It Works

User question
     │
     ▼
Pinecone searchRecords()          ← query embedded by llama-text-embed-v2
     │
     ▼
Top-4 chunks injected into prompt
     │
     ▼
Groq streams response             ← llama-3.3-70b-versatile
     │
     ▼
Client parses RUBRIC / body / † citation from stream
     │
     ▼
Rendered as illuminated manuscript entry

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-username/codex-bohemiae
cd codex-bohemiae
npm install --legacy-peer-deps

2. Environment variables

Create a .env.local file:

env
GROQ_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=codex-bohemiae
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

3. Ingest the knowledge base

Start the dev server, then run the one-time ingestion (pulls 6 Wikipedia articles on Bohemian history, chunks and upserts them to Pinecone):

npm run dev

curl -X POST http://localhost:3000/api/ingest

The Pinecone index is created automatically if it doesn't exist. Ingestion takes ~10 seconds.

4. Consult the Codex

Open http://localhost:3000 and ask your question.

Knowledge Base

The following Wikipedia articles are ingested by default:

- Hussite Wars
- Jan Žižka
- Wenceslaus IV of Bohemia
- Sigismund, Holy Roman Emperor
- Battle of Vítkov Hill
- Wagenburg

Deploy to Vercel

Deploy with Vercel (https://vercel.com/button) (https://vercel.com/new)

Add the five environment variables in your Vercel project settings, deploy, then hit /api/ingest once via curl or Postman to populate the index.
```

import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_HOST = process.env.PINECONE_HOST;

if (!PINECONE_API_KEY) {
  console.error("Pinecone API key not set.");
  process.exit(1);
}

if (!PINECONE_HOST) {
  console.error("Pinecone host key not set.");
  process.exit(1);
}

const pc = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

const pinecone = pc.index("default", PINECONE_HOST);

export default pinecone;

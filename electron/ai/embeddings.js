const OpenAI = require("openai");

// Lazy-load client to ensure environment variables are loaded first
let client = null;

function getClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return client;
}

async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  try {
    const openaiClient = getClient();
    const res = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: text.trim()
    });

    if (!res.data || !res.data[0] || !res.data[0].embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    return res.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}

module.exports = { generateEmbedding };


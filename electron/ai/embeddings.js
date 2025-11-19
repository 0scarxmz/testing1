const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  try {
    const res = await client.embeddings.create({
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


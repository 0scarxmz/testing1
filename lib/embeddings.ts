/**
 * Embedding generation and vector similarity functions
 * Uses OpenAI text-embedding-3-small model (1536 dimensions)
 */

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Check if OpenAI API key is available for generating embeddings
 * @returns true if API key is set, false otherwise
 */
export function isEmbeddingAvailable(): boolean {
  return !!OPENAI_API_KEY;
}

/**
 * Get or create OpenAI client instance
 * Initialized lazily to avoid errors when API key is not set
 */
function getOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  return new OpenAI({
    apiKey: OPENAI_API_KEY,
  });
}

/**
 * Generate embedding for text using OpenAI API
 * @param text - Text to generate embedding for
 * @returns 1536-dimensional float array
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim(),
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    return response.data[0].embedding;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Cosine similarity score (0-1, where 1 is most similar)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

console.log('API Key check:', OPENAI_API_KEY ? 'Found' : 'Missing');

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
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

async function generateNoteTitle(content) {
  if (!content || content.trim().length === 0) {
    return "untitled";
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set, returning default title');
    return "untitled";
  }

  try {
    const openaiClient = getClient();
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates casual, informal note titles. Return ONLY the title, nothing else."
        },
        {
          role: "user",
          content: `create a casual lowercase human-style title (max 6 words) for this note: ${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 20
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    let title = response.choices[0].message.content.trim();
    
    // Ensure lowercase and clean up
    title = title.toLowerCase();
    // Remove any quotes if present
    title = title.replace(/^["']|["']$/g, '');
    // Remove any trailing punctuation that might have been added
    title = title.replace(/[.,;:!?]+$/, '');
    
    // Fallback if empty
    if (!title || title.length === 0) {
      return "untitled";
    }

    return title;
  } catch (error) {
    console.error('Failed to generate title:', error);
    return "untitled";
  }
}

module.exports = { generateNoteTitle };


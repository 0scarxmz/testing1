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

async function generateNoteTags(content) {
  if (!content || content.trim().length === 0) {
    return [];
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set, returning empty tags');
    return [];
  }

  try {
    const openaiClient = getClient();
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts tags from notes. Return ONLY a JSON array of tags, nothing else. Example: [\"ai\", \"coding\", \"learning\"]"
        },
        {
          role: "user",
          content: `extract 3-7 simple lowercase tags describing this note. no spaces, use hyphens if needed. return ONLY a JSON array.\n\nNote content:\n${content}`
        }
      ],
      temperature: 0.5,
      max_tokens: 100
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    let responseText = response.choices[0].message.content.trim();
    
    // Try to parse as JSON array
    let tags = [];
    try {
      // Remove any markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try parsing as JSON array directly
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        tags = parsed;
      } else if (parsed.tags && Array.isArray(parsed.tags)) {
        // In case model returns {"tags": [...]}
        tags = parsed.tags;
      } else if (typeof parsed === 'object') {
        // Try to find any array value
        const values = Object.values(parsed);
        const arrayValue = values.find(v => Array.isArray(v));
        if (arrayValue) {
          tags = arrayValue;
        }
      }
    } catch (e) {
      // If JSON parsing fails, try to extract array from text
      // Look for array-like pattern: ["tag1", "tag2"]
      const arrayMatch = responseText.match(/\[(.*?)\]/);
      if (arrayMatch) {
        try {
          tags = JSON.parse(arrayMatch[0]);
        } catch (e2) {
          // Last resort: split by comma and clean
          const parts = arrayMatch[1].split(',').map(s => s.trim().replace(/["']/g, ''));
          tags = parts.filter(t => t.length > 0);
        }
      }
    }

    // Clean and validate tags
    tags = tags
      .map(tag => {
        if (typeof tag !== 'string') return null;
        // Ensure lowercase, no spaces, use hyphens
        tag = tag.toLowerCase().trim();
        tag = tag.replace(/\s+/g, '-');
        tag = tag.replace(/[^a-z0-9-]/g, '');
        return tag.length > 0 ? tag : null;
      })
      .filter(tag => tag !== null && tag.length > 0);

    // Ensure 3-7 tags
    if (tags.length < 3) {
      // If we have fewer than 3, return what we have
      return tags;
    }
    if (tags.length > 7) {
      // Take first 7
      return tags.slice(0, 7);
    }

    return tags;
  } catch (error) {
    console.error('Failed to generate tags:', error);
    return [];
  }
}

module.exports = { generateNoteTags };


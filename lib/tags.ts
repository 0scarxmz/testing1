/**
 * Simple tag extraction from note content
 * Extracts hashtags (#tag) and common keywords
 */
export function extractTags(content: string): string[] {
  const tags = new Set<string>();

  // Extract hashtags
  const hashtagRegex = /#(\w+)/g;
  let match;
  while ((match = hashtagRegex.exec(content)) !== null) {
    tags.add(match[1].toLowerCase());
  }

  // Extract common keywords (simple approach - can be enhanced with AI later)
  const words = content
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .filter((word) => !isCommonWord(word));

  // Add words that appear multiple times as potential tags
  const wordCounts = new Map<string, number>();
  words.forEach((word) => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  wordCounts.forEach((count, word) => {
    if (count >= 2) {
      tags.add(word);
    }
  });

  return Array.from(tags).slice(0, 10); // Limit to 10 tags
}

function isCommonWord(word: string): boolean {
  const commonWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
    'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
    'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
    'did', 'has', 'let', 'put', 'say', 'she', 'too', 'use', 'that', 'this',
    'with', 'from', 'have', 'been', 'will', 'your', 'what', 'when', 'where',
  ];
  return commonWords.includes(word);
}


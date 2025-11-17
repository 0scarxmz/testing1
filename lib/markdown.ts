import TurndownService from 'turndown';
import { marked } from 'marked';

// Convert HTML to Markdown
export function htmlToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });
  return turndownService.turndown(html);
}

// Convert Markdown to HTML
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}

// Detect if content is HTML (old format) and convert to Markdown if needed
export function normalizeToMarkdown(content: string): string {
  if (!content) return '';
  
  // Check if content looks like HTML (has HTML tags)
  const htmlTagPattern = /<[^>]+>/;
  if (htmlTagPattern.test(content)) {
    // It's HTML, convert to Markdown
    return htmlToMarkdown(content);
  }
  
  // Already Markdown or plain text
  return content;
}

// Convert content to HTML for display (handles both Markdown and HTML)
export function contentToHtml(content: string): string {
  if (!content) return '';
  
  // Check if content looks like HTML (has HTML tags)
  const htmlTagPattern = /<[^>]+>/;
  if (htmlTagPattern.test(content)) {
    // It's already HTML
    return content;
  }
  
  // It's Markdown, convert to HTML
  return markdownToHtml(content);
}


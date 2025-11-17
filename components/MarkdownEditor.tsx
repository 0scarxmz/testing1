'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { htmlToMarkdown, contentToHtml, normalizeToMarkdown } from '@/lib/markdown';

interface MarkdownEditorProps {
  content: string; // Can be Markdown or HTML (for backward compatibility)
  onChange: (content: string) => void; // Always receives Markdown format
  placeholder?: string;
}

export function MarkdownEditor({ content, onChange, placeholder = 'Start writing...' }: MarkdownEditorProps) {
  // Normalize content to Markdown (convert HTML if needed)
  const markdownContent = normalizeToMarkdown(content);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: markdownContent ? contentToHtml(markdownContent) : '',
    editable: true,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Convert HTML from TipTap to Markdown before saving
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor) {
      // Normalize to Markdown first (handles old HTML content)
      const normalized = normalizeToMarkdown(content);
      // Convert to HTML for TipTap to display
      const html = contentToHtml(normalized);
      if (html !== editor.getHTML()) {
        editor.commands.setContent(html);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="min-h-[400px] border rounded-md p-4">Loading editor...</div>;
  }

  return (
    <div className="border rounded-md">
      <EditorContent editor={editor} />
    </div>
  );
}


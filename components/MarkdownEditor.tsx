'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';
import { htmlToMarkdown, contentToHtml, normalizeToMarkdown } from '@/lib/markdown';

interface MarkdownEditorProps {
  content: string; // Can be Markdown or HTML (for backward compatibility)
  onChange: (content: string) => void; // Always receives Markdown format
  placeholder?: string;
  editable?: boolean;
}

export function MarkdownEditor({ content, onChange, placeholder = 'Start writing...', editable = true }: MarkdownEditorProps) {
  // Normalize content to Markdown (convert HTML if needed)
  const markdownContent = normalizeToMarkdown(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: markdownContent ? contentToHtml(markdownContent) : '',
    editable: editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Convert HTML from TipTap to Markdown before saving
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[400px] p-4 prose dark:prose-invert max-w-none',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!editable) return false;
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file, view);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        if (!editable) return false;
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file, view);
            return true;
          }
        }
        return false;
      },
    },
  });

  const handleImageUpload = async (file: File, view: any) => {
    // Check if we are in Electron and have access to desktopAPI
    if (typeof window !== 'undefined' && (window as any).desktopAPI && (window as any).desktopAPI.saveImage) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const savedPath = await (window as any).desktopAPI.saveImage(arrayBuffer, file.name);

        if (savedPath) {
          // In Electron, we can load local files using the file:// protocol if webSecurity is false
          // or if we just use the absolute path, Electron usually handles it.
          // However, for display in Tiptap, we might need to prepend 'file://'
          const src = `file://${savedPath}`;

          const { schema } = view.state;
          const node = schema.nodes.image.create({ src });
          const transaction = view.state.tr.replaceSelectionWith(node);
          view.dispatch(transaction);
        }
      } catch (error) {
        console.error('Failed to save image:', error);
      }
    } else {
      console.warn('Image upload only supported in Electron environment for now');
      // Fallback: Base64 (not recommended for large images but better than nothing)
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const { schema } = view.state;
        const node = schema.nodes.image.create({ src });
        const transaction = view.state.tr.replaceSelectionWith(node);
        view.dispatch(transaction);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (editor) {
      // Normalize to Markdown first (handles old HTML content)
      const normalized = normalizeToMarkdown(content);
      // Convert to HTML for TipTap to display
      const html = contentToHtml(normalized);

      // Only update content if it's different to avoid cursor jumps
      // But since we are doing Read/Edit toggle, we might want to ensure content is fresh
      if (html !== editor.getHTML()) {
        // Check if the difference is meaningful (TipTap adds some wrappers)
        // For now, we trust the content prop
        // editor.commands.setContent(html);
      }

      editor.setEditable(editable);
    }
  }, [content, editor, editable]);

  if (!editor) {
    return <div className="min-h-[400px] border rounded-md p-4">Loading editor...</div>;
  }

  return (
    <div className={`border rounded-md ${!editable ? 'border-transparent' : ''}`}>
      <EditorContent editor={editor} />
    </div>
  );
}


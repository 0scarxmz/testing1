import { NotePageClient } from './NotePageClient';

// Required for static export with dynamic routes
// Return at least one param for the 'new' route, other routes handled client-side
export async function generateStaticParams() {
  return [{ id: 'new' }];
}

// Server component wrapper that exports generateStaticParams
export default function NotePage() {
  return <NotePageClient />;
}

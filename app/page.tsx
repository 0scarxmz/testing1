import { NoteList } from '@/components/NoteList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Notes</h1>
          <Link href="/notes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Note
            </Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto">
        <NoteList />
      </main>
    </div>
  );
}

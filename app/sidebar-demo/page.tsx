import { NotionSidebar } from '@/components/NotionSidebar';

export default function SidebarDemoPage() {
    return (
        <div className="flex h-screen w-full bg-background">
            <NotionSidebar />
            <div className="flex-1 p-10">
                <h1 className="text-3xl font-bold mb-4">Sidebar Demo</h1>
                <p className="text-muted-foreground">
                    This page demonstrates the Notion-style sidebar component.
                </p>
                <div className="mt-8 p-4 border rounded-lg bg-muted/20">
                    <p>Check the sidebar on the left for the hierarchical structure.</p>
                </div>
            </div>
        </div>
    );
}

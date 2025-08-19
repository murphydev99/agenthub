import { useState } from 'react';
import { Search, FileText, Plus } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <aside className="w-64 border-r bg-card p-4 flex flex-col">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Button className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="mt-6 flex-1 overflow-auto">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Recent Workflows</h3>
        <div className="space-y-1">
          {/* Workflow list will go here */}
          <div className="p-2 hover:bg-accent rounded cursor-pointer">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Sample Workflow</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
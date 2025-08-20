import { useState } from 'react';
import { Menu, X, Search, FileText, Plus } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      {/* Hamburger Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Background overlay */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sidebar panel */}
          <aside className="fixed left-0 top-0 h-full w-64 bg-card p-4 flex flex-col shadow-xl">
            {/* Close button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
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
                <div className="p-2 hover:bg-accent rounded cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Sample Workflow</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
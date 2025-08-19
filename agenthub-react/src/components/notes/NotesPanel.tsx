import { useState } from 'react';
import { Button } from '../ui/button';
import { Copy, Check } from 'lucide-react';

interface NotesPanelProps {
  notes: string;
}

export function NotesPanel({ notes }: NotesPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy notes:', error);
    }
  };

  if (!notes) return null;

  return (
    <div className="border-b-2 border-teal-600 bg-gradient-to-r from-teal-700 to-cyan-700 text-white p-4 shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-2 text-teal-100">📝 Notes</h3>
          <pre className="text-sm whitespace-pre-wrap font-mono bg-black/20 p-2 rounded">{notes}</pre>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="ml-4 text-white hover:text-white hover:bg-white/20"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Button } from '../../ui/button';
import { Copy, Check } from 'lucide-react';
import { useVariableStore } from '../../../store/variableStore';

interface NotesBlockProps {
  row: any;
}

export function NotesBlock({ row }: NotesBlockProps) {
  const { interpolateText } = useVariableStore();
  const [copied, setCopied] = useState(false);
  
  const { step } = row;
  
  // Interpolate variables in the notes template
  const notesText = interpolateText(step.NotesTemplate || step.Prompt || '');
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };
  
  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg p-4 border-2 border-gray-600 shadow-xl">
      <div className="flex items-start justify-between">
        <pre className="flex-1 text-sm whitespace-pre-wrap font-mono bg-black/30 p-3 rounded">
          {notesText}
        </pre>
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
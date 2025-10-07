import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useVariableStore } from '../../../store/variableStore';
import { cn } from '../../../lib/utils';

interface UserInstructionProps {
  row: any;
  light?: boolean;
}

export function UserInstruction({ row, light = false }: UserInstructionProps) {
  const { interpolateText } = useVariableStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const { step } = row;
  const hasSecondaryText = step.SecondaryText && step.SecondaryText.trim() !== '';

  // Interpolate variables in the text
  const primaryText = interpolateText(step.Prompt || '');
  const secondaryText = hasSecondaryText ? interpolateText(step.SecondaryText) : '';

  // Check if this is an error/alert message (contains red color or warning symbols)
  const isAlert = primaryText.toLowerCase().includes('color=\'red\'') ||
                  primaryText.toLowerCase().includes('color="red"') ||
                  primaryText.includes('&#10071;') ||
                  primaryText.toLowerCase().includes('not found') ||
                  primaryText.toLowerCase().includes('error');

  // Parse HTML content (React will escape by default, so we need to be careful)
  // For now, we'll use dangerouslySetInnerHTML with sanitization in production
  const renderHtml = (html: string) => {
    // In production, use a library like DOMPurify to sanitize HTML
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const baseClasses = isAlert
    ? "bg-gradient-to-r from-red-50 to-rose-50 border-2 border-[#E94B4B] text-gray-800 shadow-lg"
    : light
    ? "bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 text-gray-800"
    : "bg-[#0B2545] text-white shadow-lg border-2 border-[#0B2545]";
  
  if (!hasSecondaryText) {
    return (
      <div className={cn("rounded-lg border p-4", baseClasses)}>
        <div className="prose prose-sm max-w-none">
          {renderHtml(primaryText)}
        </div>
      </div>
    );
  }
  
  // Accordion layout for secondary text
  return (
    <div className={cn("rounded-lg border overflow-hidden", baseClasses)}>
      <button
        className="w-full p-4 text-left flex items-start justify-between hover:bg-opacity-90 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 prose prose-sm max-w-none">
          {renderHtml(primaryText)}
        </div>
        <div className="ml-4 mt-1">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className={cn(
          "px-4 pb-4 prose prose-sm max-w-none",
          light ? "border-t-2 border-orange-200" : "border-t border-white/20"
        )}>
          {renderHtml(secondaryText)}
        </div>
      )}
    </div>
  );
}
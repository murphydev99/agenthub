import { UserInstruction } from './steps/UserInstruction';
import { Question } from './steps/Question';
import { Collect } from './steps/Collect';
import { NotesBlock } from './steps/NotesBlock';

interface WorkflowRow {
  id: string;
  step: any;
  parentButtonGUID?: string;
  workflowName: string;
  answered?: boolean;
  selectedAnswerGUID?: string;
  visible: boolean;
}

interface StepRendererProps {
  row: WorkflowRow;
}

export function StepRenderer({ row }: StepRendererProps) {
  if (!row.visible) return null;

  const stepType = row.step.StepType?.toLowerCase();

  switch (stepType) {
    case 'userinstruction':
      return <UserInstruction row={row} />;
    
    case 'userinstruction-light':
      return <UserInstruction row={row} light />;
    
    case 'question':
      return <Question row={row} />;
    
    case 'collect':
      return <Collect row={row} />;
    
    case 'notesblock':
      return <NotesBlock row={row} />;
    
    case 'variableassignment':
      // Variable assignments don't render UI
      return null;
    
    case 'loadworkflow':
      // Sub-workflow loading is handled by the store
      return null;
    
    default:
      console.warn(`Unknown step type: ${stepType}`);
      return (
        <div className="p-4 border rounded bg-yellow-50 text-yellow-800">
          Unknown step type: {stepType}
        </div>
      );
  }
}
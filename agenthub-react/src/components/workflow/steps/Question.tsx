import { useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { useWorkflowStore } from '../../../store/workflowStore';
import { useVariableStore, VariableType } from '../../../store/variableStore';
import { cn } from '../../../lib/utils';
import { ExecuteCommandProcessor } from '../../../services/executeCommands';
import { EvaluateFormulaProcessor } from '../../../services/evaluateFormulas';

interface QuestionProps {
  row: any;
}

export function Question({ row }: QuestionProps) {
  const { answerQuestion } = useWorkflowStore();
  const { interpolateText, evaluateExpression, setVariable } = useVariableStore();
  const [autoAnswered, setAutoAnswered] = useState(false);
  
  const { step, answered, selectedAnswerGUID } = row;
  const answers = step.Answers || [];
  
  // Interpolate question prompt
  const prompt = interpolateText(step.Prompt || '');
  
  // Process answers for auto-evaluation and visibility
  const processedAnswers = answers.map((answer: any) => {
    let shouldShow = true;
    let shouldAutoAnswer = false;
    
    if (answer.Evaluate) {
      const evalResult = EvaluateFormulaProcessor.evaluateFormula(answer.Evaluate);
      
      // Log evaluation details
      console.log(`[Question: ${step.Prompt?.substring(0, 50)}...] Answer: "${answer.Prompt}"`);
      console.log(`  Evaluate: ${answer.Evaluate}`);
      console.log(`  Result: ${evalResult}`);
      console.log(`  HideIfEvaluateTrue: ${answer.HideIfEvaluateTrue} (configured value)`);
      
      if (evalResult === 'true') {
        // Check HideIfEvaluateTrue (case-insensitive)
        const hideIfTrue = answer.HideIfEvaluateTrue && 
          (typeof answer.HideIfEvaluateTrue === 'boolean' ? 
            answer.HideIfEvaluateTrue : 
            answer.HideIfEvaluateTrue.toString().toLowerCase() === 'true');
        
        if (hideIfTrue) {
          console.log(`  → Will HIDE answer and AUTO-ANSWER (HideIfEvaluateTrue=true)`);
          shouldShow = false;
          shouldAutoAnswer = true; // Auto-answer when hidden due to evaluation
        } else {
          // If evaluation is true but not hiding, still auto-answer
          console.log(`  → Will AUTO-ANSWER but keep visible (HideIfEvaluateTrue=false/undefined)`);
          shouldAutoAnswer = true;
        }
      } else {
        console.log(`  → No action (evaluation was ${evalResult})`);
      }
    }
    
    return {
      ...answer,
      shouldShow,
      shouldAutoAnswer,
      text: interpolateText(answer.Prompt || answer.AnswerText || ''),
    };
  });
  
  // Check if this question should be hidden because it will auto-answer
  const willAutoAnswer = processedAnswers.some((a: any) => a.shouldAutoAnswer);

  // Auto-answer if conditions are met
  useEffect(() => {
    if (!answered && !autoAnswered) {
      const autoAnswer = processedAnswers.find((a: any) => a.shouldAutoAnswer);
      if (autoAnswer) {
        console.log('Auto-answering question with:', autoAnswer);
        handleAnswer(autoAnswer.GUID, autoAnswer);
        setAutoAnswered(true);
      }
    }
  }, [answered, autoAnswered]);
  
  const handleAnswer = async (answerId: string, answer: any) => {
    // Allow changing answer if it's the same question
    // Only prevent if we've already processed substeps
    if (answered && selectedAnswerGUID !== answerId) {
      // If changing answer, we need to handle this differently
      // For now, allow changing before substeps are processed
    }
    
    // Set variable if specified
    if (answer.VariableName && answer.VariableValue !== undefined) {
      setVariable(
        answer.VariableName,
        answer.VariableValue,
        VariableType.WorkflowVariable
      );
    }
    
    // Execute any commands if specified
    if (answer.Execute) {
      // Check if this is an end command that should stop further processing
      const executeCmd = answer.Execute.toLowerCase();
      const isEndCommand = executeCmd.includes('endinteraction') || 
                           executeCmd.includes('dispositioncall');
      
      if (isEndCommand) {
        // For end commands, execute them but don't process the answer
        // This prevents the workflow from continuing
        console.log('Executing end command:', answer.Execute);
        ExecuteCommandProcessor.processExecute(answer.Execute);
        // Don't call answerQuestion - this prevents workflow continuation
        return;
      } else {
        ExecuteCommandProcessor.processExecute(answer.Execute);
      }
    }
    
    // Process answer in workflow store
    answerQuestion(row.id, answerId);
  };
  
  // Filter visible answers
  const visibleAnswers = processedAnswers.filter((a: any) => a.shouldShow);
  
  // If any answer has HideIfEvaluateTrue=true and evaluates to true, 
  // hide the entire question (it auto-answers invisibly)
  const hasHiddenAutoAnswer = processedAnswers.some((a: any) => 
    a.shouldAutoAnswer && !a.shouldShow
  );
  
  if (hasHiddenAutoAnswer) {
    return null; // Don't show the question at all
  }
  
  // Determine button layout based on total text length and screen size
  const totalTextLength = visibleAnswers.reduce((sum: number, a: any) => sum + a.text.length, 0);
  const averageLength = totalTextLength / visibleAnswers.length;
  const maxLength = Math.max(...visibleAnswers.map((a: any) => a.text.length));
  
  // Check if we're on a mobile device (simple check based on window width)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
  // Use horizontal layout if:
  // - 5 or fewer answers with max length < 20 chars (like satisfaction scale), OR
  // - 3 or fewer answers regardless of text length, OR
  // - 4 answers with average < 25 chars, OR
  // - All answers are short (< 15 chars each)
  // BUT force vertical on mobile if any answer is longer than 15 chars
  const buttonLayout = 
    !isMobile && (
      (visibleAnswers.length <= 5 && maxLength < 20) ||
      visibleAnswers.length <= 3 ||
      (visibleAnswers.length <= 4 && averageLength < 25) ||
      visibleAnswers.every((a: any) => a.text.length < 15)
    ) && maxLength < 30  // Force vertical if any answer is very long
      ? 'horizontal' 
      : 'vertical';
  
  return (
    <div className="space-y-3">
      {prompt && (
        <div className="text-sm font-medium text-gray-700">
          <div dangerouslySetInnerHTML={{ __html: prompt }} />
        </div>
      )}
      
      <div className={cn(
        "gap-2",
        buttonLayout === 'horizontal' ? 'flex flex-row flex-wrap' : 'flex flex-col w-full'
      )}>
        {visibleAnswers.map((answer: any, index: number) => {
          const isSelected = selectedAnswerGUID === answer.GUID;
          
          // Determine button color based on text content and position
          const buttonText = answer.text.toLowerCase();
          const isYes = buttonText.includes('yes') || buttonText.includes('correct') || buttonText.includes('very satisfied');
          const isNo = buttonText.includes('no') || buttonText.includes('incorrect') || buttonText.includes('very dissatisfied');
          const isSatisfied = buttonText.includes('satisfied') && !buttonText.includes('dissatisfied');
          const isNeutral = buttonText.includes('neutral');
          const isDissatisfied = buttonText.includes('dissatisfied');
          
          // Color gradients for different button types
          const getButtonStyle = () => {
            if (isSelected) {
              if (isYes || (isSatisfied && !buttonText.includes('dis'))) 
                return 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-green-600';
              if (isNo || isDissatisfied) 
                return 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white border-red-600';
              if (isNeutral) 
                return 'bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white border-gray-600';
              return 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-blue-600';
            }
            
            // Unselected state with hover effects
            if (isYes || (isSatisfied && !buttonText.includes('dis'))) 
              return 'border-2 border-green-300 hover:border-green-500 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:shadow-md transition-all';
            if (isNo || isDissatisfied) 
              return 'border-2 border-red-300 hover:border-red-500 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:shadow-md transition-all';
            if (isNeutral) 
              return 'border-2 border-gray-300 hover:border-gray-500 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 hover:shadow-md transition-all';
            
            // Default colors for other buttons
            const colors = [
              'border-2 border-purple-300 hover:border-purple-500 hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50',
              'border-2 border-blue-300 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50',
              'border-2 border-amber-300 hover:border-amber-500 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50',
              'border-2 border-teal-300 hover:border-teal-500 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50',
            ];
            return colors[index % colors.length] + ' hover:shadow-md transition-all';
          };
          
          return (
            <Button
              key={answer.GUID}
              onClick={() => handleAnswer(answer.GUID, answer)}
              disabled={false}
              variant="ghost"
              className={cn(
                buttonLayout === 'horizontal' 
                  ? 'flex-1 min-w-0 sm:min-w-[100px] max-w-full' 
                  : 'w-full',
                'font-medium py-2 px-3 sm:px-4 text-sm sm:text-base break-words',
                getButtonStyle(),
                answered && !isSelected && 'opacity-70'
              )}
            >
              {answer.text}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
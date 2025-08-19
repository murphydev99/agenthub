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
      
      if (evalResult === 'true') {
        if (answer.HideIfEvaluateTrue) {
          shouldShow = false;
        } else {
          shouldAutoAnswer = true;
        }
      }
    }
    
    return {
      ...answer,
      shouldShow,
      shouldAutoAnswer,
      text: interpolateText(answer.Prompt || answer.AnswerText || ''),
    };
  });
  
  // Auto-answer if conditions are met
  useEffect(() => {
    if (!answered && !autoAnswered) {
      const autoAnswer = processedAnswers.find((a: any) => a.shouldAutoAnswer);
      if (autoAnswer) {
        console.log('Auto-answering with:', autoAnswer);
        handleAnswer(autoAnswer.GUID, autoAnswer);
        setAutoAnswered(true);
      }
    }
  }, [answered, autoAnswered]);
  
  const handleAnswer = (answerId: string, answer: any) => {
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
      ExecuteCommandProcessor.processExecute(answer.Execute);
    }
    
    // Process answer in workflow store
    answerQuestion(row.id, answerId);
  };
  
  // Filter visible answers
  const visibleAnswers = processedAnswers.filter((a: any) => a.shouldShow);
  
  // Determine button layout based on total text length
  const totalTextLength = visibleAnswers.reduce((sum: number, a: any) => sum + a.text.length, 0);
  const averageLength = totalTextLength / visibleAnswers.length;
  const maxLength = Math.max(...visibleAnswers.map((a: any) => a.text.length));
  
  // Use horizontal layout if:
  // - 5 or fewer answers with max length < 20 chars (like satisfaction scale), OR
  // - 3 or fewer answers regardless of text length, OR
  // - 4 answers with average < 25 chars, OR
  // - All answers are short (< 15 chars each)
  const buttonLayout = 
    (visibleAnswers.length <= 5 && maxLength < 20) ||
    visibleAnswers.length <= 3 ||
    (visibleAnswers.length <= 4 && averageLength < 25) ||
    visibleAnswers.every((a: any) => a.text.length < 15)
      ? 'horizontal' 
      : 'vertical';
  
  // If auto-answered and no visible answers, don't show anything
  if (autoAnswered && visibleAnswers.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-3">
      {prompt && (
        <div className="text-sm font-medium text-gray-700">
          <div dangerouslySetInnerHTML={{ __html: prompt }} />
        </div>
      )}
      
      <div className={cn(
        "gap-2",
        buttonLayout === 'horizontal' ? 'flex flex-row flex-wrap' : 'flex flex-col'
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
                buttonLayout === 'horizontal' ? 'flex-1 min-w-[100px]' : 'w-full',
                'font-medium py-2 px-4',
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
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  messages: ChatMessage[];
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIService {
  static async chat(options: ChatOptions): Promise<ChatResponse> {
    const {
      messages,
      apiKey,
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 500
    } = options;

    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Extract structured data from text using OpenAI
   */
  static async extractStructuredData(
    text: string, 
    schema: Record<string, string>,
    apiKey: string
  ): Promise<Record<string, any>> {
    const schemaDescription = Object.entries(schema)
      .map(([key, description]) => `- ${key}: ${description}`)
      .join('\n');

    const response = await this.chat({
      messages: [
        {
          role: 'system',
          content: `Extract the following information from the user's message and return it as JSON:
${schemaDescription}

Return only valid JSON with the extracted values. If a value is not found, use null.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      apiKey,
      model: 'gpt-4o-mini',
      temperature: 0.3
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return {};
    }
  }

  /**
   * Analyze intent to determine which workflow to use
   */
  static async analyzeIntent(
    text: string,
    availableWorkflows: Array<{ id: string; name: string; description: string }>,
    apiKey: string
  ): Promise<string | null> {
    const workflowList = availableWorkflows
      .map(w => `- ${w.id}: ${w.name} - ${w.description}`)
      .join('\n');

    const response = await this.chat({
      messages: [
        {
          role: 'system',
          content: `Analyze the user's intent and determine which workflow best matches their needs.
Available workflows:
${workflowList}

Return only the workflow ID that best matches, or "none" if no workflow matches.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      apiKey,
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 50
    });

    const workflowId = response.content.trim();
    return workflowId === 'none' ? null : workflowId;
  }
}
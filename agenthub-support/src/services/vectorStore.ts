import { OpenAIService } from './openai';

interface WorkflowEmbedding {
  workflowId: string;
  workflowName: string;
  aliasText: string;
  embedding: number[];
  metadata?: {
    description?: string;
    keywords?: string[];
  };
}

export class VectorStore {
  private embeddings: WorkflowEmbedding[] = [];
  private embeddingsCache: Map<string, WorkflowEmbedding> = new Map();
  
  static async generateEmbedding(text: string, apiKey: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  async initialize(aliases: any[], apiKey: string): Promise<void> {
    console.log(`Initializing vector store with ${aliases.length} workflows...`);
    
    const cacheKey = 'support_workflow_embeddings';
    const cacheTimestampKey = 'support_workflow_embeddings_timestamp';
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
    const cacheMaxAge = 24 * 60 * 60 * 1000;
    
    if (cachedData && cachedTimestamp) {
      const age = Date.now() - parseInt(cachedTimestamp);
      if (age < cacheMaxAge) {
        try {
          const cached = JSON.parse(cachedData);
          this.embeddings = cached;
          cached.forEach((emb: WorkflowEmbedding) => {
            this.embeddingsCache.set(emb.workflowId, emb);
          });
          console.log(`Loaded ${cached.length} embeddings from cache`);
          return;
        } catch (error) {
          console.error('Failed to parse cached embeddings:', error);
        }
      }
    }
    
    const embeddings: WorkflowEmbedding[] = [];
    
    for (const alias of aliases) {
      if (!alias.WorkflowName) continue;
      
      try {
        const textForEmbedding = this.createEmbeddingText(alias);
        const embedding = await VectorStore.generateEmbedding(textForEmbedding, apiKey);
        
        const workflowEmbedding: WorkflowEmbedding = {
          workflowId: alias.WorkflowUID || alias.WorkflowName,
          workflowName: alias.WorkflowName,
          aliasText: alias.AliasText || '',
          embedding,
          metadata: {
            description: alias.Description,
            keywords: this.extractKeywords(alias)
          }
        };
        
        embeddings.push(workflowEmbedding);
        this.embeddingsCache.set(workflowEmbedding.workflowId, workflowEmbedding);
        
      } catch (error) {
        console.error(`Failed to generate embedding for ${alias.WorkflowName}:`, error);
      }
    }
    
    this.embeddings = embeddings;
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(embeddings));
      localStorage.setItem(cacheTimestampKey, Date.now().toString());
      console.log(`Cached ${embeddings.length} embeddings`);
    } catch (error) {
      console.error('Failed to cache embeddings:', error);
    }
  }

  private createEmbeddingText(alias: any): string {
    const parts = [];
    
    if (alias.AliasText) {
      parts.push(`Alias: ${alias.AliasText}`);
    }
    
    parts.push(`Workflow: ${alias.WorkflowName}`);
    
    const synonyms = this.generateSynonyms(alias);
    if (synonyms.length > 0) {
      parts.push(`Related: ${synonyms.join(', ')}`);
    }
    
    if (alias.Description) {
      parts.push(`Description: ${alias.Description}`);
    }
    
    return parts.join('. ');
  }

  private generateSynonyms(alias: any): string[] {
    const synonyms: string[] = [];
    const text = (alias.AliasText + ' ' + alias.WorkflowName).toLowerCase();
    
    const termMappings: Record<string, string[]> = {
      'ticket': ['support', 'issue', 'problem', 'help', 'case', 'incident'],
      'password': ['login', 'access', 'credentials', 'authentication', 'sign in'],
      'reset': ['change', 'update', 'modify', 'new'],
      'billing': ['invoice', 'payment', 'charge', 'bill', 'subscription'],
      'account': ['profile', 'user', 'settings', 'preferences'],
      'technical': ['tech', 'IT', 'system', 'software', 'hardware'],
      'network': ['internet', 'connection', 'wifi', 'ethernet', 'connectivity'],
      'email': ['mail', 'outlook', 'gmail', 'messages'],
      'printer': ['print', 'printing', 'scanner', 'copier'],
      'software': ['application', 'app', 'program', 'tool'],
      'hardware': ['device', 'equipment', 'computer', 'laptop', 'desktop'],
      'vpn': ['remote', 'connection', 'access', 'virtual private network'],
      'backup': ['restore', 'recovery', 'data', 'files'],
      'security': ['safety', 'protection', 'antivirus', 'firewall', 'threat']
    };
    
    for (const [key, values] of Object.entries(termMappings)) {
      if (text.includes(key)) {
        synonyms.push(...values);
      }
    }
    
    return synonyms;
  }

  private extractKeywords(alias: any): string[] {
    const text = `${alias.AliasText || ''} ${alias.WorkflowName || ''}`.toLowerCase();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    return text
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  async search(query: string, apiKey: string, topK: number = 5): Promise<any[]> {
    if (this.embeddings.length === 0) {
      console.warn('Vector store not initialized');
      return [];
    }
    
    try {
      const queryEmbedding = await VectorStore.generateEmbedding(query, apiKey);
      
      const similarities = this.embeddings.map(workflow => ({
        workflow,
        similarity: VectorStore.cosineSimilarity(queryEmbedding, workflow.embedding)
      }));
      
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      const threshold = 0.7;
      const filtered = similarities
        .filter(item => item.similarity >= threshold)
        .slice(0, topK);
      
      console.log(`Vector search found ${filtered.length} matches for "${query}"`);
      filtered.forEach(item => {
        console.log(`  - ${item.workflow.workflowName} (${item.workflow.aliasText}): ${item.similarity.toFixed(3)}`);
      });
      
      return filtered.map(item => ({
        WorkflowUID: item.workflow.workflowId,
        WorkflowName: item.workflow.workflowName,
        AliasText: item.workflow.aliasText,
        Similarity: item.similarity
      }));
      
    } catch (error) {
      console.error('Vector search failed:', error);
      return [];
    }
  }

  async hybridSearch(query: string, apiKey: string, aliases: any[]): Promise<any[]> {
    const vectorResults = await this.search(query, apiKey, 10);
    const keywordResults = this.keywordSearch(query, aliases);
    
    const combinedMap = new Map<string, any>();
    
    vectorResults.forEach(result => {
      combinedMap.set(result.WorkflowName, {
        ...result,
        score: result.Similarity * 1.5
      });
    });
    
    keywordResults.forEach(result => {
      if (!combinedMap.has(result.WorkflowName)) {
        combinedMap.set(result.WorkflowName, {
          ...result,
          score: result.score
        });
      }
    });
    
    const combined = Array.from(combinedMap.values());
    combined.sort((a, b) => b.score - a.score);
    
    return combined.slice(0, 3);
  }

  private keywordSearch(query: string, aliases: any[]): any[] {
    const lowercaseQuery = query.toLowerCase().trim();
    const queryWords = lowercaseQuery.split(/\s+/).filter(w => w.length > 2);
    
    const scored = aliases.map(alias => {
      const aliasText = (alias.AliasText || '').toLowerCase();
      const workflowName = (alias.WorkflowName || '').toLowerCase();
      
      let score = 0;
      
      if (aliasText === lowercaseQuery) score += 10;
      else if (aliasText.includes(lowercaseQuery)) score += 5;
      
      queryWords.forEach(word => {
        if (aliasText.includes(word)) score += 2;
        if (workflowName.includes(word)) score += 1;
      });
      
      return { ...alias, score };
    });
    
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
}

export const vectorStore = new VectorStore();
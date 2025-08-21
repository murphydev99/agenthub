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
  
  /**
   * Generate embedding for a text using OpenAI's text-embedding model
   */
  static async generateEmbedding(text: string, apiKey: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small', // Efficient embedding model
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

  /**
   * Calculate cosine similarity between two vectors
   */
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

  /**
   * Initialize vector store with workflow aliases
   */
  async initialize(aliases: any[], apiKey: string): Promise<void> {
    console.log(`Initializing vector store with ${aliases.length} workflows...`);
    
    // Check cache first
    const cacheKey = 'workflow_embeddings';
    const cacheTimestampKey = 'workflow_embeddings_timestamp';
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
    const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours
    
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
    
    // Generate embeddings for each workflow
    const embeddings: WorkflowEmbedding[] = [];
    
    for (const alias of aliases) {
      if (!alias.WorkflowName) continue;
      
      try {
        // Create a rich text representation for embedding
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
    
    // Cache the embeddings
    try {
      localStorage.setItem(cacheKey, JSON.stringify(embeddings));
      localStorage.setItem(cacheTimestampKey, Date.now().toString());
      console.log(`Cached ${embeddings.length} embeddings`);
    } catch (error) {
      console.error('Failed to cache embeddings:', error);
    }
  }

  /**
   * Create enriched text for embedding generation
   */
  private createEmbeddingText(alias: any): string {
    const parts = [];
    
    // Primary alias text (most important)
    if (alias.AliasText) {
      parts.push(`Alias: ${alias.AliasText}`);
    }
    
    // Workflow name
    parts.push(`Workflow: ${alias.WorkflowName}`);
    
    // Add common variations and synonyms
    const synonyms = this.generateSynonyms(alias);
    if (synonyms.length > 0) {
      parts.push(`Related: ${synonyms.join(', ')}`);
    }
    
    // Add description if available
    if (alias.Description) {
      parts.push(`Description: ${alias.Description}`);
    }
    
    return parts.join('. ');
  }

  /**
   * Generate synonyms and related terms for better matching
   */
  private generateSynonyms(alias: any): string[] {
    const synonyms: string[] = [];
    const text = (alias.AliasText + ' ' + alias.WorkflowName).toLowerCase();
    
    // Common term mappings - be more specific with SNAP
    const termMappings: Record<string, string[]> = {
      'snap-eligibility': ['snap', 'food stamps', 'ebt', 'food assistance', 'nutritional assistance', 'snap benefits', 'food benefits', 'supplemental nutrition'],
      'snap eligibility': ['snap', 'food stamps', 'ebt', 'food assistance', 'nutritional assistance', 'snap benefits', 'food benefits', 'supplemental nutrition'],
      'mri cost': ['magnetic resonance imaging', 'mri scan', 'mri test', 'imaging', 'mri price', 'mri fee'],
      'cost': ['price', 'fee', 'charge', 'expense', 'how much'],
      'eligibility': ['qualify', 'eligible', 'can i get', 'am i eligible'],
      'passport': ['travel document', 'international id'],
      'irish': ['ireland', 'eire'],
      'customer service': ['support', 'help desk', 'assistance']
    };
    
    // Add relevant synonyms based on content - check full phrases first
    for (const [key, values] of Object.entries(termMappings)) {
      if (text.includes(key)) {
        synonyms.push(...values);
      }
    }
    
    return synonyms;
  }

  /**
   * Extract keywords from alias for metadata
   */
  private extractKeywords(alias: any): string[] {
    const text = `${alias.AliasText || ''} ${alias.WorkflowName || ''}`.toLowerCase();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    return text
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  /**
   * Search for workflows using vector similarity
   */
  async search(query: string, apiKey: string, topK: number = 5): Promise<any[]> {
    if (this.embeddings.length === 0) {
      console.warn('Vector store not initialized');
      return [];
    }
    
    try {
      // Generate embedding for the query
      const queryEmbedding = await VectorStore.generateEmbedding(query, apiKey);
      
      // Calculate similarities
      const similarities = this.embeddings.map(workflow => ({
        workflow,
        similarity: VectorStore.cosineSimilarity(queryEmbedding, workflow.embedding)
      }));
      
      // Sort by similarity and return top K
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Filter out low similarity scores
      const threshold = 0.7; // Minimum similarity threshold
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

  /**
   * Hybrid search combining vector similarity and keyword matching
   */
  async hybridSearch(query: string, apiKey: string, aliases: any[]): Promise<any[]> {
    // Get vector search results
    const vectorResults = await this.search(query, apiKey, 10);
    
    // Perform keyword search as fallback
    const keywordResults = this.keywordSearch(query, aliases);
    
    // Combine and deduplicate results
    const combinedMap = new Map<string, any>();
    
    // Add vector results with boosted scores
    vectorResults.forEach(result => {
      combinedMap.set(result.WorkflowName, {
        ...result,
        score: result.Similarity * 1.5 // Boost vector scores
      });
    });
    
    // Add keyword results
    keywordResults.forEach(result => {
      if (!combinedMap.has(result.WorkflowName)) {
        combinedMap.set(result.WorkflowName, {
          ...result,
          score: result.score
        });
      }
    });
    
    // Sort by combined score and return top results
    const combined = Array.from(combinedMap.values());
    combined.sort((a, b) => b.score - a.score);
    
    return combined.slice(0, 3);
  }

  /**
   * Fallback keyword search
   */
  private keywordSearch(query: string, aliases: any[]): any[] {
    const lowercaseQuery = query.toLowerCase().trim();
    const queryWords = lowercaseQuery.split(/\s+/).filter(w => w.length > 2);
    
    const scored = aliases.map(alias => {
      const aliasText = (alias.AliasText || '').toLowerCase();
      const workflowName = (alias.WorkflowName || '').toLowerCase();
      
      let score = 0;
      
      // Exact match on alias
      if (aliasText === lowercaseQuery) score += 10;
      else if (aliasText.includes(lowercaseQuery)) score += 5;
      
      // Word matching
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

// Singleton instance
export const vectorStore = new VectorStore();
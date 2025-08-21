import { ChatWidget } from '../components/chatbot/ChatWidget';

export function TestVectorSearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🚀 AgentHub Chatbot - Vector Search Testing
          </h1>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">Model Updated</h2>
            <p className="text-sm text-blue-800">
              <strong>Now using:</strong> GPT-5-mini for improved instruction-following and workflow matching<br/>
              <strong>Search Method:</strong> Hybrid approach combining vector embeddings and keyword matching
            </p>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <h2 className="font-semibold text-green-900 mb-2">✨ Improvements Implemented</h2>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• <strong>GPT-5-mini Model:</strong> Better at understanding user intent</li>
              <li>• <strong>Vector Store:</strong> Uses OpenAI's text-embedding-3-small for semantic search</li>
              <li>• <strong>Hybrid Search:</strong> Combines vector similarity with keyword matching</li>
              <li>• <strong>Synonym Expansion:</strong> Automatically includes related terms</li>
              <li>• <strong>24-hour Cache:</strong> Reduces API calls for embeddings</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Test Queries to Try:</h2>
            <p className="text-sm text-gray-600 mb-4">Type these in the chatbot to test improved matching:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "I wonder if I can get an irish passport",
                "am I eligible for food stamps?",
                "how much does an MRI cost?",
                "what's the price of an MRI scan?",
                "I need help with SNAP benefits",
                "customer service",
                "Seans Customer Service",
                "check my eligibility for nutritional assistance",
                "MRI pricing information",
                "can I get EBT?"
              ].map((query, index) => (
                <div 
                  key={index}
                  className="bg-white p-3 rounded border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(query);
                    const el = document.getElementById(`query-${index}`);
                    if (el) {
                      el.textContent = '✓ Copied!';
                      setTimeout(() => {
                        el.textContent = query;
                      }, 2000);
                    }
                  }}
                >
                  <span id={`query-${index}`} className="text-sm">{query}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot Widget */}
      <ChatWidget
        autoDetectWorkflow={true}
        position="bottom-right"
        primaryColor="#6366f1"
        title="AgentHub Assistant (Vector Search)"
        welcomeMessage="Hi! I'm using improved vector search to help you find the right workflow. What can I help you with today?"
        apiKey={import.meta.env.VITE_OPENAI_API_KEY}
      />
    </div>
  );
}
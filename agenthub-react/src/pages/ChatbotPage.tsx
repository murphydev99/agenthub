import { ChatWidget } from '../components/chatbot/ChatWidget';
import { useSearchParams } from 'react-router-dom';

export function ChatbotPage() {
  const [searchParams] = useSearchParams();
  
  // Get configuration from URL parameters
  const workflowId = searchParams.get('workflowId') || undefined;
  const workflowAlias = searchParams.get('workflowAlias') || searchParams.get('alias') || undefined;
  const position = (searchParams.get('position') as 'bottom-right' | 'bottom-left') || 'bottom-right';
  const primaryColor = searchParams.get('color') || '#6366f1';
  const title = searchParams.get('title') || 'AgentHub Assistant';
  const welcomeMessage = searchParams.get('welcome') || 'Hello! How can I help you today?';
  const isEmbedded = searchParams.get('embedded') === 'true';
  const autoDetectWorkflow = searchParams.get('autoDetect') === 'true' || (!workflowId && !workflowAlias);

  // If embedded, only show the widget with transparent background
  if (isEmbedded) {
    return (
      <div style={{ background: 'transparent', minHeight: '100vh' }}>
        <ChatWidget
          workflowId={workflowId}
          workflowAlias={workflowAlias}
          position={position}
          primaryColor={primaryColor}
          title={title}
          welcomeMessage={welcomeMessage}
          apiKey={import.meta.env.VITE_OPENAI_API_KEY}
          autoDetectWorkflow={autoDetectWorkflow}
        />
      </div>
    );
  }

  // Otherwise, show the full demo page
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AgentHub Intelligent Chatbot</h1>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
          <div className="flex">
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-blue-900">Key Features</h2>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>✨ <strong>Intelligent Workflow Detection:</strong> Automatically detects and loads the most relevant workflow based on user input</li>
                <li>🤖 <strong>AI-Powered Matching:</strong> Uses GPT-4o-mini to understand user intent and match with configured workflow aliases</li>
                <li>🔄 <strong>Dynamic Workflow Execution:</strong> Supports all workflow step types including questions, collect, instructions, and sub-workflows</li>
                <li>📝 <strong>Smart Data Extraction:</strong> Extracts structured data from conversational user responses</li>
                <li>🎨 <strong>Fully Customizable:</strong> Configurable colors, position, title, and welcome message</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Embed Instructions</h2>
          <p className="text-gray-600 mb-4">
            Add this intelligent chatbot to any website with a simple script tag. The bot can either be configured with a specific workflow or intelligently detect the appropriate workflow based on user needs.
          </p>
          
          <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`<!-- AgentHub Intelligent Chatbot -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/chatbot-embed.js';
    script.async = true;
    script.onload = function() {
      AgentHubChat.init({
        // Option 1: Specific workflow by alias
        workflowAlias: '${workflowAlias || 'customer-service'}',
        
        // Option 2: Specific workflow by ID
        // workflowId: 'workflow-guid-here',
        
        // Option 3: Auto-detect workflow (default)
        // autoDetectWorkflow: true,
        
        position: '${position}',
        primaryColor: '${primaryColor}',
        title: '${title}',
        welcomeMessage: '${welcomeMessage}'
      });
    };
    document.head.appendChild(script);
  })();
</script>`}</code>
          </pre>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Configuration Options</h2>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <strong className="text-gray-800">workflowAlias:</strong>
                <span className="block text-xs mt-1">Load workflow by its configured alias (e.g., 'customer-service', 'snap-eligibility')</span>
              </li>
              <li>
                <strong className="text-gray-800">workflowId:</strong>
                <span className="block text-xs mt-1">Load workflow by its unique ID (GUID)</span>
              </li>
              <li>
                <strong className="text-gray-800">autoDetectWorkflow:</strong>
                <span className="block text-xs mt-1">Enable AI-powered workflow detection (default: true if no workflow specified)</span>
              </li>
              <li>
                <strong className="text-gray-800">position:</strong>
                <span className="block text-xs mt-1">'bottom-right' or 'bottom-left' (default: 'bottom-right')</span>
              </li>
              <li>
                <strong className="text-gray-800">primaryColor:</strong>
                <span className="block text-xs mt-1">Hex color for widget theme (default: '#6366f1')</span>
              </li>
              <li>
                <strong className="text-gray-800">title:</strong>
                <span className="block text-xs mt-1">Header title (default: 'AgentHub Assistant')</span>
              </li>
              <li>
                <strong className="text-gray-800">welcomeMessage:</strong>
                <span className="block text-xs mt-1">Initial greeting (default: 'Hello! How can I help you today?')</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">URL Parameters (Demo)</h2>
            <p className="text-sm text-gray-600 mb-3">Try these parameters on this page:</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <code className="bg-gray-100 px-1 rounded">?workflowAlias=customer-service</code>
                <span className="block text-xs mt-1">Load specific workflow by alias</span>
              </li>
              <li>
                <code className="bg-gray-100 px-1 rounded">?autoDetect=true</code>
                <span className="block text-xs mt-1">Enable intelligent workflow detection</span>
              </li>
              <li>
                <code className="bg-gray-100 px-1 rounded">?position=bottom-left</code>
                <span className="block text-xs mt-1">Position widget on left side</span>
              </li>
              <li>
                <code className="bg-gray-100 px-1 rounded">?color=%23FF6B6B</code>
                <span className="block text-xs mt-1">Change primary color (URL encoded)</span>
              </li>
              <li>
                <code className="bg-gray-100 px-1 rounded">?title=Support%20Bot</code>
                <span className="block text-xs mt-1">Custom title (URL encoded)</span>
              </li>
              <li>
                <code className="bg-gray-100 px-1 rounded">?embedded=true</code>
                <span className="block text-xs mt-1">Embedded mode (hides this demo page)</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-900">Current Configuration</h3>
              <div className="mt-2 text-sm text-green-800">
                {workflowAlias && <p>Workflow Alias: <strong>{workflowAlias}</strong></p>}
                {workflowId && <p>Workflow ID: <strong>{workflowId}</strong></p>}
                {autoDetectWorkflow && <p>Mode: <strong>Intelligent Workflow Detection</strong></p>}
                <p>Position: <strong>{position}</strong></p>
                <p>Color: <strong style={{color: primaryColor}}>{primaryColor}</strong></p>
                <p>Title: <strong>{title}</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Render the actual chatbot widget */}
      <ChatWidget
        workflowId={workflowId}
        workflowAlias={workflowAlias}
        position={position}
        primaryColor={primaryColor}
        title={title}
        welcomeMessage={welcomeMessage}
        apiKey={import.meta.env.VITE_OPENAI_API_KEY}
        autoDetectWorkflow={autoDetectWorkflow}
      />
    </div>
  );
}
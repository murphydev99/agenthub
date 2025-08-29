import React, { useState } from 'react';
import { Send, Bot, User, PhoneCall } from 'lucide-react';

export function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hello! I\'m your AgentHub assistant. How can I help you today?',
      time: '10:00 AM'
    }
  ]);

  const handleSend = () => {
    if (message.trim()) {
      setMessages([...messages, {
        id: messages.length + 1,
        type: 'user',
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setMessage('');
      
      // Simulate bot response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          type: 'bot',
          text: 'I\'m processing your request. This is where AgentHub workflows would provide intelligent responses.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 1000);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Chat Support</h1>
            <p className="text-sm text-gray-600">AI-powered assistance with human agent escalation</p>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center">
            <PhoneCall className="h-4 w-4 mr-2" />
            Request Agent
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-xl ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 ${
                    msg.type === 'user' ? 'ml-3' : 'mr-3'
                  }`}>
                    {msg.type === 'bot' ? (
                      <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 bg-gray-400 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={`px-4 py-2 rounded-lg ${
                      msg.type === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.text}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${
                      msg.type === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSend}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-gray-50 border-l p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="space-y-3">
          <button className="w-full px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-left">
            📝 Create a ticket
          </button>
          <button className="w-full px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-left">
            📋 Check ticket status
          </button>
          <button className="w-full px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-left">
            🔧 Reset password
          </button>
          <button className="w-full px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-left">
            📦 Inventory help
          </button>
        </div>

        <div className="mt-8">
          <h2 className="font-semibold text-gray-900 mb-4">Agent Status</h2>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">3 agents available</span>
            </div>
            <p className="text-xs text-gray-500">Average wait time: 2 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
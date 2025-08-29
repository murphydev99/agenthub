import React, { useState } from 'react';
import { Search, BookOpen, ChevronRight } from 'lucide-react';

export function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { name: 'POS System', count: 45, icon: '💳' },
    { name: 'Inventory Management', count: 32, icon: '📦' },
    { name: 'Employee Training', count: 28, icon: '👥' },
    { name: 'Store Operations', count: 67, icon: '🏪' },
    { name: 'Marketing & Promotions', count: 23, icon: '📢' },
    { name: 'Compliance & Regulations', count: 19, icon: '📋' }
  ];

  const popularArticles = [
    { title: 'How to Reset POS Terminal', views: 1234, category: 'POS System' },
    { title: 'Daily Inventory Count Procedures', views: 987, category: 'Inventory Management' },
    { title: 'New Employee Onboarding Checklist', views: 856, category: 'Employee Training' },
    { title: 'Troubleshooting Network Issues', views: 743, category: 'Store Operations' },
    { title: 'Processing Refunds and Exchanges', views: 698, category: 'POS System' }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <p className="text-gray-600">Find answers powered by AgentHub AI</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for articles, guides, or ask a question..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Search
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500 text-center">
          Powered by AgentHub workflow intelligence
        </p>
      </div>

      {/* Categories Grid */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <button
              key={category.name}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left flex items-center justify-between"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-4">{category.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.count} articles</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Popular Articles */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Popular Articles</h2>
        </div>
        <div className="divide-y">
          {popularArticles.map((article) => (
            <button
              key={article.title}
              className="w-full px-6 py-4 hover:bg-gray-50 text-left flex items-center justify-between"
            >
              <div className="flex items-center">
                <BookOpen className="h-5 w-5 text-indigo-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">{article.title}</h3>
                  <p className="text-sm text-gray-500">{article.category} • {article.views} views</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Copy, Trash2, Plus, Shield, Globe, Clock } from 'lucide-react';

interface DomainToken {
  token: string;
  domain: string;
  createdAt: string;
  expiresAt?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const API_KEY = 'e1ac5aea76405ab02e6220a5308d5ddc9cc6561853e0fb3c6a861c2c6414b8fa';

export function TokenManagement() {
  const [domain, setDomain] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('365');
  const [tokens, setTokens] = useState<DomainToken[]>([]);
  const [embedCode, setEmbedCode] = useState('');
  const [loading, setLoading] = useState(false);

  const generateToken = async () => {
    if (!domain) {
      alert('Please enter a domain');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/domain-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          domain,
          expiresInDays: parseInt(expiresInDays)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const data = await response.json();
      setEmbedCode(data.embedCode);
      
      // Refresh token list
      fetchTokens();
      
      // Clear form
      setDomain('');
    } catch (error) {
      console.error('Error generating token:', error);
      alert('Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const fetchTokens = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/domain-tokens`, {
        headers: {
          'x-api-key': API_KEY
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  const revokeToken = async (token: string) => {
    if (!confirm('Are you sure you want to revoke this token?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/domain-tokens/${token}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': API_KEY
        }
      });

      if (response.ok) {
        fetchTokens();
      }
    } catch (error) {
      console.error('Error revoking token:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Fetch tokens on mount
  useState(() => {
    fetchTokens();
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Domain Token Management</h1>
          <p className="text-gray-600">Generate and manage domain-restricted tokens for chatbot embedding</p>
        </div>
      </div>

      {/* Generate Token Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Generate New Token
          </CardTitle>
          <CardDescription>
            Create a domain-restricted token that only works when embedded on the specified domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="www.example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the domain where the chatbot will be embedded
                </p>
              </div>
              
              <div>
                <Label htmlFor="expires">Expires In (days)</Label>
                <Input
                  id="expires"
                  type="number"
                  placeholder="365"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token validity period
                </p>
              </div>
            </div>

            <Button 
              onClick={generateToken}
              disabled={loading || !domain}
              className="w-full md:w-auto"
            >
              <Shield className="h-4 w-4 mr-2" />
              Generate Token
            </Button>

            {embedCode && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <Label>Embed Code</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(embedCode)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                  <code>{embedCode}</code>
                </pre>
                <p className="text-xs text-gray-600 mt-2">
                  Add this code to your website's HTML to embed the chatbot
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Active Tokens
          </CardTitle>
          <CardDescription>
            Manage existing domain tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tokens generated yet</p>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div 
                  key={token.token}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{token.domain}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>Token: {token.token}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created: {new Date(token.createdAt).toLocaleDateString()}
                      </span>
                      {token.expiresAt && (
                        <span>Expires: {new Date(token.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeToken(token.token)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
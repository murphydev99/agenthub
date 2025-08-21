import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './pages/Login';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { WorkflowExecution } from './pages/WorkflowExecution';
import { ChatbotPage } from './pages/ChatbotPage';
import { TokenManagement } from './pages/TokenManagement';
import { TestVectorSearchPage } from './pages/TestVectorSearch';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/test-vector" element={<TestVectorSearchPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/workflow/:id" element={<WorkflowExecution />} />
              <Route path="/w/:id" element={<WorkflowExecution />} />
              <Route path="/admin/tokens" element={<TokenManagement />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App

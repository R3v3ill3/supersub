import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SimpleLayout from './components/SimpleLayout';
import SimpleDashboard from './pages/SimpleDashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import EditProject from './pages/EditProject';
import Submissions from './pages/Submissions';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import SystemHealth from './pages/SystemHealth';
import Analytics from './pages/Analytics';
import LoginPage from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SimpleLayout>
                  <Routes>
                    <Route path="/" element={<SimpleDashboard />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/new" element={<CreateProject />} />
                    <Route path="/projects/:id/edit" element={<EditProject />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/submissions" element={<Submissions />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/system-health" element={<SystemHealth />} />
                    <Route path="/analytics" element={<Analytics />} />
                  </Routes>
                </SimpleLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

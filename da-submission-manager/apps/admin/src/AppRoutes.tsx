import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import SimpleLayout from './components/SimpleLayout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import Submissions from './pages/Submissions';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import SystemHealth from './pages/SystemHealth';
import Analytics from './pages/Analytics';
import LoginPage from './pages/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/*"
              element={
                <SimpleLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/new" element={<CreateProject />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/submissions" element={<Submissions />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/system-health" element={<SystemHealth />} />
                    <Route path="/analytics" element={<Analytics />} />
                  </Routes>
                </SimpleLayout>
              }
            />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

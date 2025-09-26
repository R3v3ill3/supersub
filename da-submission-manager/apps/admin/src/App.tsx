import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { AuthProvider } from './contexts/AuthContext'; // Disabled for development
// import ProtectedRoute from './components/ProtectedRoute'; // Disabled for development
import SimpleLayout from './components/SimpleLayout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import Submissions from './pages/Submissions';
import Templates from './pages/Templates';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* <AuthProvider> */}
        <Router>
          {/* <ProtectedRoute> */}
            <SimpleLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/new" element={<CreateProject />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/submissions" element={<Submissions />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </SimpleLayout>
          {/* </ProtectedRoute> */}
        </Router>
      {/* </AuthProvider> */}
    </QueryClientProvider>
  );
}

export default App;
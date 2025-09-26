import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubmissionForm from './pages/SubmissionForm';
import ThankYou from './pages/ThankYou';
import ReviewDocument from './pages/ReviewDocument';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/:projectSlug?" element={<SubmissionForm />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/review/:submissionId" element={<ReviewDocument />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
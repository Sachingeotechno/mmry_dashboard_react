import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import DateWiseDashboard from './components/DateWiseDashboard';
import BusinessDashboard from './components/BusinessDashboard';
import SurveyStatistics from './components/SurveyStatistics';
import BusinessStatistics from './components/BusinessStatistics';
import Navigation from './components/Navigation';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Login from './login';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token') || localStorage.getItem('userData');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Only allows utype === '1'
const BusinessProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token') || localStorage.getItem('userData');
  if (!token) return <Navigate to="/login" replace />;

  try {
    const raw = localStorage.getItem('userData');
    const user = raw ? JSON.parse(raw) : null;
    if (String(user?.utype) !== '1') {
      return <Navigate to="/" replace />;
    }
  } catch {
    return <Navigate to="/" replace />;
  }

  return children;
};

function Layout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans flex flex-col transition-colors duration-500">
      {!isLoginPage && <Navigation />}
      <div className="flex-1 overflow-x-hidden transition-colors duration-500">
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-right" />
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Redirect root to login explicitly if that's the desired initial state, though ProtectedRoute handles it. */}
            {/* If we strictly want the first page to be login regardless of old tokens, we might need to clear them, but standard practice is token check. */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/datewise" element={<ProtectedRoute><DateWiseDashboard /></ProtectedRoute>} />
            <Route path="/business" element={<BusinessProtectedRoute><BusinessDashboard /></BusinessProtectedRoute>} />
            <Route path="/businessstats" element={<ProtectedRoute><BusinessStatistics /></ProtectedRoute>} />
            <Route path="/surveystats" element={<ProtectedRoute><SurveyStatistics /></ProtectedRoute>} />
            {/* Catch-all route mapping to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;

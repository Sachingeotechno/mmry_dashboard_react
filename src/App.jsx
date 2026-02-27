import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import DateWiseDashboard from './components/DateWiseDashboard';
import BusinessDashboard from './components/BusinessDashboard';
import Navigation from './components/Navigation';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans flex flex-col transition-colors duration-500">
          <Navigation />
          <div className="flex-1 overflow-x-hidden transition-colors duration-500">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/datewise" element={<DateWiseDashboard />} />
              <Route path="/business" element={<BusinessDashboard />} />
            </Routes>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

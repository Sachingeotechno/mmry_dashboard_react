import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import DateWiseDashboard from './components/DateWiseDashboard';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <Navigation />
        <div className="flex-1 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/datewise" element={<DateWiseDashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

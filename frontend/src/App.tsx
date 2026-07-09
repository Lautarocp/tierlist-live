import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import CreatePage from './pages/CreatePage';
import HostPage from './pages/HostPage';
import VotePage from './pages/VotePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/create" replace />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/host/:code" element={<HostPage />} />
        <Route path="/vote/:code" element={<VotePage />} />
      </Routes>
    </BrowserRouter>
  );
}

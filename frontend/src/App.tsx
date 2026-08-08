import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LangProvider, LangToggle, useT } from './i18n';
import CreatePage from './pages/CreatePage';
import HostPage from './pages/HostPage';
import VotePage from './pages/VotePage';
import { useBackendReady } from './useBackendReady';

function WarmupGate({ children }: { children: React.ReactNode }) {
  const { ready, elapsed } = useBackendReady();
  const { t } = useT();

  if (ready === false) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
        <p className="text-2xl font-bold text-center">{t('warmupTitle')}</p>
        <p className="text-zinc-400 text-center max-w-sm">{t('warmupDesc')}</p>
        {elapsed > 0 && (
          <p className="text-zinc-600 text-sm font-mono">{t('warmupElapsed', { s: elapsed })}</p>
        )}
      </div>
    );
  }

  if (ready === null) return null;

  return <>{children}</>;
}

export default function App() {
  return (
    <LangProvider>
      <LangToggle />
      <WarmupGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/create" replace />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/host/:code" element={<HostPage />} />
            <Route path="/vote/:code" element={<VotePage />} />
          </Routes>
        </BrowserRouter>
      </WarmupGate>
    </LangProvider>
  );
}

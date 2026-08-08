import { useState } from 'react';
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

function WelcomeModal() {
  const { t } = useT();
  const [open, setOpen] = useState(() => !localStorage.getItem('welcomeSeen'));

  function dismiss() {
    localStorage.setItem('welcomeSeen', '1');
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <h2 className="text-2xl font-black text-center text-purple-400">{t('welcomeTitle')}</h2>

        <div className="space-y-1">
          <p className="font-bold text-zinc-100">{t('welcomeStreamerTitle')}</p>
          <p className="text-zinc-400 text-sm">{t('welcomeStreamerDesc')}</p>
        </div>

        <div className="space-y-1">
          <p className="font-bold text-zinc-100">{t('welcomeViewerTitle')}</p>
          <p className="text-zinc-400 text-sm">{t('welcomeViewerDesc')}</p>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 space-y-1">
          <p className="font-bold text-yellow-400 text-sm">{t('welcomeDelayTitle')}</p>
          <p className="text-yellow-200/70 text-sm">{t('welcomeDelayDesc')}</p>
        </div>

        <button
          onClick={dismiss}
          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-black text-lg transition-colors"
        >
          {t('welcomeBtn')}
        </button>
      </div>
    </div>
  );
}

function GithubLink() {
  return (
    <a
      href="https://github.com/Lautarocp"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-3 right-3 text-zinc-600 hover:text-zinc-300 text-xs font-mono transition-colors"
    >
      github.com/Lautarocp
    </a>
  );
}

export default function App() {
  return (
    <LangProvider>
      <LangToggle />
      <WelcomeModal />
      <GithubLink />
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

import { createContext, useCallback, useContext, useState } from 'react';
import T, { Lang, TKey } from './translations';

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx>(null!);

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const stored = (localStorage.getItem('lang') as Lang) ?? 'es';
  const [lang, setLangState] = useState<Lang>(stored);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('lang', l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) =>
      interpolate(T[key][lang], vars),
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}

export function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <div className="fixed top-3 right-3 z-50 flex rounded-lg overflow-hidden border border-zinc-700 text-xs font-bold">
      <button
        onClick={() => setLang('es')}
        className={`px-2.5 py-1 transition-colors ${
          lang === 'es' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
        }`}
      >
        ES
      </button>
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 transition-colors ${
          lang === 'en' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
        }`}
      >
        EN
      </button>
    </div>
  );
}

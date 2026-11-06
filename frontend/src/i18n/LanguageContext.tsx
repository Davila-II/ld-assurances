import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Globe } from 'lucide-react';
import { TRANSLATIONS } from './translations';
import type { Lang, TranslationKey } from './translations';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'ld_assurances_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
    return 'fr';
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  };

  const toggleLang = () => {
    setLang(lang === 'fr' ? 'en' : 'fr');
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.fr;
    let text: string = dict[key] || TRANSLATIONS.fr[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`lang-toggle ${className}`} role="group" aria-label="Choix de la langue">
      <Globe size={14} className="lang-globe-icon" aria-hidden="true" />
      <button
        type="button"
        className={`lang-btn ${lang === 'fr' ? 'active' : ''}`}
        aria-pressed={lang === 'fr'}
        onClick={() => setLang('fr')}
      >
        FR
      </button>
      <span className="lang-sep">|</span>
      <button
        type="button"
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        aria-pressed={lang === 'en'}
        onClick={() => setLang('en')}
      >
        EN
      </button>
    </div>
  );
}

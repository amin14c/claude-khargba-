import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db } from './firebase/config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Auth from './components/Auth';
import GameLobby from './components/Game';
import { LogOut } from 'lucide-react';
import './i18n';

type Lang = 'ar' | 'fr' | 'en' | 'tzm';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'ar',  label: 'العربية'      },
  { code: 'tzm', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ' },
  { code: 'fr',  label: 'Français'     },
  { code: 'en',  label: 'English'      },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser]               = useState<User | null>(null);
  const [loading, setLoading]         = useState(true);
  const [langSelected, setLangSelected] = useState(
    () => !!localStorage.getItem('langSelected')
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) await ensureUserProfile(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const ensureUserProfile = async (u: User) => {
    try {
      const ref  = doc(db, 'users', u.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return;
      const displayName = u.email
        ? u.email.split('@')[0]
        : u.phoneNumber
          ? `Player_${u.phoneNumber.slice(-4)}`
          : 'Player';
      await setDoc(ref, {
        uid:         u.uid,
        email:       u.email || u.phoneNumber || '',
        displayName,
        createdAt:   serverTimestamp(),
      });
    } catch (e: any) {
      if (!e.message?.toLowerCase().includes('offline')) {
        console.error('Error creating user profile', e);
      }
    }
  };

  const selectLang = (lng: Lang) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('langSelected', 'true');
    setLangSelected(true);
  };

  if (!langSelected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="luxury-panel p-6 sm:p-10 max-w-sm w-full text-center space-y-6 sm:space-y-8">
          <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full flex items-center justify-center text-3xl sm:text-5xl font-display mx-auto border-2 border-[#D4AF37] luxury-text-gold shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            ⴷ
          </div>
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-[0.2em] luxury-text-gold font-display">
            Select Language
          </h2>
          <div className="flex flex-col gap-2 sm:gap-3">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => selectLang(code)}
                className="luxury-btn w-full py-2 sm:py-3 rounded text-xs sm:text-sm font-bold font-display"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-display luxury-text-gold tracking-[0.2em] uppercase animate-pulse">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-serif">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 px-3 sm:px-6 py-3 sm:py-4 border-b border-[rgba(212,175,55,0.15)] bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-2xl font-display border border-[#D4AF37] luxury-text-gold flex-shrink-0">
            ⴷ
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base md:text-xl font-bold tracking-widest uppercase font-display luxury-text-gold truncate">
              ⴷⴰⵎⴰ ⵏ ⵜⵉⵏⵉ / داما النواة
            </h1>
            <p className="text-[7px] sm:text-[9px] uppercase tracking-[0.3em] font-display text-[#D4AF37] opacity-50 mt-0.5 truncate">
              Desert Strategy • 7×7 Tactical Board
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end flex-shrink-0">
          <select
            value={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
            className="bg-transparent text-[#D4AF37] outline-none cursor-pointer hidden sm:block uppercase tracking-widest text-xs font-display px-2 py-1 border border-[rgba(212,175,55,0.3)] rounded"
          >
            {LANGS.map(({ code, label }) => (
              <option key={code} value={code} className="bg-[#12100E]">
                {label}
              </option>
            ))}
          </select>
          {user && (
            <button
              onClick={() => signOut(auth)}
              className="luxury-btn px-2 sm:px-3 py-1.5 sm:py-2 rounded flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] flex-shrink-0"
              title={t('logout')}
            >
              <LogOut size={14} />
              <span className="hidden sm:inline uppercase font-bold tracking-widest">
                {t('logout')}
              </span>
            </button>
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col px-2 sm:px-4 md:px-10 py-4 sm:py-8 w-full max-w-7xl mx-auto overflow-y-auto">
        {user ? <GameLobby /> : <Auth />}
      </main>

      <footer className="h-12 sm:h-14 flex items-center justify-center text-[#D4AF37] opacity-30 text-[7px] sm:text-[9px] font-display tracking-[0.3em] uppercase border-t border-[rgba(212,175,55,0.1)] bg-black/20 flex-shrink-0">
        Sahara Dama Online © 2026 • Rocks & Seeds Edition
      </footer>
    </div>
  );
}

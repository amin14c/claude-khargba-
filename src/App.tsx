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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="luxury-panel p-10 max-w-sm w-full text-center space-y-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-5xl font-display mx-auto border-2 border-[#D4AF37] luxury-text-gold shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            ⴷ
          </div>
          <h2 className="text-xl font-bold uppercase tracking-[0.2em] luxury-text-gold font-display">
            Select Language
          </h2>
          <div className="flex flex-col gap-3">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => selectLang(code)}
                className="luxury-btn w-full py-3 rounded text-sm font-bold font-display"
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
      <header className="flex justify-between items-center px-6 py-4 border-b border-[rgba(212,175,55,0.15)] bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl font-display border border-[#D4AF37] luxury-text-gold">
            ⴷ
          </div>
          <div>
            <h1 className="text-base md:text-xl font-bold tracking-widest uppercase font-display luxury-text-gold">
              ⴷⴰⵎⴰ ⵏ ⵜⵉⵏⵉ / داما النواة
            </h1>
            <p className="text-[9px] uppercase tracking-[0.3em] font-display text-[#D4AF37] opacity-50 mt-0.5">
              Desert Strategy • 7×7 Tactical Board
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <select
            value={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
            className="bg-transparent text-[#D4AF37] outline-none cursor-pointer hidden md:block uppercase tracking-widest text-xs font-display"
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
              className="luxury-btn px-3 py-2 rounded flex items-center gap-2 text-[10px]"
              title={t('logout')}
            >
              <LogOut size={15} />
              <span className="hidden md:inline uppercase font-bold tracking-widest">
                {t('logout')}
              </span>
            </button>
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col px-4 md:px-10 py-8 w-full max-w-7xl mx-auto">
        {user ? <GameLobby /> : <Auth />}
      </main>

      <footer className="h-14 flex items-center justify-center text-[#D4AF37] opacity-30 text-[9px] font-display tracking-[0.3em] uppercase border-t border-[rgba(212,175,55,0.1)] bg-black/20">
        Sahara Dama Online © 2026 • Rocks & Seeds Edition
      </footer>
    </div>
  );
}

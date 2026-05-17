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
        <div className="luxury-panel p-8 sm:p-12 max-w-lg w-full text-center space-y-10 sm:space-y-12">
          <div className="w-24 sm:w-28 h-24 sm:h-28 rounded-full flex items-center justify-center text-6xl sm:text-7xl font-display-bold mx-auto border-3 border-[#D4AF37] luxury-text-gold shadow-[0_0_30px_rgba(212,175,55,0.3)]">
            ⴷ
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-display-bold uppercase tracking-[0.15em] luxury-text-gold">
              اختر اللغة
            </h2>
            <p className="text-sm sm:text-base font-modern text-[#E6D5B8] opacity-70">
              Select Your Language / Choix de la langue
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:gap-5 w-full">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => selectLang(code)}
                className="luxury-btn-primary w-full px-6 py-4 sm:py-5 rounded-lg text-base sm:text-lg font-bold font-modern"
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
    <div className="min-h-screen flex flex-col font-modern">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 px-4 sm:px-8 py-4 sm:py-6 border-b border-[rgba(212,175,55,0.15)] bg-black/30 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4 sm:gap-4 min-w-0">
          <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-display-bold border-2 border-[#D4AF37] luxury-text-gold flex-shrink-0">
            ⴷ
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-display-bold tracking-wide uppercase font-display-bold luxury-text-gold truncate">
              خربڤة
            </h1>
            <p className="text-xs sm:text-sm font-modern text-[#D4AF37] opacity-60 mt-1 truncate">
              Dama × Khargba × داما
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-end flex-shrink-0">
          <select
            value={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
            className="bg-transparent text-[#D4AF37] outline-none cursor-pointer hidden sm:block uppercase tracking-wider text-sm font-modern px-3 py-2 border-2 border-[rgba(212,175,55,0.3)] rounded-lg transition hover:border-[#D4AF37]"
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
              className="luxury-btn px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center gap-2 text-sm font-modern flex-shrink-0"
              title={t('logout')}
            >
              <LogOut size={18} />
              <span className="hidden sm:inline font-bold">
                {t('logout')}
              </span>
            </button>
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-12 w-full overflow-y-auto">
        <div className="w-full max-w-3xl">
          {user ? <GameLobby /> : <Auth />}
        </div>
      </main>

      <footer className="h-16 sm:h-18 flex items-center justify-center text-[#D4AF37] opacity-40 text-xs sm:text-sm font-modern tracking-wider uppercase border-t border-[rgba(212,175,55,0.1)] bg-black/20 flex-shrink-0">
        Sahara Dama Online © 2026
      </footer>
    </div>
  );
}

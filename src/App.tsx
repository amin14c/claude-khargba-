import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db } from './firebase/config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Auth from './components/Auth';
import GameLobby from './components/Game';
import { LogOut, Globe, ChevronDown } from 'lucide-react';
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

  // Language Selection Screen
  if (!langSelected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A0908]">
        <div className="card-elevated p-8 w-full max-w-sm text-center space-y-8 animate-scale-in">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A55C] to-[#8B7340] flex items-center justify-center shadow-lg">
              <span className="text-4xl font-display text-[#0A0908]">D</span>
            </div>
            <div>
              <h1 className="text-2xl font-display text-gold-glow">Khargba</h1>
              <p className="text-sm text-[#6B6560] mt-1">Desert Strategy Game</p>
            </div>
          </div>
          
          {/* Language Options */}
          <div className="space-y-3">
            <p className="text-xs text-[#6B6560] uppercase tracking-wider">Select Language</p>
            <div className="grid grid-cols-2 gap-3">
              {LANGS.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => selectLang(code)}
                  className="btn btn-ghost py-4"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0908]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C9A55C]/20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#C9A55C] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[#6B6560] text-sm">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0908]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0908]/90 border-b border-[#C9A55C]/10">
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A55C] to-[#8B7340] flex items-center justify-center shadow-md">
              <span className="text-xl font-display text-[#0A0908] font-bold">D</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-display text-gold">Khargba</h1>
              <p className="text-[10px] text-[#6B6560]">Desert Strategy</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <select
                value={i18n.language}
                onChange={e => i18n.changeLanguage(e.target.value)}
                className="appearance-none bg-[#141210] text-[#C9A55C] text-xs px-3 py-2 pr-8 rounded-lg border border-[#C9A55C]/20 outline-none cursor-pointer"
              >
                {LANGS.map(({ code, label }) => (
                  <option key={code} value={code} className="bg-[#0A0908]">
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C9A55C]/60 pointer-events-none" />
            </div>
            
            {/* Logout */}
            {user && (
              <button
                onClick={() => signOut(auth)}
                className="btn btn-ghost !px-3 !py-2"
                title={t('logout')}
              >
                <LogOut size={16} />
                <span className="hidden sm:inline text-xs">{t('logout')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {user ? <GameLobby /> : <Auth />}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-[#C9A55C]/5">
        <p className="text-[10px] text-[#6B6560] tracking-wide">
          Khargba - Desert Dama Game
        </p>
      </footer>
    </div>
  );
}

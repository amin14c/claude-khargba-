import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db } from './firebase/config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Auth from './components/Auth';
import GameLobby from './components/Game';
import { LogOut, ChevronDown, Sparkles } from 'lucide-react';
import './i18n';

type Lang = 'ar' | 'fr' | 'en' | 'tzm';

const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: 'ar',  label: 'Arabic',   native: 'العربية' },
  { code: 'tzm', label: 'Amazigh',  native: 'ⵜⴰⵎⴰⵣⵉⵖⵜ' },
  { code: 'fr',  label: 'French',   native: 'Français' },
  { code: 'en',  label: 'English',  native: 'English' },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
      const ref = doc(db, 'users', u.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return;
      const displayName = u.email
        ? u.email.split('@')[0]
        : u.phoneNumber
          ? `Player_${u.phoneNumber.slice(-4)}`
          : 'Player';
      await setDoc(ref, {
        uid: u.uid,
        email: u.email || u.phoneNumber || '',
        displayName,
        createdAt: serverTimestamp(),
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

  // ══════════════════════════════════════════════════════
  //  Language Selection Screen
  // ══════════════════════════════════════════════════════
  if (!langSelected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-elevated p-8 w-full max-w-sm animate-scale-in">
          {/* Logo & Branding */}
          <div className="flex flex-col items-center gap-5 mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#D4A853] via-[#B8924A] to-[#8B6D35] flex items-center justify-center shadow-lg">
                <span className="text-5xl font-display text-[#08070A]">K</span>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#D4A853] flex items-center justify-center shadow-md">
                <Sparkles size={12} className="text-[#08070A]" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-display text-gradient">Khargba</h1>
              <p className="text-sm text-[#6E6A62] mt-2">Desert Strategy Game</p>
            </div>
          </div>
          
          {/* Language Selection */}
          <div className="space-y-4">
            <p className="text-xs text-center text-[#6E6A62] uppercase tracking-widest">
              Select Your Language
            </p>
            <div className="grid grid-cols-2 gap-3">
              {LANGS.map(({ code, native }) => (
                <button
                  key={code}
                  onClick={() => selectLang(code)}
                  className="btn btn-ghost py-4 flex-col gap-1"
                >
                  <span className="text-base">{native}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Footer Note */}
          <p className="text-[10px] text-center text-[#4A4740] mt-8">
            A traditional Saharan board game
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  //  Loading Screen
  // ══════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#D4A853]/10 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#D4A853] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <p className="text-[#6E6A62] text-sm">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  //  Main App Layout
  // ══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#08070A]/80 border-b border-[#D4A853]/8">
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A853] to-[#8B6D35] flex items-center justify-center shadow-md">
              <span className="text-lg font-display text-[#08070A] font-bold">K</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-display text-gradient">Khargba</h1>
              <p className="text-[10px] text-[#6E6A62]">Desert Strategy</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <select
                value={i18n.language}
                onChange={e => i18n.changeLanguage(e.target.value)}
                className="appearance-none bg-[#1A1824] text-[#D4A853] text-xs font-medium px-3 py-2.5 pr-8 rounded-xl border border-[#D4A853]/15 outline-none cursor-pointer transition-colors hover:border-[#D4A853]/30"
              >
                {LANGS.map(({ code, native }) => (
                  <option key={code} value={code} className="bg-[#0C0B0F]">
                    {native}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#D4A853]/50 pointer-events-none" />
            </div>
            
            {/* Logout */}
            {user && (
              <button
                onClick={() => signOut(auth)}
                className="btn btn-ghost !px-3 !py-2.5"
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
      <footer className="py-4 text-center border-t border-[#D4A853]/5">
        <p className="text-[10px] text-[#4A4740] tracking-wider">
          Khargba - A Saharan Legacy
        </p>
      </footer>
    </div>
  );
}

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
      if (!e.message

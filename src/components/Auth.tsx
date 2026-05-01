import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase/config';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  ConfirmationResult,
} from 'firebase/auth';

type Mode = 'choose' | 'phone' | 'email';

export default function Auth() {
  const { t } = useTranslation();
  const [mode, setMode]           = useState<Mode>('choose');
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep]           = useState<'input' | 'otp'>('input');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const confirmRef                = useRef<ConfirmationResult | null>(null);

  // ── reCAPTCHA ──────────────────────────────────────
  useEffect(() => {
    if (mode !== 'phone') return;
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        { size: 'invisible' }
      );
    }
  }, [mode]);

  // ── Phone Auth ────────────────────────────────────
  const sendOtp = async () => {
    setError('');
    if (!phone.startsWith('+')) {
      setError('أدخل الرقم بصيغة دولية مثال: +213xxxxxxxx');
      return;
    }
    setLoading(true);
    try {
      confirmRef.current = await signInWithPhoneNumber(
        auth,
        phone,
        window.recaptchaVerifier
      );
      setStep('otp');
    } catch (e: any) {
      setError(e.message || 'فشل إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!confirmRef.current) return;
    setError('');
    setLoading(true);
    try {
      await confirmRef.current.confirm(otp);
    } catch (e: any) {
      setError('رمز خاطئ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  // ── Email Auth ────────────────────────────────────
  const handleEmail = async () => {
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      const map: Record<string, string> = {
        'auth/email-already-in-use': 'البريد مستخدم مسبقاً',
        'auth/invalid-email':        'بريد إلكتروني غير صالح',
        'auth/wrong-password':       'كلمة مرور خاطئة',
        'auth/user-not-found':       'المستخدم غير موجود',
        'auth/weak-password':        'كلمة المرور ضعيفة (6 أحرف على الأقل)',
      };
      setError(map[e.code] || e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────
  const inputClass =
    'w-full px-4 py-3 bg-[#12100E] border border-[#4a3a2a] rounded-[4px] ' +
    'text-sm text-[#E6D5B8] placeholder:text-[#E6D5B8]/40 ' +
    'focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]';

  const btnPrimary =
    'w-full py-3 luxury-btn-primary rounded-[4px] text-xs font-display ' +
    'font-bold uppercase tracking-widest disabled:opacity-50';

  const btnSecondary =
    'w-full py-3 luxury-btn rounded-[4px] text-xs font-display ' +
    'font-bold uppercase tracking-widest';

  // شاشة اختيار طريقة الدخول
  if (mode === 'choose') {
    return (
      <div className="w-full max-w-sm mx-auto mt-8 space-y-4 font-serif">
        <div className="luxury-panel p-8 text-center space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-display font-bold uppercase tracking-[0.2em] luxury-text-gold">
              الدخول إلى خربڤة
            </h2>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#E6D5B8] opacity-50 font-display">
              اختر طريقة التسجيل
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => setMode('phone')} className={btnPrimary}>
              📱 رقم الهاتف
            </button>
            <button onClick={() => setMode('email')} className={btnSecondary}>
              ✉️ البريد الإلكتروني
            </button>
          </div>
        </div>
      </div>
    );
  }

  // شاشة الهاتف
  if (mode === 'phone') {
    return (
      <div className="w-full max-w-sm mx-auto mt-8 font-serif">
        <div id="recaptcha-container" />
        <div className="luxury-panel p-8 space-y-5">
          <button
            onClick={() => { setMode('choose'); setStep('input'); setError(''); }}
            className="text-[10px] uppercase tracking-widest text-[#D4AF37] opacity-60 hover:opacity-100 font-display"
          >
            ← رجوع
          </button>

          <h2 className="text-base font-display font-bold uppercase tracking-[0.2em] luxury-text-gold text-center">
            {step === 'input' ? 'رقم الهاتف' : 'رمز التحقق'}
          </h2>

          {step === 'input' ? (
            <>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+213xxxxxxxx"
                className={inputClass}
                dir="ltr"
              />
              <button onClick={sendOtp} disabled={loading || !phone} className={btnPrimary}>
                {loading ? 'جار الإرسال...' : 'إرسال الرمز'}
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="الرمز المرسل"
                maxLength={6}
                className={inputClass}
                dir="ltr"
              />
              <button onClick={verifyOtp} disabled={loading || otp.length < 6} className={btnPrimary}>
                {loading ? 'جار التحقق...' : 'تأكيد'}
              </button>
              <button
                onClick={() => setStep('input')}
                className="text-[10px] text-center w-full uppercase tracking-widest text-[#D4AF37] opacity-60 hover:opacity-100 font-display"
              >
                إعادة إرسال الرمز
              </button>
            </>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center font-display tracking-wide">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // شاشة البريد الإلكتروني
  return (
    <div className="w-full max-w-sm mx-auto mt-8 font-serif">
      <div className="luxury-panel p-8 space-y-5">
        <button
          onClick={() => { setMode('choose'); setError(''); }}
          className="text-[10px] uppercase tracking-widest text-[#D4AF37] opacity-60 hover:opacity-100 font-display"
        >
          ← رجوع
        </button>

        <h2 className="text-base font-display font-bold uppercase tracking-[0.2em] luxury-text-gold text-center">
          {isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'}
        </h2>

        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
          className={inputClass}
          dir="ltr"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          className={inputClass}
          dir="ltr"
        />

        <button onClick={handleEmail} disabled={loading || !email || !password} className={btnPrimary}>
          {loading ? 'جار...' : isRegister ? 'إنشاء حساب' : 'دخول'}
        </button>

        <button
          onClick={() => { setIsRegister(r => !r); setError(''); }}
          className="text-[10px] text-center w-full uppercase tracking-widest text-[#D4AF37] opacity-60 hover:opacity-100 font-display"
        >
          {isRegister ? 'لدي حساب — دخول' : 'حساب جديد — تسجيل'}
        </button>

        {error && (
          <p className="text-red-400 text-xs text-center font-display tracking-wide">
            {error}
          </p>
        )}
      </div>
    </div>
  );
          }

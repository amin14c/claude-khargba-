import { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase/config';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  ConfirmationResult,
} from 'firebase/auth';

type Mode = 'choose' | 'phone' | 'email';

// ── Validation Patterns ────────────────────────────────
const PHONE_REGEX = /^\+\d{1,3}\d{6,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export default function Auth() {
  const [mode, setMode]             = useState<Mode>('choose');
  const [phone, setPhone]           = useState('');
  const [otp, setOtp]               = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep]             = useState<'input' | 'otp'>('input');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const confirmRef                  = useRef<ConfirmationResult | null>(null);
  const verifierRef                 = useRef<RecaptchaVerifier | null>(null);

  // ── Initialize Recaptcha ───────────────────────────────
  useEffect(() => {
    if (mode !== 'phone') return;

    try {
      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          { size: 'invisible' }
        );
      }
    } catch (e) {
      console.error('RecaptchaVerifier init error:', e);
      setError('فشل تحميل التحقق الأمني');
    }

    return () => {
      // Cleanup on unmount or mode change
      if (verifierRef.current && mode !== 'phone') {
        verifierRef.current = null;
      }
    };
  }, [mode]);

  // ── Phone Validation ───────────────────────────────────
  const validatePhone = (value: string): string => {
    if (!value) return 'أدخل رقم الهاتف';
    if (!value.startsWith('+')) {
      return 'أدخل الرقم بصيغة دولية مثال: +213xxxxxxxxx';
    }
    if (!PHONE_REGEX.test(value)) {
      return 'صيغة الرقم غير صحيحة';
    }
    return '';
  };

  // ── Email Validation ───────────────────────────────────
  const validateEmail = (value: string): string => {
    if (!value) return 'أدخل البريد الإلكتروني';
    if (!EMAIL_REGEX.test(value)) {
      return 'بريد إلكتروني غير صالح';
    }
    return '';
  };

  // ── Password Validation ────────────────────────────────
  const validatePassword = (value: string): string => {
    if (!value) return 'أدخل كلمة المرور';
    if (value.length < MIN_PASSWORD_LENGTH) {
      return `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`;
    }
    return '';
  };

  // ── OTP Validation ────────────────────────────────────
  const validateOtp = (value: string): string => {
    if (!value) return 'أدخل الرمز';
    if (value.length < 6) return 'الرمز يجب أن يكون 6 أرقام';
    if (!/^\d{6}$/.test(value)) return 'الرمز يجب أن يحتوي على أرقام فقط';
    return '';
  };

  // ── Send OTP ───────────────────────────────────────────
  const sendOtp = async () => {
    setError('');
    
    // Validate phone
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    // Check verifier is ready
    if (!verifierRef.current) {
      setError('جاري تحضير التحقق الأمني، حاول مجدداً');
      return;
    }

    setLoading(true);
    try {
      confirmRef.current = await signInWithPhoneNumber(
        auth,
        phone,
        verifierRef.current
      );
      setStep('otp');
    } catch (e: any) {
      const errorMap: Record<string, string> = {
        'auth/invalid-phone-number': 'رقم هاتف غير صالح',
        'auth/missing-phone-number': 'رقم الهاتف مفقود',
        'auth/quota-exceeded': 'تم تجاوز حد المحاولات، حاول لاحقاً',
        'auth/user-disabled': 'حسابك معطل',
        'auth/too-many-requests': 'عدد محاولات كثير جداً، حاول لاحقاً',
      };
      setError(errorMap[e.code] || e.message || 'فشل إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ─────────────────────────────────────────
  const verifyOtp = async () => {
    if (!confirmRef.current) {
      setError('انتظر قليلاً وحاول مجدداً');
      return;
    }

    setError('');
    
    const otpError = validateOtp(otp);
    if (otpError) {
      setError(otpError);
      return;
    }

    setLoading(true);
    try {
      await confirmRef.current.confirm(otp);
      // Success — auth state will update automatically
    } catch (e: any) {
      const errorMap: Record<string, string> = {
        'auth/invalid-verification-code': 'رمز خاطئ',
        'auth/code-expired': 'انتهت صلاحية الرمز، أطلب رمز جديد',
        'auth/user-disabled': 'حسابك معطل',
      };
      setError(errorMap[e.code] || 'رمز خاطئ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Email Auth ──────────────────────────────────
  const handleEmail = async () => {
    setError('');

    // Validate inputs
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // Success — auth state will update automatically
    } catch (e: any) {
      const errorMap: Record<string, string> = {
        'auth/email-already-in-use': 'البريد مستخدم مسبقاً',
        'auth/invalid-email': 'بريد إلكتروني غير صالح',
        'auth/wrong-password': 'كلمة مرور خاطئة',
        'auth/user-not-found': 'المستخدم غير موجود',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/operation-not-allowed': 'هذه العملية غير متاحة حالياً',
        'auth/too-many-requests': 'عدد محاولات كثير جداً، حاول لاحقاً',
        'auth/user-disabled': 'حسابك معطل',
      };
      setError(errorMap[e.code] || e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Form ────────────────────────────────────────
  const resetForm = () => {
    setPhone('');
    setOtp('');
    setEmail('');
    setPassword('');
    setIsRegister(false);
    setStep('input');
    setError('');
  };

  const inputClass =
    'w-full px-4 py-3 bg-[#12100E] border border-[#4a3a2a] rounded-[4px] ' +
    'text-sm text-[#E6D5B8] placeholder:text-[#E6D5B8]/40 ' +
    'focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'min-h-[44px]';

  const btnPrimary =
    'w-full py-3 luxury-btn-primary rounded-[4px] text-xs font-display ' +
    'font-bold uppercase tracking-widest disabled:opacity-50 ' +
    'disabled:cursor-not-allowed transition-all min-h-[44px]';

  const btnSecondary =
    'w-full py-3 luxury-btn rounded-[4px] text-xs font-display ' +
    'font-bold uppercase tracking-widest transition-all min-h-[44px]';

  // ── Choose Mode Screen ─────────────────────────────────
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
            <button 
              onClick={() => setMode('phone')} 
              className={btnPrimary}
              aria-label="تسجيل الدخول برقم الهاتف"
            >
              📱 رقم الهاتف
            </button>
            <button 
              onClick={() => setMode('email')} 
              className={btnSecondary}
              aria-label="تسجيل الدخول ببريد إلكتروني"
            >
              ✉️ البريد الإلكتروني
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phone Auth Screen ──────────────────────────────────
  if (mode === 'phone') {
    return (
      <div className="w-full max-w-sm mx-auto mt-8 font-serif">
        <div id="recaptcha-container" />
        <div className="luxury-panel p-8 space-y-5">
          <button
            onClick={() => { setMode('choose'); resetForm(); }}
            className="text-[10px] uppercase tracking-widest text-[#D4AF37] opacity-60 hover:opacity-100 font-display transition-opacity"
            aria-label="العودة للخلف"
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
                inputMode="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+213xxxxxxxxx"
                className={inputClass}
                dir="ltr"
                disabled={loading}
                aria-label="رقم الهاتف"
              />
              <button 
                onClick={sendOtp} 
                disabled={loading || !phone}
                className={btnPrimary}
                aria-busy={loading}
              >
                {loading ? 'جار الإرسال...' : 'إرسال الرمز'}
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="الرمز المرسل"
                maxLength={6}
                className={inputClass}
                dir="ltr"
                disabled={loading}
                aria-label="رمز التحقق"
              />
              <button 
                onClick={verifyOtp} 
                disabled={loading || otp.length < 6}
                className={btnPrimary}
                aria-busy={loading}
              >
                {loading ? 'جار التحقق...' : 'تأكيد'}
              </button>
              <button
                onClick={() => { setStep('input'); setOtp(''); setError(''); }}
                className="text-[10px] text-center w-full uppercase tracking-widest text-[#D4AF37] opacity-60 hover:opacity-100 font-display transition-opacity"
              >
                إعادة إرسال الرمز
              </button>
            </>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded px-3 py-2">
              <p className="text-red-400 text-xs text-center font-display tracking-wide">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Email Auth Screen ──────────────────────────────────
  return (
    <div className="w-full max-w-sm mx-auto mt-8 font-serif">
      <div className="luxury-panel p-8 space-y-5">
        <button
          onClick={() => { setMode('choose'); resetForm(); }}
          className="text-[10px] uppercase tracking-widest text-[#D4AF37] opacity-60 hover:opacity-100 font-display transition-opacity"
          aria-label="العودة للخلف"
        >
          ← رجوع
        </button>

        <h2 className="text-base font-display font-bold uppercase tracking-[0.2em] luxury-text-gold text-center">
          {isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'}
        </h2>

        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
          className={inputClass}
          dir="ltr"
          disabled={loading}
          aria-label="البريد الإلكتروني"
        />

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          className={inputClass}
          dir="ltr"
          disabled={loading}
          aria-label="كلمة المرور"
        />

        <button 
          onClick={handleEmail} 
          disabled={loading || !email || !password}
          className={btnPrimary}
          aria-busy={loading}
        >
          {loading ? 'جار...' : isRegister ? 'إنشاء حساب' : 'دخول'}
        </button>

        <button
          onClick={() => { setIsRegister(r => !r); setError(''); }}
          className="text-[10px] text-center w-full uppercase tracking-widest text-[#D4AF37] opacity-60 hover:opacity-100 font-display transition-opacity"
        >
          {isRegister ? 'لدي حساب — دخول' : 'حساب جديد — تسجيل'}
        </button>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded px-3 py-2">
            <p className="text-red-400 text-xs text-center font-display tracking-wide">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

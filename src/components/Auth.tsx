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
    'w-full px-5 py-4 text-lg font-modern bg-[rgba(212,175,55,0.05)] border-2 border-[rgba(212,175,55,0.25)] ' +
    'text-[#E6D5B8] placeholder-[#8B7355] rounded-lg outline-none transition-all ' +
    'focus:border-[#D4AF37] focus:bg-[rgba(212,175,55,0.1)] focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]';

  const btnPrimary =
    'w-full py-4 luxury-btn-primary rounded-lg text-lg font-modern ' +
    'font-bold uppercase tracking-wider disabled:opacity-50 ' +
    'disabled:cursor-not-allowed transition-all min-h-[56px]';

  const btnSecondary =
    'w-full py-4 luxury-btn rounded-lg text-lg font-modern ' +
    'font-bold uppercase tracking-wider transition-all min-h-[56px]';

  // ── Choose Mode Screen ─────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 font-modern px-4 sm:px-0">
        <div className="luxury-panel p-8 sm:p-12 text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-display-bold uppercase tracking-wider luxury-text-gold">
              أدخل إلى حسابك
            </h2>
            <p className="text-lg sm:text-xl font-modern text-[#E6D5B8] opacity-70">
              اختر طريقة التسجيل المفضلة لديك
            </p>
          </div>
          <div className="flex flex-col gap-6 sm:gap-5">
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
      <div className="w-full max-w-2xl mx-auto font-modern px-4 sm:px-0">
        <div id="recaptcha-container" />
        <div className="luxury-panel p-8 sm:p-12 space-y-8">
          <button
            onClick={() => { setMode('choose'); resetForm(); }}
            className="text-lg font-modern text-[#D4AF37] opacity-70 hover:opacity-100 transition-opacity font-medium tracking-wider"
            aria-label="العودة للخلف"
          >
            ← العودة
          </button>

          <h2 className="text-3xl sm:text-4xl font-display-bold uppercase tracking-wider luxury-text-gold text-center">
            {step === 'input' ? 'رقم الهاتف' : 'التحقق'}
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
    <div className="w-full max-w-2xl mx-auto font-modern px-4 sm:px-0">
      <div className="luxury-panel p-8 sm:p-12 space-y-8">
        <button
          onClick={() => { setMode('choose'); resetForm(); }}
          className="text-lg font-modern text-[#D4AF37] opacity-70 hover:opacity-100 transition-opacity font-medium tracking-wider"
          aria-label="العودة للخلف"
        >
          ← العودة
        </button>

        <h2 className="text-3xl sm:text-4xl font-display-bold uppercase tracking-wider luxury-text-gold text-center">
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
          className="text-lg text-center w-full font-modern text-[#D4AF37] opacity-70 hover:opacity-100 transition-opacity font-medium tracking-wider"
        >
          {isRegister ? 'لدي حساب — دخول' : 'حساب جديد — تسجيل'}
        </button>

        {error && (
          <div className="bg-red-900/20 border-2 border-red-500/40 rounded-lg px-5 py-4">
            <p className="text-red-300 text-lg text-center font-modern tracking-wide">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

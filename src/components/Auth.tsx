import { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase/config';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  ConfirmationResult,
} from 'firebase/auth';
import { Phone, Mail, ArrowLeft, Loader2 } from 'lucide-react';

type Mode = 'choose' | 'phone' | 'email';

// ── Validation Patterns ────────────────────────────────
const PHONE_REGEX = /^\+\d{1,3}\d{6,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export default function Auth() {
  const [mode, setMode] = useState<Mode>('choose');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<ConfirmationResult | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

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
      setError('Failed to load security verification');
    }

    return () => {
      if (verifierRef.current && mode !== 'phone') {
        verifierRef.current = null;
      }
    };
  }, [mode]);

  // ── Validation Functions ───────────────────────────────
  const validatePhone = (value: string): string => {
    if (!value) return 'Enter phone number';
    if (!value.startsWith('+')) return 'Use international format: +213xxxxxxxxx';
    if (!PHONE_REGEX.test(value)) return 'Invalid phone format';
    return '';
  };

  const validateEmail = (value: string): string => {
    if (!value) return 'Enter email address';
    if (!EMAIL_REGEX.test(value)) return 'Invalid email address';
    return '';
  };

  const validatePassword = (value: string): string => {
    if (!value) return 'Enter password';
    if (value.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    return '';
  };

  const validateOtp = (value: string): string => {
    if (!value) return 'Enter verification code';
    if (value.length < 6) return 'Code must be 6 digits';
    if (!/^\d{6}$/.test(value)) return 'Code must contain only numbers';
    return '';
  };

  // ── Send OTP ───────────────────────────────────────────
  const sendOtp = async () => {
    setError('');
    const phoneError = validatePhone(phone);
    if (phoneError) { setError(phoneError); return; }
    if (!verifierRef.current) { setError('Preparing verification, please try again'); return; }

    setLoading(true);
    try {
      confirmRef.current = await signInWithPhoneNumber(auth, phone, verifierRef.current);
      setStep('otp');
    } catch (e: any) {
      const errorMap: Record<string, string> = {
        'auth/invalid-phone-number': 'Invalid phone number',
        'auth/missing-phone-number': 'Phone number missing',
        'auth/quota-exceeded': 'Too many attempts, try later',
        'auth/too-many-requests': 'Too many attempts, try later',
      };
      setError(errorMap[e.code] || e.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ─────────────────────────────────────────
  const verifyOtp = async () => {
    if (!confirmRef.current) { setError('Please wait and try again'); return; }
    setError('');
    const otpError = validateOtp(otp);
    if (otpError) { setError(otpError); return; }

    setLoading(true);
    try {
      await confirmRef.current.confirm(otp);
    } catch (e: any) {
      const errorMap: Record<string, string> = {
        'auth/invalid-verification-code': 'Invalid code',
        'auth/code-expired': 'Code expired, request new one',
      };
      setError(errorMap[e.code] || 'Invalid code, try again');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Email Auth ──────────────────────────────────
  const handleEmail = async () => {
    setError('');
    const emailError = validateEmail(email);
    if (emailError) { setError(emailError); return; }
    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return; }

    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      const errorMap: Record<string, string> = {
        'auth/email-already-in-use': 'Email already in use',
        'auth/invalid-email': 'Invalid email address',
        'auth/wrong-password': 'Incorrect password',
        'auth/user-not-found': 'User not found',
        'auth/weak-password': 'Password too weak',
        'auth/too-many-requests': 'Too many attempts, try later',
      };
      setError(errorMap[e.code] || e.message || 'An error occurred');
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

  // ══════════════════════════════════════════════════════
  //  Choose Mode Screen
  // ══════════════════════════════════════════════════════
  if (mode === 'choose') {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm glass-elevated p-8 space-y-8 animate-scale-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-display text-gradient">Welcome</h2>
            <p className="text-sm text-[#6E6A62]">Choose how to sign in</p>
          </div>

          {/* Auth Options */}
          <div className="space-y-3">
            <button
              onClick={() => setMode('phone')}
              className="w-full btn btn-primary justify-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#08070A]/30 flex items-center justify-center">
                <Phone size={20} />
              </div>
              <div className="text-left">
                <p className="font-medium">Phone Number</p>
                <p className="text-xs opacity-70">Quick verification via SMS</p>
              </div>
            </button>

            <button
              onClick={() => setMode('email')}
              className="w-full btn btn-secondary justify-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
                <Mail size={20} className="text-[#D4A853]" />
              </div>
              <div className="text-left">
                <p className="font-medium">Email Address</p>
                <p className="text-xs opacity-70">Sign in with email & password</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  //  Phone Auth Screen
  // ══════════════════════════════════════════════════════
  if (mode === 'phone') {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm glass-elevated p-8 space-y-6 animate-fade-up">
          <div id="recaptcha-container" />

          {/* Back Button */}
          <button
            onClick={() => { setMode('choose'); resetForm(); }}
            className="flex items-center gap-2 text-sm text-[#6E6A62] hover:text-[#D4A853] transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-[#D4A853]/10 flex items-center justify-center mx-auto mb-4">
              <Phone size={28} className="text-[#D4A853]" />
            </div>
            <h2 className="text-xl font-display text-gradient">
              {step === 'input' ? 'Phone Number' : 'Verification Code'}
            </h2>
            <p className="text-sm text-[#6E6A62]">
              {step === 'input' ? 'Enter your phone number' : 'Enter the code sent to you'}
            </p>
          </div>

          {step === 'input' ? (
            <div className="space-y-4">
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+213xxxxxxxxx"
                className="input text-center text-lg tracking-wider"
                dir="ltr"
                disabled={loading}
              />
              <button
                onClick={sendOtp}
                disabled={loading || !phone}
                className="w-full btn btn-primary"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Code'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="input text-center text-2xl tracking-[0.5em] font-mono"
                dir="ltr"
                disabled={loading}
              />
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full btn btn-primary"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </button>
              <button
                onClick={() => { setStep('input'); setOtp(''); setError(''); }}
                className="w-full text-sm text-[#6E6A62] hover:text-[#D4A853] transition-colors"
              >
                Resend Code
              </button>
            </div>
          )}

          {error && (
            <div className="bg-[#F25252]/10 border border-[#F25252]/20 rounded-xl px-4 py-3">
              <p className="text-[#F25252] text-sm text-center">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  //  Email Auth Screen
  // ══════════════════════════════════════════════════════
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm glass-elevated p-8 space-y-6 animate-fade-up">
        {/* Back Button */}
        <button
          onClick={() => { setMode('choose'); resetForm(); }}
          className="flex items-center gap-2 text-sm text-[#6E6A62] hover:text-[#D4A853] transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#D4A853]/10 flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-[#D4A853]" />
          </div>
          <h2 className="text-xl font-display text-gradient">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-[#6E6A62]">
            {isRegister ? 'Sign up with your email' : 'Sign in to continue'}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            className="input"
            dir="ltr"
            disabled={loading}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="input"
            dir="ltr"
            disabled={loading}
          />
          <button
            onClick={handleEmail}
            disabled={loading || !email || !password}
            className="w-full btn btn-primary"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Please wait...
              </>
            ) : isRegister ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </div>

        {/* Toggle */}
        <button
          onClick={() => { setIsRegister(r => !r); setError(''); }}
          className="w-full text-sm text-[#6E6A62] hover:text-[#D4A853] transition-colors"
        >
          {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>

        {error && (
          <div className="bg-[#F25252]/10 border border-[#F25252]/20 rounded-xl px-4 py-3">
            <p className="text-[#F25252] text-sm text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

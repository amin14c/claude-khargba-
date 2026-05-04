import { ApplicationVerifier } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier: ApplicationVerifier;
  }
}

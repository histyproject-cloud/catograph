import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// 빌드 시 .env 누락 감지: 모든 사용자가 검은 화면을 보는 사고 재발 방지
const REQUIRED_ENV = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_APP_ID',
];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(
    `Firebase 환경변수 누락: ${missing.join(', ')}. .env 파일을 확인하세요.`
  );
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// Firebase App Check (reCAPTCHA v3)
// REACT_APP_RECAPTCHA_V3_SITE_KEY 가 설정된 경우에만 초기화 (미설정 시 no-op).
//
// 운영 활성화 절차 (의뢰인 작업 필요):
//   1) https://console.cloud.google.com/security/recaptcha 에서 reCAPTCHA v3 site key 발급
//      (도메인: cartographic.agency, *.vercel.app, localhost 등 개발/운영 도메인 모두 등록)
//   2) Firebase Console > 보안 > App Check 에서 web 앱 등록 + reCAPTCHA v3 provider 연결
//   3) Firestore / Storage / Functions enforcement 모드를 monitor → enforce 로 단계적 전환
//      (먼저 monitor 7일 운영하면서 metrics 확인 후 enforce 권장)
//   4) Vercel Project Settings > Environment Variables 에 REACT_APP_RECAPTCHA_V3_SITE_KEY 추가
//   5) Cloud Functions 의 onCall 옵션에 enforceAppCheck: true 추가 (별도 PR 권장)
//
// 디버그/로컬 토큰: DevTools 콘솔에서 self.FIREBASE_APPCHECK_DEBUG_TOKEN = true 설정 후 새로고침
const APP_CHECK_SITE_KEY = process.env.REACT_APP_RECAPTCHA_V3_SITE_KEY;
if (APP_CHECK_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.error('[App Check] 초기화 실패:', err);
  }
} else if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  console.warn(
    '[App Check] REACT_APP_RECAPTCHA_V3_SITE_KEY 미설정 — App Check 비활성. ' +
      '운영 보안 권장: 콘솔 등록 후 환경변수 설정 + Cloud Functions enforceAppCheck 활성.'
  );
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

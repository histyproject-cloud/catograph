/**
 * HISTY-2026 쿠폰 10개 삭제 스크립트
 * git history에 노출된 쿠폰 코드를 Firestore에서 제거
 * 실행: node scripts/delete_histy_coupons.js
 */
const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'catograph-5d8f5',
});

const db = admin.firestore();

const EXPOSED_CODES = [
  'HISTY-2026-JHLQ45DY',
  'HISTY-2026-DWM6G3XZ',
  'HISTY-2026-NCEZHUCQ',
  'HISTY-2026-4M9K3QDL',
  'HISTY-2026-4M7PXFTN',
  'HISTY-2026-LBGXYMYC',
  'HISTY-2026-M5PDR5UC',
  'HISTY-2026-QPK3YAQ6',
  'HISTY-2026-WJRFU334',
  'HISTY-2026-UMR5RGLM',
];

async function run() {
  console.log(`총 ${EXPOSED_CODES.length}개 쿠폰 처리 시작\n`);

  for (const code of EXPOSED_CODES) {
    const ref = db.collection('coupons').doc(code);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log(`  SKIP  ${code} — Firestore에 없음`);
      continue;
    }

    const data = snap.data();
    const usedCount = data.usedCount || 0;
    const usedBy = data.usedBy || [];

    if (usedCount > 0 || usedBy.length > 0) {
      // 이미 사용된 쿠폰 — 삭제 대신 비활성화만 (사용 이력 보존)
      await ref.update({ isActive: false, deactivatedReason: 'git_exposure_2026-05-07' });
      console.log(`  DEACT ${code} — 사용 ${usedCount}회 이력 있음, isActive=false 처리`);
    } else {
      // 미사용 — 완전 삭제
      await ref.delete();
      console.log(`  DEL   ${code} — 미사용, 삭제 완료`);
    }
  }

  console.log('\n완료');
  process.exit(0);
}

run().catch((err) => {
  console.error('오류:', err.message);
  process.exit(1);
});

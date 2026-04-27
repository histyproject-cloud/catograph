/**
 * 쿠폰 코드 생성 스크립트
 *
 * 사전 준비:
 *   1. Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"
 *   2. 다운받은 JSON을 scripts/serviceAccountKey.json 으로 저장
 *   3. 이 폴더에서: npm install firebase-admin
 *
 * 사용법:
 *   node createCoupon.js [옵션]
 *
 * 옵션:
 *   --count   <숫자>   생성할 쿠폰 수 (기본: 10)
 *   --prefix  <문자열> 코드 앞에 붙일 접두사 (기본: HISTY)
 *   --days    <숫자>   무료 이용 기간(일) (기본: 365)
 *   --type    <문자열> 쿠폰 타입 (기본: coupon_1year)
 *   --max-uses <숫자>  1인당 최대 사용 횟수 (기본: 1)
 *   --expires <YYYY-MM-DD> 쿠폰 자체 만료일 (없으면 무제한)
 *
 * 예시:
 *   node createCoupon.js --count 500 --prefix HISTY-2026 --days 365
 *   node createCoupon.js --count 10 --prefix BETA --days 30 --expires 2026-06-30
 */

const admin = require('firebase-admin');
const fs = require('fs');

// ── 인자 파싱 ──
const argv = process.argv.slice(2);
const getArg = (name, defaultVal) => {
  const idx = argv.indexOf(`--${name}`);
  return idx !== -1 && argv[idx + 1] !== undefined ? argv[idx + 1] : defaultVal;
};

const COUNT     = parseInt(getArg('count', '10'), 10);
const PREFIX    = getArg('prefix', 'HISTY');
const DAYS      = parseInt(getArg('days', '365'), 10);
const TYPE      = getArg('type', 'coupon_1year');
const MAX_USES  = parseInt(getArg('max-uses', '1'), 10);
const EXPIRES   = getArg('expires', null); // e.g. "2026-12-31"

// ── Firebase Admin 초기화 ──
const serviceAccountPath = `${__dirname}/serviceAccountKey.json`;
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json 파일이 없어요!');
  console.error('   Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성');
  console.error(`   저장 위치: ${serviceAccountPath}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});
const db = admin.firestore();

// ── 코드 생성 (혼동 문자 제거: 0, 1, I, O) ──
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomSuffix(length = 8) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

async function main() {
  console.log(`\n📋 쿠폰 생성 설정`);
  console.log(`   개수: ${COUNT}개`);
  console.log(`   접두사: ${PREFIX}`);
  console.log(`   무료 기간: ${DAYS}일`);
  console.log(`   타입: ${TYPE}`);
  console.log(`   최대 사용 횟수: ${MAX_USES}회`);
  console.log(`   쿠폰 만료일: ${EXPIRES || '무제한'}`);
  console.log('');

  // 중복 없는 코드 생성
  const codes = new Set();
  while (codes.size < COUNT) {
    codes.add(`${PREFIX}-${randomSuffix(8)}`);
  }
  const codeList = Array.from(codes);

  const now = admin.firestore.Timestamp.now();
  const expiresAt = EXPIRES
    ? admin.firestore.Timestamp.fromDate(new Date(`${EXPIRES}T23:59:59+09:00`))
    : null;

  // Firestore 배치 쓰기 (400개씩 청크)
  const CHUNK = 400;
  let written = 0;

  for (let i = 0; i < codeList.length; i += CHUNK) {
    const batch = db.batch();
    const chunk = codeList.slice(i, i + CHUNK);

    for (const code of chunk) {
      const data = {
        code,
        type: TYPE,
        durationDays: DAYS,
        maxUses: MAX_USES,
        usedCount: 0,
        usedBy: [],
        createdAt: now,
        isActive: true,
      };
      if (expiresAt) data.expiresAt = expiresAt;

      batch.set(db.collection('coupons').doc(code), data);
    }

    await batch.commit();
    written += chunk.length;
    process.stdout.write(`\r   Firestore 저장: ${written}/${codeList.length}`);
  }

  console.log('\n');

  // 텍스트 파일로 저장
  const date = new Date().toISOString().slice(0, 10);
  const filename = `coupon_codes_${PREFIX}_${date}.txt`;
  const outputPath = `${__dirname}/${filename}`;
  fs.writeFileSync(outputPath, codeList.join('\n') + '\n', 'utf8');

  console.log(`✅ ${COUNT}개 쿠폰 생성 완료!`);
  console.log(`   저장 위치: ${outputPath}`);
  console.log('');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ 오류 발생:', err.message);
  process.exit(1);
});

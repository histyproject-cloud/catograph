const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// ── 포트원 API 설정 ──
// TODO: Firebase 환경변수로 설정
// firebase functions:config:set portone.imp_key="YOUR_IMP_KEY" portone.imp_secret="YOUR_IMP_SECRET"
const IMP_KEY = functions.config().portone?.imp_key || '';
const IMP_SECRET = functions.config().portone?.imp_secret || '';

// 포트원 액세스 토큰 발급
async function getPortoneToken() {
  const res = await axios.post('https://api.iamport.kr/users/getToken', {
    imp_key: IMP_KEY,
    imp_secret: IMP_SECRET,
  });
  return res.data.response.access_token;
}

// ── 1. 구독 시작 (빌링키 발급 후 첫 결제) ──
exports.startSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요해요');

  const uid = context.auth.uid;
  const { customer_uid, imp_uid } = data;

  try {
    const token = await getPortoneToken();

    // 첫 결제 검증
    const paymentRes = await axios.get(`https://api.iamport.kr/payments/${imp_uid}`, {
      headers: { Authorization: token },
    });
    const payment = paymentRes.data.response;

    if (payment.status !== 'paid') {
      throw new functions.https.HttpsError('internal', '결제가 완료되지 않았어요');
    }

    // Firestore 구독 정보 저장
    const now = admin.firestore.Timestamp.now();
    const trialEndsAt = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const currentPeriodEnd = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.collection('users').doc(uid).set({
      subscription: {
        status: 'active',
        customer_uid,
        imp_uid,
        startedAt: now,
        currentPeriodEnd,
        amount: 3300,
      }
    }, { merge: true });

    return { success: true };
  } catch (err) {
    console.error('startSubscription error:', err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

// ── 2. 무료 체험 시작 ──
exports.startTrial = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요해요');

  const uid = context.auth.uid;

  // 이미 체험/구독 이력 있는지 확인
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists && userDoc.data()?.subscription) {
    throw new functions.https.HttpsError('already-exists', '이미 체험을 사용했어요');
  }

  const trialEndsAt = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.collection('users').doc(uid).set({
    subscription: {
      status: 'trial',
      trialEndsAt,
      startedAt: admin.firestore.Timestamp.now(),
    }
  }, { merge: true });

  return { success: true, trialEndsAt };
});

// ── 3. 정기결제 웹훅 (포트원 → 서버) ──
exports.subscriptionWebhook = functions.https.onRequest(async (req, res) => {
  const { imp_uid, merchant_uid, status } = req.body;

  try {
    const token = await getPortoneToken();
    const paymentRes = await axios.get(`https://api.iamport.kr/payments/${imp_uid}`, {
      headers: { Authorization: token },
    });
    const payment = paymentRes.data.response;
    const customer_uid = payment.customer_uid;

    if (!customer_uid) return res.status(400).send('No customer_uid');

    // customer_uid로 유저 찾기
    const usersSnap = await db.collection('users')
      .where('subscription.customer_uid', '==', customer_uid)
      .limit(1).get();

    if (usersSnap.empty) return res.status(404).send('User not found');

    const userRef = usersSnap.docs[0].ref;
    const currentPeriodEnd = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (status === 'paid') {
      await userRef.update({
        'subscription.status': 'active',
        'subscription.imp_uid': imp_uid,
        'subscription.currentPeriodEnd': currentPeriodEnd,
        'subscription.lastPaidAt': admin.firestore.Timestamp.now(),
      });
    } else if (status === 'failed') {
      await userRef.update({ 'subscription.status': 'expired' });
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('webhook error:', err);
    res.status(500).send(err.message);
  }
});

// ── 4. 구독 취소 ──
exports.cancelSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요해요');

  const uid = context.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  const subscription = userDoc.data()?.subscription;

  if (!subscription) throw new functions.https.HttpsError('not-found', '구독 정보가 없어요');

  // 포트원 정기결제 중단 (다음 결제 안 되게)
  try {
    const token = await getPortoneToken();
    await axios.delete(`https://api.iamport.kr/subscribe/customers/${subscription.customer_uid}`, {
      headers: { Authorization: token },
    });
  } catch (err) {
    console.warn('포트원 빌링키 삭제 실패 (이미 삭제됐을 수 있음):', err.message);
  }

  // 상태를 cancelled로 — currentPeriodEnd까지는 이용 가능
  await db.collection('users').doc(uid).update({
    'subscription.status': 'cancelled',
    'subscription.cancelledAt': admin.firestore.Timestamp.now(),
  });

  return { success: true };
});

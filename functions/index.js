// deploy trigger 2026-04-24
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase-admin/app");
const { defineSecret } = require("firebase-functions/params");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "asia-northeast3" });

const db = getFirestore();
const storage = getStorage();
const TOSS_SECRET_KEY = defineSecret("TOSS_SECRET_KEY");

// batch 500개 제한 처리용 헬퍼
async function deleteInBatches(refs) {
  const CHUNK = 400;
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = db.batch();
    refs.slice(i, i + CHUNK).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

/**
 * 회원 탈퇴 함수
 * 호출 시 해당 유저의 모든 Firestore 데이터 + Storage 파일 + Auth 계정 삭제
 */
exports.deleteAccount = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const uid = request.auth.uid;

  try {
    // 1. 해당 유저의 프로젝트 목록 조회
    const projectsSnap = await db
      .collection("projects")
      .where("ownerId", "==", uid)
      .get();

    const projectIds = projectsSnap.docs.map((d) => d.id);

    const COLLECTIONS = [
      "characters",
      "relations",
      "foreshadows",
      "worldDocs",
      "timelineEvents",
      "fanworks",
    ];

    for (const projectId of projectIds) {
      // 2. Storage 캐릭터 사진 먼저 삭제 (Firestore 삭제 전에)
      const charsSnap = await db
        .collection("characters")
        .where("projectId", "==", projectId)
        .get();

      for (const charDoc of charsSnap.docs) {
        if (charDoc.data().photoURL) {
          try {
            await storage
              .bucket()
              .file(`characters/${charDoc.id}/photo`)
              .delete();
          } catch {
            // 파일 없으면 무시
          }
        }
      }

      // 3. 서브컬렉션 일괄 삭제 (500개 제한 처리)
      for (const col of COLLECTIONS) {
        const snap = await db
          .collection(col)
          .where("projectId", "==", projectId)
          .get();

        if (!snap.empty) {
          await deleteInBatches(snap.docs.map((d) => d.ref));
        }
      }
    }

    // 4. 프로젝트 문서 삭제
    if (!projectsSnap.empty) {
      await deleteInBatches(projectsSnap.docs.map((d) => d.ref));
    }

    // 5. 유저 문서 삭제
    await db.collection("users").doc(uid).delete();

    // 6. Firebase Auth 계정 삭제
    await getAuth().deleteUser(uid);

    return { success: true };
  } catch (err) {
    console.error("deleteAccount error:", err);
    throw new HttpsError("internal", "탈퇴 처리 중 오류가 발생했습니다.");
  }
});

/**
 * 빌링키 발급 함수
 * 클라이언트에서 authKey 받아서 토스 서버에 billingKey 발급 요청
 */
exports.issueBillingKey = onCall({ secrets: [TOSS_SECRET_KEY], cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { authKey, customerKey } = request.data;
  if (!authKey || !customerKey) {
    throw new HttpsError("invalid-argument", "authKey, customerKey가 필요합니다.");
  }

  try {
    const response = await fetch(
      `https://api.tosspayments.com/v1/billing/authorizations/${authKey}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY.value() + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerKey }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("토스 빌링키 발급 실패:", data);
      throw new HttpsError("internal", data.message || "빌링키 발급 실패");
    }

    // billingKey를 Firestore에 저장 (uid = customerKey)
    await db.collection("users").doc(request.auth.uid).update({
      "subscription.billingKey": data.billingKey,
      "subscription.cardCompany": data.card?.company || "",
      "subscription.cardNumber": data.card?.number || "",
    });

    return { success: true, billingKey: data.billingKey };
  } catch (err) {
    console.error("issueBillingKey error:", err);
    throw new HttpsError("internal", "빌링키 발급 중 오류가 발생했습니다.");
  }
});

/**
 * 매일 오전 9시 자동결제 스케줄러
 * currentPeriodEnd가 오늘인 유저에게 빌링키로 자동 청구
 */
exports.billingScheduler = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Asia/Seoul", secrets: [TOSS_SECRET_KEY], region: "asia-northeast3" },
  async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // 오늘 결제일인 active 유저 조회
    const usersSnap = await db.collection("users")
      .where("subscription.status", "==", "active")
      .where("subscription.currentPeriodEnd", ">=", todayStart)
      .where("subscription.currentPeriodEnd", "<", todayEnd)
      .get();

    console.log(`오늘 결제 대상: ${usersSnap.size}명`);

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const sub = userDoc.data().subscription || {};
      const billingKey = sub.billingKey;
      const pendingPlan = sub.pendingPlan || null;
      const newPlan = pendingPlan || sub.plan || "monthly";
      const isYearly = newPlan === "yearly";
      const amount = isYearly ? 29700 : 3300;

      if (!billingKey) {
        console.warn(`빌링키 없음: ${uid}`);
        continue;
      }

      try {
        // 토스 자동결제 승인 API 호출
        const orderId = `auto_${uid}_${Date.now()}`;
        const response = await fetch("https://api.tosspayments.com/v1/billing/" + billingKey, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY.value() + ":").toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerKey: uid,
            amount,
            orderId,
            orderName: `Cartographic Pro ${isYearly ? "연간" : "월간"}`,
            customerEmail: userDoc.data().email || "",
            customerName: userDoc.data().displayName || "고객",
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error(`결제 실패 [${uid}]:`, result);
          // 결제 실패 시 구독 상태 past_due로 변경
          await db.collection("users").doc(uid).update({
            "subscription.status": "past_due",
            "subscription.lastFailedAt": FieldValue.serverTimestamp(),
            "subscription.lastFailReason": result.message || "결제 실패",
          });
          continue;
        }

        // 결제 성공 → 다음 결제일 갱신
        const nextPeriodEnd = new Date(now);
        if (isYearly) {
          nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
        } else {
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
        }

        await db.collection("users").doc(uid).update({
          "subscription.status": "active",
          "subscription.plan": newPlan,
          "subscription.currentPeriodEnd": nextPeriodEnd,
          "subscription.lastPaidAt": FieldValue.serverTimestamp(),
          "subscription.lastOrderId": orderId,
          "subscription.pendingPlan": FieldValue.delete(),
        });

        console.log(`결제 성공 [${uid}]: ${amount}원 → 다음 결제일 ${nextPeriodEnd.toISOString()}`);

      } catch (err) {
        console.error(`스케줄러 오류 [${uid}]:`, err);
      }
    }
  }
);

/**
 * 토스페이먼츠 웹훅 수신
 * 결제 성공 시 구독 갱신 + pendingPlan 처리
 */
const TOSS_IPS = new Set([
  "13.124.18.147", "13.124.108.35", "3.36.173.151", "3.38.81.32",
  "115.92.221.121", "115.92.221.122", "115.92.221.123",
  "115.92.221.125", "115.92.221.126", "115.92.221.127",
]);

exports.tossWebhook = onRequest(
  { secrets: [TOSS_SECRET_KEY], region: "asia-northeast3" },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

    // 토스 IP 검증
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip;
    if (!TOSS_IPS.has(clientIp)) {
      console.warn("허용되지 않은 IP:", clientIp);
      res.status(403).send("Forbidden");
      return;
    }

    const event = req.body;
    console.log("토스 웹훅 수신:", JSON.stringify(event));

    try {
      const { eventType, data } = event;

      // 정기결제 성공
      if (eventType === "PAYMENT_STATUS_CHANGED" && data?.status === "DONE") {
        const customerKey = data.customerKey;
        if (!customerKey) { res.status(200).send("ok"); return; }

        // customerKey = uid로 유저 조회
        const userRef = db.collection("users").doc(customerKey);
        const userSnap = await userRef.get();
        if (!userSnap.exists) { res.status(200).send("ok"); return; }

        const sub = userSnap.data()?.subscription || {};
        const pendingPlan = sub.pendingPlan || null;

        // pendingPlan이 있으면 플랜 전환, 없으면 현재 플랜 유지
        const newPlan = pendingPlan || sub.plan || "monthly";
        const isYearly = newPlan === "yearly";

        const now = new Date();
        const periodEnd = new Date(now);
        if (isYearly) {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        await userRef.update({
          "subscription.status": "active",
          "subscription.plan": newPlan,
          "subscription.currentPeriodEnd": periodEnd,
          "subscription.lastPaidAt": FieldValue.serverTimestamp(),
          "subscription.pendingPlan": FieldValue.delete(), // 예약 초기화
        });

        console.log(`구독 갱신 완료: ${customerKey} → ${newPlan}`);
      }

      res.status(200).send("ok");
    } catch (err) {
      console.error("tossWebhook error:", err);
      res.status(500).send("error");
    }
  }
);

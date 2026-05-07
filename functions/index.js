// deploy trigger 2026-04-27
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getAuth } = require("firebase-admin/auth");
const { initializeApp, getApp } = require("firebase-admin/app");
const { defineSecret } = require("firebase-functions/params");
const { v1: firestoreV1 } = require("@google-cloud/firestore");

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

function requireString(value, name, maxLength) {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${name} 형식이 올바르지 않습니다.`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new HttpsError("invalid-argument", `${name} 형식이 올바르지 않습니다.`);
  }
  return trimmed;
}

function requireBoolean(value, name) {
  if (typeof value !== "boolean") {
    throw new HttpsError("invalid-argument", `${name} 형식이 올바르지 않습니다.`);
  }
  return value;
}

function assertPrintableAscii(value, name) {
  if (!/^[\x21-\x7E]+$/.test(value)) {
    throw new HttpsError("invalid-argument", `${name} 형식이 올바르지 않습니다.`);
  }
}

/**
 * 회원 탈퇴 함수
 * 호출 시 해당 유저의 모든 Firestore 데이터 + Storage 파일 + Auth 계정 삭제
 */
exports.deleteAccount = onCall({ cors: true, secrets: [TOSS_SECRET_KEY] }, async (request) => {
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

      // photoURL 필드 여부와 무관하게 항상 삭제 시도 (없으면 무시)
      // → 업로드됐지만 photoURL 미반영된 엣지 케이스까지 커버
      for (const charDoc of charsSnap.docs) {
        try {
          await storage
            .bucket()
            .file(`characters/${charDoc.id}/photo`)
            .delete();
        } catch {
          // 파일 없으면 무시
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

    // 5. 토스페이먼츠 빌링키 해제 (있을 경우)
    const userDoc = await db.collection("users").doc(uid).get();
    const billingKey = userDoc.data()?.subscription?.billingKey;
    if (billingKey) {
      try {
        await fetch(`https://api.tosspayments.com/v1/billing/authorizations/${billingKey}/cancel`, {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY.value() + ":").toString("base64")}`,
          },
        });
      } catch {
        // 빌링키 해제 실패해도 탈퇴는 계속 진행
      }
    }

    // 6. _system 쿠폰 시도 기록 삭제
    try {
      await db.collection("_system").doc(`coupon_attempts_${uid}`).delete();
    } catch { /* 없으면 무시 */ }

    // 7. 유저 문서 삭제
    await db.collection("users").doc(uid).delete();

    // 8. Firebase Auth 계정 삭제
    await getAuth().deleteUser(uid);

    return { success: true };
  } catch (err) {
    console.error("deleteAccount error:", err);
    throw new HttpsError("internal", "탈퇴 처리 중 오류가 발생했습니다.");
  }
});

/**
 * 빌링키 발급 + 구독 활성화 함수
 * - authKey로 Toss 빌링키 발급
 * - 구독 정보(status, plan, currentPeriodEnd 등)를 Firestore에 통합 저장
 * - 클라이언트(PaymentSuccess)에서 직접 subscription 필드를 쓰지 않도록 책임 이전
 */
exports.issueBillingKey = onCall({ secrets: [TOSS_SECRET_KEY], cors: true, minInstances: 1 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const uid = request.auth.uid;
  const payload = request.data || {};
  const authKey = requireString(payload.authKey, "authKey", 512);
  const customerKey = requireString(payload.customerKey, "customerKey", 128);
  const yearly = requireBoolean(payload.yearly, "yearly");
  const orderId = payload.orderId === undefined || payload.orderId === null
    ? null
    : requireString(payload.orderId, "orderId", 128);

  assertPrintableAscii(authKey, "authKey");
  if (orderId) assertPrintableAscii(orderId, "orderId");

  // customerKey는 uid와 일치해야 함
  if (customerKey !== uid) {
    throw new HttpsError("invalid-argument", "customerKey가 유효하지 않습니다.");
  }

  // ── 중복 실행 방지: 이미 같은 orderId로 처리된 경우 스킵 ──
  if (orderId) {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists && userDoc.data()?.subscription?.lastOrderId === orderId) {
      console.log(`issueBillingKey 중복 스킵: ${orderId}`);
      return { success: true, alreadyProcessed: true };
    }
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

    // ── 신규 사용자 vs 재구독 판별 ──
    // 다음 중 하나라도 해당하면 "재구독자" → 즉시 결제 (trial 없음)
    //   - hasUsedTrial: true  (이미 무료 체험을 받은 적 있음)
    //   - couponCode 사용 이력  (쿠폰 사용자)
    //   - lastPaidAt 존재  (한 번이라도 결제한 적 있음)
    //   - cancelledAt 존재  (해지 후 재구독)
    const userDocSnap = await db.collection("users").doc(uid).get();
    const existingSub = userDocSnap.data()?.subscription || {};
    const isReturning =
      existingSub.hasUsedTrial === true
      || !!existingSub.couponCode
      || !!existingSub.lastPaidAt
      || !!existingSub.cancelledAt;

    const now = new Date();
    const amountFinal = yearly ? 29900 : 3300;
    let periodEnd, status, trialEndsAt = null;
    let immediatePayment = null; // 재구독자 즉시 결제 결과

    if (isReturning) {
      // ── 재구독자: 즉시 결제 1회 호출 ──
      const chargeOrderId = `recurring_${uid}_${Date.now()}`;
      const chargeRes = await fetch(
        `https://api.tosspayments.com/v1/billing/${data.billingKey}`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY.value() + ":").toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerKey: uid,
            amount: amountFinal,
            orderId: chargeOrderId,
            orderName: `Cartographic Pro ${yearly ? "연간" : "월간"}`,
            customerEmail: userDocSnap.data()?.email || "",
            customerName: userDocSnap.data()?.displayName || "고객",
          }),
        }
      );
      const chargeResult = await chargeRes.json();
      if (!chargeRes.ok) {
        console.error("재구독 즉시 결제 실패:", chargeResult);
        // 빌링키 자체는 발급 됐으므로 cancel 시도
        try {
          await fetch(`https://api.tosspayments.com/v1/billing/authorizations/${data.billingKey}/cancel`, {
            method: "DELETE",
            headers: { Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY.value() + ":").toString("base64")}` },
          });
        } catch {}
        throw new HttpsError("internal", chargeResult.message || "결제에 실패했어요. 카드를 확인해 주세요.");
      }
      immediatePayment = { ...chargeResult, orderId: chargeOrderId };
      periodEnd = new Date(now);
      if (yearly) periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);
      status = "active";
    } else {
      // ── 신규 사용자: 30일 무료 체험 ──
      // 빌링키만 발급, 즉시 청구 없음. 30일 후 billingScheduler가 첫 결제.
      periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30); // trial 종료 = 첫 결제일
      trialEndsAt = periodEnd;
      status = "trial";
    }

    // 빌링키 발급 성공 → subscription 전체를 Cloud Function에서 통합 저장
    await db.collection("users").doc(uid).set({
      subscription: {
        status,
        plan: yearly ? "yearly" : "monthly",
        amount: amountFinal,
        billingKey: data.billingKey,
        cardCompany: data.card?.company || "",
        cardNumber: data.card?.number || "",
        lastOrderId: orderId || null,
        startedAt: FieldValue.serverTimestamp(),
        currentPeriodEnd: periodEnd,
        trialEndsAt: trialEndsAt || FieldValue.delete(),
        hasUsedTrial: true, // 한번이라도 발급 받으면 영구 마킹 (재구독 판별용)
        // 재구독자만 첫 결제 정보 저장
        ...(immediatePayment ? { lastPaidAt: FieldValue.serverTimestamp() } : {}),
        // ── 이전 상태 잔존 필드 정리 ──
        cancelledAt: FieldValue.delete(),
        lastFailedAt: FieldValue.delete(),
        lastFailReason: FieldValue.delete(),
        pendingPlan: FieldValue.delete(),
        couponCode: FieldValue.delete(),
        couponDays: FieldValue.delete(),
        couponLabel: FieldValue.delete(),
      }
    }, { merge: true });

    // 결제 이력 기록
    if (isReturning) {
      // 재구독자 — 즉시 결제 성공
      await db.collection("payments").add({
        uid,
        type: "recurring_first_payment",
        orderId: immediatePayment.orderId,
        amount: amountFinal,
        plan: yearly ? "yearly" : "monthly",
        paymentKey: immediatePayment.paymentKey || "",
        method: immediatePayment.method || "CARD",
        approvedAt: immediatePayment.approvedAt || null,
        receiptUrl: immediatePayment.receipt?.url || "",
        cardCompany: data.card?.company || "",
        cardNumber: data.card?.number || "",
        currentPeriodEnd: periodEnd,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      // 신규 사용자 — trial 시작
      await db.collection("payments").add({
        uid,
        type: "trial_started",
        orderId: orderId || null,
        amount: 0,
        plan: yearly ? "yearly" : "monthly",
        isTrial: true,
        trialEndsAt,
        cardCompany: data.card?.company || "",
        cardNumber: data.card?.number || "",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    console.log(`issueBillingKey 완료: ${uid} / ${isReturning ? "재구독(즉시결제)" : "신규(30일 trial)"} / ${yearly ? "연간" : "월간"} / ${periodEnd.toISOString()}`);
    return { success: true, isTrial: !isReturning };
  } catch (err) {
    console.error("issueBillingKey error:", err);
    if (err instanceof HttpsError) throw err;
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

    // currentPeriodEnd가 오늘 또는 그 이전인 active/trial 유저 조회
    // - active: 정기 결제일 도래
    // - trial: 무료 체험 종료 → 첫 결제
    // (스케줄러 실패로 누락된 과거 결제일까지 catch — 결제 성공 시
    //  currentPeriodEnd가 미래로 갱신되므로 다음 실행에선 자동 제외됨)
    const [activeSnap, trialSnap] = await Promise.all([
      db.collection("users")
        .where("subscription.status", "==", "active")
        .where("subscription.currentPeriodEnd", "<", todayEnd)
        .get(),
      db.collection("users")
        .where("subscription.status", "==", "trial")
        .where("subscription.currentPeriodEnd", "<", todayEnd)
        .get(),
    ]);
    const usersSnap = { docs: [...activeSnap.docs, ...trialSnap.docs], size: activeSnap.size + trialSnap.size };

    console.log(`오늘 결제 대상: ${usersSnap.size}명`);

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const sub = userDoc.data().subscription || {};
      const billingKey = sub.billingKey;
      const pendingPlan = sub.pendingPlan || null;
      const newPlan = pendingPlan || sub.plan || "monthly";
      const isYearly = newPlan === "yearly";
      const amount = isYearly ? 29900 : 3300;

      if (!billingKey) {
        // 빌링키 없음 = 쿠폰/edu trial 사용자가 만료일에 도달
        // → 구독 상태를 'expired'로 변경 (Free 플랜으로 자동 전환)
        if (sub.couponCode) {
          await db.collection("users").doc(uid).update({
            "subscription.status": "expired",
            "subscription.expiredAt": FieldValue.serverTimestamp(),
          });
          await db.collection("payments").add({
            uid,
            type: "coupon_expired",
            couponCode: sub.couponCode,
            createdAt: FieldValue.serverTimestamp(),
          });
          console.log(`쿠폰 만료 처리: ${uid} (${sub.couponCode})`);
        } else if (userDoc.data().hasUsedEduTrial) {
          // 대학생 3개월 무료 체험 만료 → 청구 없이 Free 전환
          await db.collection("users").doc(uid).update({
            "subscription.status": "expired",
            "subscription.expiredAt": FieldValue.serverTimestamp(),
          });
          await db.collection("payments").add({
            uid,
            type: "edu_trial_expired",
            createdAt: FieldValue.serverTimestamp(),
          });
          console.log(`대학생 무료체험 만료: ${uid}`);
        } else {
          console.warn(`빌링키 없음: ${uid}`);
        }
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
          // 결제 이력 기록 (실패)
          await db.collection("payments").add({
            uid,
            type: "auto_billing_failed",
            orderId,
            amount,
            plan: newPlan,
            errorMessage: result.message || "결제 실패",
            errorCode: result.code || "",
            createdAt: FieldValue.serverTimestamp(),
          });
          continue;
        }

        // 결제 성공 → 다음 결제일 갱신 (이전 결제일 기준으로 계산해 drift 방지)
        const base = sub.currentPeriodEnd?.toDate?.() || now;
        const nextPeriodEnd = new Date(base);
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
          // 이전 결제 실패 흔적 정리
          "subscription.lastFailedAt": FieldValue.delete(),
          "subscription.lastFailReason": FieldValue.delete(),
        });

        // 결제 이력 기록 (성공)
        await db.collection("payments").add({
          uid,
          type: "auto_billing",
          orderId,
          amount,
          plan: newPlan,
          paymentKey: result.paymentKey || "",
          method: result.method || "CARD",
          approvedAt: result.approvedAt || null,
          receiptUrl: result.receipt?.url || "",
          nextPeriodEnd,
          createdAt: FieldValue.serverTimestamp(),
        });

        console.log(`결제 성공 [${uid}]: ${amount}원 → 다음 결제일 ${nextPeriodEnd.toISOString()}`);

      } catch (err) {
        console.error(`스케줄러 오류 [${uid}]:`, err);
      }
    }
  }
);

/**
 * 구독 해지 함수
 * 빌링키 해제 + Firestore status → cancelled (기간 만료 전까지 Pro 유지)
 */
exports.cancelSubscription = onCall({ secrets: [TOSS_SECRET_KEY], cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "사용자를 찾을 수 없습니다.");
  }

  const sub = userDoc.data()?.subscription || {};

  // active / trial / past_due 상태에서 해지 가능
  // - active: 정상 구독 해지
  // - trial: 무료 체험 해지 (자동 결제 방지)
  // - past_due: 결제 실패 후 해지
  if (!["active", "trial", "past_due"].includes(sub.status)) {
    throw new HttpsError("failed-precondition", "해지할 수 있는 활성 구독이 없습니다.");
  }

  const billingKey = sub.billingKey;
  if (billingKey) {
    try {
      await fetch(`https://api.tosspayments.com/v1/billing/authorizations/${billingKey}/cancel`, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY.value() + ":").toString("base64")}`,
        },
      });
      console.log(`빌링키 해제 완료: ${uid}`);
    } catch {
      console.warn(`빌링키 해제 실패 (계속 진행): ${uid}`);
    }
  }

  // status → cancelled, billingKey 삭제, pendingPlan 삭제
  // currentPeriodEnd는 유지 → isPro()가 기간까지 true 반환
  await db.collection("users").doc(uid).update({
    "subscription.status": "cancelled",
    "subscription.cancelledAt": FieldValue.serverTimestamp(),
    "subscription.billingKey": FieldValue.delete(),
    "subscription.pendingPlan": FieldValue.delete(),
  });

  // 결제 이력 기록 (해지)
  await db.collection("payments").add({
    uid,
    type: "subscription_cancelled",
    plan: sub.plan || "monthly",
    currentPeriodEnd: sub.currentPeriodEnd || null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

exports.monthlyFirestoreBackup = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    const { Storage } = require("@google-cloud/storage");
    const storage = new Storage();
    const bucket = storage.bucket("catograph-5d8f5.firebasestorage.app");

    const adminClient = new firestoreV1.FirestoreAdminClient();
    const projectId = process.env.GCLOUD_PROJECT;
    const databaseName = adminClient.databasePath(projectId, "(default)");
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC → KST
    const timestamp = kstNow.toISOString().slice(0, 10); // YYYY-MM-DD (KST 기준)
    const outputUriPrefix = `gs://catograph-5d8f5.firebasestorage.app/firestore-backups/${timestamp}`;

    try {
      const [operation] = await adminClient.exportDocuments({
        name: databaseName,
        outputUriPrefix,
        collectionIds: [],
      });
      console.log(`✅ 백업 시작: ${outputUriPrefix}`);
      console.log(`   Operation: ${operation.name}`);
    } catch (err) {
      console.error("백업 실패:", err);
      throw err;
    }

    // 7일 이상 된 백업 삭제
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const [files] = await bucket.getFiles({ prefix: "firestore-backups/" });
      const toDelete = files.filter(f => f.metadata.timeCreated && new Date(f.metadata.timeCreated) < cutoff);
      await Promise.all(toDelete.map(f => f.delete()));
      if (toDelete.length > 0) console.log(`🗑 오래된 백업 ${toDelete.length}개 삭제`);
    } catch (err) {
      console.warn("오래된 백업 삭제 실패 (무시):", err.message);
    }
  }
);

/**
 * 대학생 3개월 무료체험 적용
 * - .ac.kr / .edu 이메일 도메인 검증
 * - 90일 trial 설정 + hasUsedTrial = true (이후 30일 무료 차단)
 * - 빌링키 없이 만료 시 billingScheduler가 Free로 전환
 */
exports.applyEduTrial = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const uid = request.auth.uid;
  const email = (request.auth.token.email || "").toLowerCase();
  const emailVerified = request.auth.token.email_verified === true;
  const isEdu = email.endsWith(".ac.kr") || email.endsWith(".edu");

  if (!emailVerified) {
    throw new HttpsError("permission-denied", "인증된 이메일만 대학생 무료체험을 신청할 수 있습니다.");
  }

  if (!isEdu) {
    throw new HttpsError("invalid-argument", "대학 이메일(.ac.kr / .edu)이 아닙니다.");
  }

  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  const data = snap.data() || {};

  // 이미 edu trial 또는 다른 trial/구독 사용 이력 있으면 차단
  if (data.hasUsedEduTrial) {
    throw new HttpsError("already-exists", "대학생 무료체험은 1회만 사용할 수 있습니다.");
  }
  if (data.subscription?.status && data.subscription.status !== "expired") {
    throw new HttpsError("failed-precondition", "이미 구독 중이거나 체험 중입니다.");
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 90); // 90일 무료

  await userRef.update({
    hasUsedEduTrial: true,
    eduEmail: email,
    subscription: {
      status: "trial",
      plan: "monthly",
      trialEndsAt: trialEndsAt,
      currentPeriodEnd: trialEndsAt,
      startedAt: FieldValue.serverTimestamp(),
      hasUsedTrial: true, // 이후 TossPayments 30일 무료 차단
    },
  });

  console.log(`대학생 무료체험 적용: ${uid} (${email}) → ${trialEndsAt.toISOString().slice(0, 10)}까지`);
  return { success: true, trialEndsAt: trialEndsAt.toISOString() };
});

/**
 * 쿠폰 코드 적용
 * - 유효성 검사 후 subscription 업데이트
 * - Firestore 트랜잭션으로 동시 사용 방지
 */
exports.applyCoupon = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const uid = request.auth.uid;
  const code = requireString(request.data?.code, "coupon code", 64).toUpperCase();
  if (!/^[A-Z0-9-]{4,64}$/.test(code)) {
    throw new HttpsError("invalid-argument", "쿠폰 코드 형식이 올바르지 않습니다.");
  }

  // ── Brute force 방어: 1시간 내 5회 시도 제한 ──
  // (성공/실패 무관하게 모든 시도 기록 — 코드 추측 공격 차단)
  const ATTEMPT_LIMIT = 5;
  const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
  const attemptRef = db.collection("_system").doc(`coupon_attempts_${uid}`);
  await db.runTransaction(async (t) => {
    const snap = await t.get(attemptRef);
    const attempts = snap.data()?.attempts || [];
    const now = Date.now();
    const recent = attempts.filter((ts) => now - ts < ATTEMPT_WINDOW_MS);
    if (recent.length >= ATTEMPT_LIMIT) {
      throw new HttpsError(
        "resource-exhausted",
        "쿠폰 시도 횟수가 너무 많아요. 1시간 후 다시 시도해 주세요."
      );
    }
    t.set(attemptRef, { attempts: [...recent, now] }, { merge: true });
  });

  const couponRef = db.collection("coupons").doc(code);
  const userRef = db.collection("users").doc(uid);

  try {
    const periodEnd = await db.runTransaction(async (transaction) => {
      const [couponSnap, userSnap] = await Promise.all([
        transaction.get(couponRef),
        transaction.get(userRef),
      ]);

      // ── 쿠폰 존재 여부 ──
      if (!couponSnap.exists) {
        throw new HttpsError("not-found", "유효하지 않은 쿠폰 코드예요.");
      }

      const coupon = couponSnap.data();
      const maxUses = Number.isInteger(coupon.maxUses) ? coupon.maxUses : 0;
      const usedCount = Number.isInteger(coupon.usedCount) ? coupon.usedCount : 0;
      const durationDays = Number.isInteger(coupon.durationDays) ? coupon.durationDays : 365;

      // ── 쿠폰 활성화 여부 ──
      if (!coupon.isActive) {
        throw new HttpsError("failed-precondition", "사용할 수 없는 쿠폰 코드예요.");
      }

      if (maxUses < 1 || durationDays < 1 || durationDays > 3660) {
        throw new HttpsError("failed-precondition", "쿠폰 설정이 올바르지 않습니다.");
      }

      // ── 쿠폰 자체 만료일 ──
      if (coupon.expiresAt && coupon.expiresAt.toMillis() < Date.now()) {
        throw new HttpsError("failed-precondition", "기간이 만료된 쿠폰 코드예요.");
      }

      // ── 총 사용 횟수 ──
      if (usedCount >= maxUses) {
        throw new HttpsError("failed-precondition", "이미 모든 사용 횟수가 소진된 쿠폰이에요.");
      }

      // ── 이미 사용한 유저 ──
      if (coupon.usedBy?.includes(uid)) {
        throw new HttpsError("already-exists", "이미 사용한 쿠폰 코드예요.");
      }

      // ── 이미 유효한 구독 중 (active / trial / cancelled-기간내) ──
      const sub = userSnap.data()?.subscription || {};
      const isCurrentlyPro =
        (sub.status === "active" || sub.status === "trial" || sub.status === "cancelled") &&
        sub.currentPeriodEnd?.toMillis?.() > Date.now();
      if (isCurrentlyPro) {
        throw new HttpsError(
          "failed-precondition",
          sub.status === "trial"
            ? "무료 체험 중에는 쿠폰을 사용할 수 없어요. 체험 종료 후 다시 시도해 주세요."
            : "이미 구독 중이에요. 현재 구독이 만료된 후 사용할 수 있어요."
        );
      }

      // ── 쿠폰 적용 ──
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + durationDays);

      const couponDays = durationDays;
      transaction.set(
        userRef,
        {
          subscription: {
            status: "active",
            plan: "coupon",       // 쿠폰 전용 plan으로 구분 (yearly/monthly와 별개)
            couponCode: code,     // 쿠폰 코드
            couponDays,           // 쿠폰 기간 (일수) — 라벨 동적 표시용
            couponLabel: coupon.label || `${couponDays}일권`, // 표시용 라벨
            currentPeriodEnd: end,
            startedAt: FieldValue.serverTimestamp(),
            hasUsedTrial: true,   // 쿠폰 사용자도 이후 Toss 30일 trial 차단
            // ── 이전 결제/해지 잔존 필드 정리 ──
            // (쿠폰은 이전 구독이 만료된 후에만 적용 가능하므로
            //  billingKey 등은 살아있으면 안 됨)
            billingKey: FieldValue.delete(),
            cardCompany: FieldValue.delete(),
            cardNumber: FieldValue.delete(),
            lastOrderId: FieldValue.delete(),
            lastPaidAt: FieldValue.delete(),
            cancelledAt: FieldValue.delete(),
            lastFailedAt: FieldValue.delete(),
            lastFailReason: FieldValue.delete(),
            pendingPlan: FieldValue.delete(),
            amount: FieldValue.delete(),
          },
        },
        { merge: true }
      );

      transaction.update(couponRef, {
        usedCount: FieldValue.increment(1),
        usedBy: FieldValue.arrayUnion(uid),
      });

      return end;
    });

    // 결제 이력 기록 (쿠폰)
    await db.collection("payments").add({
      uid,
      type: "coupon_applied",
      couponCode: code,
      currentPeriodEnd: periodEnd,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`쿠폰 적용 완료: ${uid} / ${code} / ${periodEnd.toISOString()}`);
    return { success: true };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("applyCoupon error:", err);
    throw new HttpsError("internal", "쿠폰 적용 중 오류가 발생했습니다.");
  }
});

/**
 * 플랜 전환 예약 취소
 * pendingPlan 필드 삭제
 */
exports.cancelPendingPlan = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  const uid = request.auth.uid;
  await db.collection("users").doc(uid).update({
    "subscription.pendingPlan": FieldValue.delete(),
  });
  return { success: true };
});

/**
 * 토스페이먼츠 웹훅 수신
 * 결제 성공 시 구독 갱신 + pendingPlan 처리
 */
const TOSS_IPS = new Set([
  "13.124.18.147", "13.124.108.35", "3.36.173.151", "3.38.81.32",
  "115.92.221.121", "115.92.221.122", "115.92.221.123",
  "115.92.221.125", "115.92.221.126", "115.92.221.127",
]);

// GCP HTTPS Load Balancer는 X-Forwarded-For 끝에 두 항목을 append 한다:
//   "<existing>, <client_ip>, <lb_ip>"
// → 끝에서 두 번째 항목이 LB가 본 신뢰 가능한 client IP.
//   클라이언트가 보낸 XFF 첫 번째 값을 그대로 신뢰하면 IP 위조로 우회됨.
function getTrustedClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff && typeof xff === "string") {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
  }
  return null;
}

// 토스 결제 조회 API 로 webhook 페이로드 진정성 검증.
// (PAYMENT_STATUS_CHANGED 웹훅에는 시그니처가 없으므로 결제 조회 API 호출이
//  실질적인 진정성 보증 수단이 된다. paymentKey 가 토스에 실제 존재하고
//  customerKey/status/amount 가 webhook payload 와 일치해야 정당한 webhook.)
async function fetchTossPayment(paymentKey, secretKey) {
  const auth = "Basic " + Buffer.from(`${secretKey}:`).toString("base64");
  const r = await fetch(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
    { headers: { Authorization: auth, "Content-Type": "application/json" } }
  );
  if (!r.ok) {
    const err = new Error(`Toss API ${r.status}`);
    // 5xx 또는 404 는 잠시 후 재조회로 회복 가능 → Toss 재시도에 맡긴다
    err.transient = r.status >= 500 || r.status === 404;
    throw err;
  }
  return await r.json();
}

exports.tossWebhook = onRequest(
  { secrets: [TOSS_SECRET_KEY], region: "asia-northeast3", minInstances: 1 },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

    // 1차 필터: 토스 발신 IP 검증 (XFF 위조 방어 — getTrustedClientIp 사용)
    const clientIp = getTrustedClientIp(req);
    if (!clientIp || !TOSS_IPS.has(clientIp)) {
      console.warn("허용되지 않은 IP:", clientIp || "missing trusted XFF");
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
        const incomingOrderId = data.orderId;
        const incomingPaymentKey = data.paymentKey;
        if (!customerKey || !incomingOrderId || !incomingPaymentKey) {
          // 식별자가 없는 이벤트는 무시 (재시도 X)
          res.status(200).send("ok");
          return;
        }

        // billingScheduler가 직접 결제하고 Firestore 업데이트까지 처리하는 orderId → 웹훅은 스킵
        // (auto_ prefix = 스케줄러 생성 orderId, 이중 처리 방지)
        if (incomingOrderId?.startsWith("auto_")) {
          console.log(`스케줄러 처리 orderId 스킵: ${incomingOrderId}`);
          res.status(200).send("ok");
          return;
        }

        // 2차 검증: 토스 결제 조회 API로 webhook 페이로드 진정성 검증
        // (IP 우회 + payload 위조 시나리오를 차단하는 핵심 방어선)
        let verified;
        try {
          verified = await fetchTossPayment(incomingPaymentKey, TOSS_SECRET_KEY.value());
        } catch (err) {
          console.error("Toss 결제 조회 실패:", err.message, "transient:", err.transient);
          // transient 면 503 으로 토스 재시도 유도, 영구 실패면 400
          res.status(err.transient ? 503 : 400).send("Payment verification failed");
          return;
        }

        if (verified.customerKey !== customerKey) {
          console.error(`customerKey 불일치 webhook=${customerKey} toss=${verified.customerKey}`);
          res.status(400).send("customerKey mismatch");
          return;
        }

        if (verified.status !== "DONE") {
          console.error(`Toss status 불일치 webhook=DONE toss=${verified.status}`);
          res.status(400).send("status mismatch");
          return;
        }

        if (verified.orderId !== incomingOrderId) {
          console.error(`orderId 불일치 webhook=${incomingOrderId} toss=${verified.orderId}`);
          res.status(400).send("orderId mismatch");
          return;
        }

        // customerKey = uid로 유저 조회
        const userRef = db.collection("users").doc(customerKey);
        const paymentDocId = encodeURIComponent(incomingPaymentKey);
        const processedRef = db.collection("_system").doc(`processed_payment_${paymentDocId}`);
        const paymentRef = db.collection("payments").doc(paymentDocId);

        const result = await db.runTransaction(async (transaction) => {
          const processedSnap = await transaction.get(processedRef);
          if (processedSnap.exists) {
            return { skipped: true, reason: "paymentKey already processed" };
          }

          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists) {
            transaction.set(processedRef, {
              uid: customerKey,
              orderId: incomingOrderId,
              paymentKey: incomingPaymentKey,
              skipped: true,
              reason: "user_not_found",
              createdAt: FieldValue.serverTimestamp(),
            });
            return { skipped: true, reason: "user not found" };
          }

          const sub = userSnap.data()?.subscription || {};

          // ── idempotency: 이미 처리한 orderId면 스킵하되 paymentKey도 처리 완료로 마킹 ──
          if (sub.lastOrderId === incomingOrderId) {
            transaction.set(processedRef, {
              uid: customerKey,
              orderId: incomingOrderId,
              paymentKey: incomingPaymentKey,
              skipped: true,
              reason: "orderId already processed",
              createdAt: FieldValue.serverTimestamp(),
            });
            return { skipped: true, reason: "orderId already processed" };
          }

          const pendingPlan = sub.pendingPlan || null;
          const newPlan = pendingPlan || sub.plan || "monthly";
          const isYearly = newPlan === "yearly";

          // 결제 금액 재검증 (defense in depth — Toss API 응답 기준)
          const expectedAmount = isYearly ? 29900 : 3300;
          if (verified.totalAmount !== expectedAmount) {
            const err = new Error("Invalid amount");
            err.statusCode = 400;
            err.publicMessage = "Invalid amount";
            err.details = { newPlan, expectedAmount };
            throw err;
          }

          const now = new Date();
          // 이전 결제일 기준으로 계산해 drift 방지
          const base = sub.currentPeriodEnd?.toDate?.() || now;
          const periodEnd = new Date(base);
          if (isYearly) {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          transaction.update(userRef, {
            "subscription.status": "active",
            "subscription.plan": newPlan,
            "subscription.currentPeriodEnd": periodEnd,
            "subscription.lastPaidAt": FieldValue.serverTimestamp(),
            "subscription.lastOrderId": incomingOrderId,
            "subscription.pendingPlan": FieldValue.delete(), // 예약 초기화
            // 이전 결제 실패 흔적 정리
            "subscription.lastFailedAt": FieldValue.delete(),
            "subscription.lastFailReason": FieldValue.delete(),
          });

          transaction.set(processedRef, {
            uid: customerKey,
            orderId: incomingOrderId,
            paymentKey: incomingPaymentKey,
            amount: verified.totalAmount,
            processedAt: FieldValue.serverTimestamp(),
          });

          // 결제 이력 기록 (웹훅 경유, 토스 API 검증 응답 기준)
          transaction.set(paymentRef, {
            uid: customerKey,
            type: "webhook_payment",
            orderId: incomingOrderId,
            amount: verified.totalAmount,
            plan: newPlan,
            paymentKey: incomingPaymentKey,
            method: verified.method || data.method || "CARD",
            approvedAt: verified.approvedAt || data.approvedAt || null,
            receiptUrl: verified.receipt?.url || data.receipt?.url || "",
            nextPeriodEnd: periodEnd,
            createdAt: FieldValue.serverTimestamp(),
          });

          return { skipped: false, newPlan };
        });

        if (result.skipped) {
          console.log(`웹훅 중복/스킵: ${incomingOrderId} (${result.reason})`);
        } else {
          console.log(`구독 갱신 완료: ${customerKey} → ${result.newPlan}`);
        }
      }

      res.status(200).send("ok");
    } catch (err) {
      if (err.statusCode) {
        if (err.details) console.error("tossWebhook validation error:", err.publicMessage, err.details);
        res.status(err.statusCode).send(err.publicMessage || "validation error");
        return;
      }
      console.error("tossWebhook error:", err);
      res.status(500).send("error");
    }
  }
);

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase-admin/app");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "asia-northeast3" });

const db = getFirestore();
const storage = getStorage();

/**
 * 회원 탈퇴 함수
 * 호출 시 해당 유저의 모든 Firestore 데이터 + Storage 파일 + Auth 계정 삭제
 */
exports.deleteAccount = onCall(async (request) => {
  // 로그인 확인
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

    // 2. 서브컬렉션 일괄 삭제 (프로젝트별)
    const COLLECTIONS = [
      "characters",
      "relations",
      "foreshadows",
      "worldDocs",
      "timelineEvents",
      "fanworks",
    ];

    for (const projectId of projectIds) {
      for (const col of COLLECTIONS) {
        const snap = await db
          .collection(col)
          .where("projectId", "==", projectId)
          .get();

        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        if (!snap.empty) await batch.commit();
      }

      // Storage 캐릭터 사진 삭제 (characters/{charId}/photo)
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
    }

    // 3. 프로젝트 문서 삭제
    const projectBatch = db.batch();
    projectsSnap.docs.forEach((d) => projectBatch.delete(d.ref));
    if (!projectsSnap.empty) await projectBatch.commit();

    // 4. 유저 문서 삭제
    await db.collection("users").doc(uid).delete();

    // 5. Firebase Auth 계정 삭제
    await getAuth().deleteUser(uid);

    return { success: true };
  } catch (err) {
    console.error("deleteAccount error:", err);
    throw new HttpsError("internal", "탈퇴 처리 중 오류가 발생했습니다.");
  }
});

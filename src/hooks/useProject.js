import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp, getDocs, writeBatch
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, deleteObject } from 'firebase/storage';

// 유효한 Firestore 문서 ID 검증
// (사용자 데이터 보호: undefined/null/빈 문자열로 인한 cross-project 데이터 영향 방지)
function assertId(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`유효하지 않은 ${name}입니다.`);
  }
}

// Firestore batch 500개 제한 처리 (400개씩 청크)
async function deleteInBatches(db, refs) {
  const CHUNK = 400;
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = writeBatch(db);
    refs.slice(i, i + CHUNK).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

// 정렬 헬퍼
const sortByOrder = (a, b) => (a.order ?? a.createdAt?.seconds ?? 0) - (b.order ?? b.createdAt?.seconds ?? 0);

// ──────────────────────────────────────────────
// useProjects: 대시보드용 — onSnapshot 유지
// (프로젝트 목록은 다른 탭 생성/삭제 즉시 반영 필요)
// ──────────────────────────────────────────────
export function useProjects(userId) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'projects'), where('ownerId', '==', userId));
    const unsub = onSnapshot(
      q,
      snap => {
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => { console.error('프로젝트 목록 구독 오류:', err); setLoading(false); }
    );
    return unsub;
  }, [userId]);

  const createProject = async (name) => {
    if (!userId) throw new Error('로그인이 필요합니다.');
    try {
      return await addDoc(collection(db, 'projects'), { name, ownerId: userId, createdAt: serverTimestamp(), sharedWith: [] });
    } catch (err) {
      console.error('프로젝트 생성 실패:', err);
      throw err;
    }
  };

  const deleteProject = async (id) => {
    assertId(id, 'projectId');
    try {
      const collections = ['characters', 'relations', 'foreshadows', 'worldDocs', 'timelineEvents', 'fanworks'];
      const allRefs = [];

      for (const col of collections) {
        const snap = await getDocs(query(collection(db, col), where('projectId', '==', id)));

        if (col === 'characters') {
          await Promise.all(snap.docs.map(async (d) => {
            try { await deleteObject(ref(storage, `characters/${d.id}/photo`)); } catch { /* 없으면 무시 */ }
          }));
        }

        snap.docs.forEach(d => allRefs.push(d.ref));
      }

      allRefs.push(doc(db, 'projects', id));
      await deleteInBatches(db, allRefs);
    } catch (err) {
      console.error('프로젝트 삭제 실패:', err);
      throw err;
    }
  };

  const updateProject = async (id, data) => {
    assertId(id, 'projectId');
    try {
      return await updateDoc(doc(db, 'projects', id), data);
    } catch (err) {
      console.error('프로젝트 업데이트 실패:', err);
      throw err;
    }
  };

  return { projects, loading, createProject, deleteProject, updateProject };
}

// ──────────────────────────────────────────────
// useCharacters: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useCharacters(projectId) {
  const [characters, setCharacters] = useState([]);
  const cancelledRef = useRef(false);

  const load = useCallback(() => {
    if (!projectId) return;
    cancelledRef.current = false;
    const q = query(collection(db, 'characters'), where('projectId', '==', projectId));
    getDocs(q)
      .then(snap => {
        if (!cancelledRef.current)
          setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder));
      })
      .catch(err => console.error('캐릭터 로드 실패:', err));
  }, [projectId]);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  const addCharacter = async (data) => {
    assertId(projectId, 'projectId');
    const payload = {
      ...data, projectId,
      position: data.position || { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 },
      tags: data.tags || [],
      order: Date.now(),
      createdAt: serverTimestamp(),
    };
    try {
      const docRef = await addDoc(collection(db, 'characters'), payload);
      setCharacters(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
      return docRef;
    } catch (err) {
      console.error('캐릭터 추가 실패:', err);
      throw err;
    }
  };

  const updateCharacter = async (id, data) => {
    assertId(id, 'characterId');
    try {
      await updateDoc(doc(db, 'characters', id), data);
      // order 변경 시 즉시 배열 순서 반영 (reorder 종료 후 화면 갱신, #10)
      setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...data } : c).sort(sortByOrder));
    } catch (err) {
      console.error('캐릭터 업데이트 실패:', err);
      throw err;
    }
  };

  // 캐릭터 삭제: 연결된 relations·foreshadows도 Firestore 정리
  // 반환값: { deletedRelIds, updatedFsMap } — 호출자가 다른 훅 state 갱신 가능
  const deleteCharacter = async (charId) => {
    assertId(projectId, 'projectId');
    assertId(charId, 'characterId');
    try {
      const batch = writeBatch(db);

      try { await deleteObject(ref(storage, `characters/${charId}/photo`)); } catch { /* 없으면 무시 */ }

      batch.delete(doc(db, 'characters', charId));

      const relQ = query(collection(db, 'relations'), where('projectId', '==', projectId));
      const relSnap = await getDocs(relQ);
      const deletedRelIds = [];
      relSnap.docs.forEach(d => {
        const r = d.data();
        if (r.fromId === charId || r.toId === charId) {
          batch.delete(d.ref);
          deletedRelIds.push(d.id);
        }
      });

      const fsQ = query(collection(db, 'foreshadows'), where('projectId', '==', projectId));
      const fsSnap = await getDocs(fsQ);
      const updatedFsMap = {};
      fsSnap.docs.forEach(d => {
        const f = d.data();
        if (f.charIds?.includes(charId)) {
          const newIds = f.charIds.filter(id => id !== charId);
          batch.update(d.ref, { charIds: newIds });
          updatedFsMap[d.id] = newIds;
        }
      });

      await batch.commit();
      setCharacters(prev => prev.filter(c => c.id !== charId));
      return { deletedRelIds, updatedFsMap };
    } catch (err) {
      console.error('캐릭터 삭제 실패:', err);
      throw err;
    }
  };

  return { characters, setCharacters, addCharacter, updateCharacter, deleteCharacter, refreshCharacters: load };
}

// ──────────────────────────────────────────────
// useRelations: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useRelations(projectId) {
  const [relations, setRelations] = useState([]);
  const cancelledRef = useRef(false);

  const load = useCallback(() => {
    if (!projectId) return;
    cancelledRef.current = false;
    const q = query(collection(db, 'relations'), where('projectId', '==', projectId));
    getDocs(q)
      .then(snap => {
        if (!cancelledRef.current)
          setRelations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      })
      .catch(err => console.error('관계 로드 실패:', err));
  }, [projectId]);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  const addRelation = async (fromId, toId, label = '', color = '') => {
    assertId(projectId, 'projectId');
    assertId(fromId, 'fromId');
    assertId(toId, 'toId');
    const payload = { projectId, fromId, toId, label, color, createdAt: serverTimestamp() };
    try {
      const docRef = await addDoc(collection(db, 'relations'), payload);
      setRelations(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }]);
      return docRef;
    } catch (err) {
      console.error('관계 추가 실패:', err);
      throw err;
    }
  };

  const updateRelation = async (id, data) => {
    assertId(id, 'relationId');
    try {
      await updateDoc(doc(db, 'relations', id), data);
      setRelations(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    } catch (err) {
      console.error('관계 업데이트 실패:', err);
      throw err;
    }
  };

  const deleteRelation = async (id) => {
    assertId(id, 'relationId');
    try {
      await deleteDoc(doc(db, 'relations', id));
      setRelations(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('관계 삭제 실패:', err);
      throw err;
    }
  };

  return { relations, setRelations, addRelation, updateRelation, deleteRelation, refreshRelations: load };
}

// ──────────────────────────────────────────────
// useForeshadows: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useForeshadows(projectId) {
  const [foreshadows, setForeshadows] = useState([]);
  const cancelledRef = useRef(false);

  const load = useCallback(() => {
    if (!projectId) return;
    cancelledRef.current = false;
    const q = query(collection(db, 'foreshadows'), where('projectId', '==', projectId));
    getDocs(q)
      .then(snap => {
        if (!cancelledRef.current)
          setForeshadows(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder));
      })
      .catch(err => console.error('복선 로드 실패:', err));
  }, [projectId]);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  const addForeshadow = async (data) => {
    assertId(projectId, 'projectId');
    const payload = { ...data, projectId, order: Date.now(), createdAt: serverTimestamp() };
    try {
      const docRef = await addDoc(collection(db, 'foreshadows'), payload);
      setForeshadows(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
      return docRef;
    } catch (err) {
      console.error('복선 추가 실패:', err);
      throw err;
    }
  };

  const updateForeshadow = async (id, data) => {
    assertId(id, 'foreshadowId');
    try {
      await updateDoc(doc(db, 'foreshadows', id), data);
      setForeshadows(prev => prev.map(f => f.id === id ? { ...f, ...data } : f).sort(sortByOrder));
    } catch (err) {
      console.error('복선 업데이트 실패:', err);
      throw err;
    }
  };

  const deleteForeshadow = async (id) => {
    assertId(id, 'foreshadowId');
    try {
      await deleteDoc(doc(db, 'foreshadows', id));
      setForeshadows(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('복선 삭제 실패:', err);
      throw err;
    }
  };

  return { foreshadows, setForeshadows, addForeshadow, updateForeshadow, deleteForeshadow, refreshForeshadows: load };
}

// ──────────────────────────────────────────────
// useWorldDocs: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useWorldDocs(projectId) {
  const [docs, setDocs] = useState([]);
  const cancelledRef = useRef(false);

  const load = useCallback(() => {
    if (!projectId) return;
    cancelledRef.current = false;
    const q = query(collection(db, 'worldDocs'), where('projectId', '==', projectId));
    getDocs(q)
      .then(snap => {
        if (!cancelledRef.current)
          setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder));
      })
      .catch(err => console.error('세계관 문서 로드 실패:', err));
  }, [projectId]);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  const addWorldDoc = async (title) => {
    assertId(projectId, 'projectId');
    const payload = { projectId, title, content: '', order: Date.now(), createdAt: serverTimestamp() };
    try {
      const docRef = await addDoc(collection(db, 'worldDocs'), payload);
      setDocs(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
      return docRef;
    } catch (err) {
      console.error('세계관 문서 추가 실패:', err);
      throw err;
    }
  };

  const updateWorldDoc = async (id, data) => {
    assertId(id, 'worldDocId');
    try {
      await updateDoc(doc(db, 'worldDocs', id), data);
      setDocs(prev => prev.map(d => d.id === id ? { ...d, ...data } : d).sort(sortByOrder));
    } catch (err) {
      console.error('세계관 문서 업데이트 실패:', err);
      throw err;
    }
  };

  const deleteWorldDoc = async (id) => {
    assertId(id, 'worldDocId');
    try {
      await deleteDoc(doc(db, 'worldDocs', id));
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('세계관 문서 삭제 실패:', err);
      throw err;
    }
  };

  return { docs, addWorldDoc, updateWorldDoc, deleteWorldDoc, refreshWorldDocs: load };
}

// ──────────────────────────────────────────────
// useTimelineEvents: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useTimelineEvents(projectId) {
  const [events, setEvents] = useState([]);
  const cancelledRef = useRef(false);

  const load = useCallback(() => {
    if (!projectId) return;
    cancelledRef.current = false;
    const q = query(collection(db, 'timelineEvents'), where('projectId', '==', projectId));
    getDocs(q)
      .then(snap => {
        if (!cancelledRef.current)
          setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder));
      })
      .catch(err => console.error('타임라인 로드 실패:', err));
  }, [projectId]);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  const addEvent = async (data) => {
    assertId(projectId, 'projectId');
    const payload = { ...data, projectId, order: Date.now(), createdAt: serverTimestamp() };
    try {
      const docRef = await addDoc(collection(db, 'timelineEvents'), payload);
      setEvents(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
      return docRef;
    } catch (err) {
      console.error('타임라인 이벤트 추가 실패:', err);
      throw err;
    }
  };

  const updateEvent = async (id, data) => {
    assertId(id, 'eventId');
    try {
      await updateDoc(doc(db, 'timelineEvents', id), data);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...data } : e).sort(sortByOrder));
    } catch (err) {
      console.error('타임라인 이벤트 업데이트 실패:', err);
      throw err;
    }
  };

  const deleteEvent = async (id) => {
    assertId(id, 'eventId');
    try {
      await deleteDoc(doc(db, 'timelineEvents', id));
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('타임라인 이벤트 삭제 실패:', err);
      throw err;
    }
  };

  return { events, addEvent, updateEvent, deleteEvent, refreshEvents: load };
}

// ──────────────────────────────────────────────
// useFanworks: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useFanworks(projectId) {
  const [fanworks, setFanworks] = useState([]);
  const cancelledRef = useRef(false);

  const load = useCallback(() => {
    if (!projectId) return;
    cancelledRef.current = false;
    const q = query(collection(db, 'fanworks'), where('projectId', '==', projectId));
    getDocs(q)
      .then(snap => {
        if (!cancelledRef.current)
          setFanworks(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder));
      })
      .catch(err => console.error('링크 모음 로드 실패:', err));
  }, [projectId]);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  const addFanwork = async (data) => {
    assertId(projectId, 'projectId');
    const payload = { ...data, projectId, order: Date.now(), createdAt: serverTimestamp() };
    try {
      const docRef = await addDoc(collection(db, 'fanworks'), payload);
      setFanworks(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
      return docRef;
    } catch (err) {
      console.error('링크 추가 실패:', err);
      throw err;
    }
  };

  const updateFanwork = async (id, data) => {
    assertId(id, 'fanworkId');
    try {
      await updateDoc(doc(db, 'fanworks', id), data);
      setFanworks(prev => prev.map(f => f.id === id ? { ...f, ...data } : f).sort(sortByOrder));
    } catch (err) {
      console.error('링크 업데이트 실패:', err);
      throw err;
    }
  };

  const deleteFanwork = async (id) => {
    assertId(id, 'fanworkId');
    try {
      await deleteDoc(doc(db, 'fanworks', id));
      setFanworks(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('링크 삭제 실패:', err);
      throw err;
    }
  };

  return { fanworks, addFanwork, updateFanwork, deleteFanwork, refreshFanworks: load };
}

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp, getDocs, writeBatch
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, deleteObject } from 'firebase/storage';

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
    const unsub = onSnapshot(q, snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  const createProject = async (name) =>
    addDoc(collection(db, 'projects'), { name, ownerId: userId, createdAt: serverTimestamp(), sharedWith: [] });

  const deleteProject = async (id) => {
    const collections = ['characters', 'relations', 'foreshadows', 'worldDocs', 'timelineEvents', 'fanworks'];
    const allRefs = [];

    for (const col of collections) {
      const snap = await getDocs(query(collection(db, col), where('projectId', '==', id)));

      if (col === 'characters') {
        // photoURL 필드 여부와 무관하게 항상 삭제 시도 (없으면 무시)
        // → 업로드됐지만 photoURL 미반영된 엣지 케이스까지 커버
        await Promise.all(snap.docs.map(async (d) => {
          try { await deleteObject(ref(storage, `characters/${d.id}/photo`)); } catch { /* 없으면 무시 */ }
        }));
      }

      snap.docs.forEach(d => allRefs.push(d.ref));
    }

    allRefs.push(doc(db, 'projects', id));
    await deleteInBatches(db, allRefs);
  };

  const updateProject = async (id, data) => updateDoc(doc(db, 'projects', id), data);

  return { projects, loading, createProject, deleteProject, updateProject };
}

// ──────────────────────────────────────────────
// useCharacters: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useCharacters(projectId) {
  const [characters, setCharacters] = useState([]);

  const load = useCallback(() => {
    if (!projectId) return;
    const q = query(collection(db, 'characters'), where('projectId', '==', projectId));
    getDocs(q).then(snap =>
      setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder))
    );
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const addCharacter = async (data) => {
    const payload = {
      ...data, projectId,
      position: data.position || { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 },
      tags: data.tags || [],
      order: Date.now(),
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'characters'), payload);
    setCharacters(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
    return docRef;
  };

  const updateCharacter = async (id, data) => {
    await updateDoc(doc(db, 'characters', id), data);
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  // 캐릭터 삭제: 연결된 relations·foreshadows도 Firestore 정리
  // 반환값: { deletedRelIds, updatedFsIds } — 호출자가 다른 훅 state 갱신 가능
  const deleteCharacter = async (charId) => {
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
  };

  return { characters, setCharacters, addCharacter, updateCharacter, deleteCharacter, refreshCharacters: load };
}

// ──────────────────────────────────────────────
// useRelations: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useRelations(projectId) {
  const [relations, setRelations] = useState([]);

  const load = useCallback(() => {
    if (!projectId) return;
    const q = query(collection(db, 'relations'), where('projectId', '==', projectId));
    getDocs(q).then(snap => setRelations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const addRelation = async (fromId, toId, label = '', color = '') => {
    const payload = { projectId, fromId, toId, label, color, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'relations'), payload);
    setRelations(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }]);
    return docRef;
  };

  const updateRelation = async (id, data) => {
    await updateDoc(doc(db, 'relations', id), data);
    setRelations(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const deleteRelation = async (id) => {
    await deleteDoc(doc(db, 'relations', id));
    setRelations(prev => prev.filter(r => r.id !== id));
  };

  return { relations, setRelations, addRelation, updateRelation, deleteRelation, refreshRelations: load };
}

// ──────────────────────────────────────────────
// useForeshadows: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useForeshadows(projectId) {
  const [foreshadows, setForeshadows] = useState([]);

  const load = useCallback(() => {
    if (!projectId) return;
    const q = query(collection(db, 'foreshadows'), where('projectId', '==', projectId));
    getDocs(q).then(snap =>
      setForeshadows(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder))
    );
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const addForeshadow = async (data) => {
    const payload = { ...data, projectId, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'foreshadows'), payload);
    setForeshadows(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
    return docRef;
  };

  const updateForeshadow = async (id, data) => {
    await updateDoc(doc(db, 'foreshadows', id), data);
    setForeshadows(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
  };

  const deleteForeshadow = async (id) => {
    await deleteDoc(doc(db, 'foreshadows', id));
    setForeshadows(prev => prev.filter(f => f.id !== id));
  };

  return { foreshadows, setForeshadows, addForeshadow, updateForeshadow, deleteForeshadow, refreshForeshadows: load };
}

// ──────────────────────────────────────────────
// useWorldDocs: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useWorldDocs(projectId) {
  const [docs, setDocs] = useState([]);

  const load = useCallback(() => {
    if (!projectId) return;
    const q = query(collection(db, 'worldDocs'), where('projectId', '==', projectId));
    getDocs(q).then(snap =>
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder))
    );
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const addWorldDoc = async (title) => {
    const payload = { projectId, title, content: '', createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'worldDocs'), payload);
    setDocs(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
    return docRef;
  };

  const updateWorldDoc = async (id, data) => {
    await updateDoc(doc(db, 'worldDocs', id), data);
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
  };

  const deleteWorldDoc = async (id) => {
    await deleteDoc(doc(db, 'worldDocs', id));
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  return { docs, addWorldDoc, updateWorldDoc, deleteWorldDoc, refreshWorldDocs: load };
}

// ──────────────────────────────────────────────
// useTimelineEvents: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useTimelineEvents(projectId) {
  const [events, setEvents] = useState([]);

  const load = useCallback(() => {
    if (!projectId) return;
    const q = query(collection(db, 'timelineEvents'), where('projectId', '==', projectId));
    getDocs(q).then(snap =>
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder))
    );
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const addEvent = async (data) => {
    const payload = { ...data, projectId, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'timelineEvents'), payload);
    setEvents(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
    return docRef;
  };

  const updateEvent = async (id, data) => {
    await updateDoc(doc(db, 'timelineEvents', id), data);
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deleteEvent = async (id) => {
    await deleteDoc(doc(db, 'timelineEvents', id));
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return { events, addEvent, updateEvent, deleteEvent, refreshEvents: load };
}

// ──────────────────────────────────────────────
// useFanworks: getDocs 최초 로드 + 낙관적 업데이트
// ──────────────────────────────────────────────
export function useFanworks(projectId) {
  const [fanworks, setFanworks] = useState([]);

  const load = useCallback(() => {
    if (!projectId) return;
    const q = query(collection(db, 'fanworks'), where('projectId', '==', projectId));
    getDocs(q).then(snap =>
      setFanworks(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByOrder))
    );
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const addFanwork = async (data) => {
    const payload = { ...data, projectId, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'fanworks'), payload);
    setFanworks(prev => [...prev, { id: docRef.id, ...payload, createdAt: null }].sort(sortByOrder));
    return docRef;
  };

  const updateFanwork = async (id, data) => {
    await updateDoc(doc(db, 'fanworks', id), data);
    setFanworks(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
  };

  const deleteFanwork = async (id) => {
    await deleteDoc(doc(db, 'fanworks', id));
    setFanworks(prev => prev.filter(f => f.id !== id));
  };

  return { fanworks, addFanwork, updateFanwork, deleteFanwork, refreshFanworks: load };
}

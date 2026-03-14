import { useState, useEffect } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp, getDocs, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

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

  const deleteProject = async (id) => deleteDoc(doc(db, 'projects', id));

  return { projects, loading, createProject, deleteProject };
}

export function useCharacters(projectId) {
  const [characters, setCharacters] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, 'characters'), where('projectId', '==', projectId));
    return onSnapshot(q, snap => setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [projectId]);

  const addCharacter = (data) => addDoc(collection(db, 'characters'), { ...data, projectId, position: data.position || { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 }, tags: data.tags || [], createdAt: serverTimestamp() });
  const updateCharacter = (id, data) => updateDoc(doc(db, 'characters', id), data);

  // 캐릭터 삭제 시 연결된 relations, foreshadow charIds 자동 정리
  const deleteCharacter = async (charId) => {
    const batch = writeBatch(db);

    // 1. 캐릭터 삭제
    batch.delete(doc(db, 'characters', charId));

    // 2. 연결된 관계선 삭제
    const relQ = query(collection(db, 'relations'), where('projectId', '==', projectId));
    const relSnap = await getDocs(relQ);
    relSnap.docs.forEach(d => {
      const r = d.data();
      if (r.fromId === charId || r.toId === charId) batch.delete(d.ref);
    });

    // 3. 복선에서 charId 제거
    const fsQ = query(collection(db, 'foreshadows'), where('projectId', '==', projectId));
    const fsSnap = await getDocs(fsQ);
    fsSnap.docs.forEach(d => {
      const f = d.data();
      if (f.charIds?.includes(charId)) {
        batch.update(d.ref, { charIds: f.charIds.filter(id => id !== charId) });
      }
    });

    await batch.commit();
  };

  return { characters, addCharacter, updateCharacter, deleteCharacter };
}

export function useRelations(projectId) {
  const [relations, setRelations] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, 'relations'), where('projectId', '==', projectId));
    return onSnapshot(q, snap => setRelations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [projectId]);

  const addRelation = (fromId, toId, label = '') => addDoc(collection(db, 'relations'), { projectId, fromId, toId, label, createdAt: serverTimestamp() });
  const updateRelation = (id, data) => updateDoc(doc(db, 'relations', id), data);
  const deleteRelation = (id) => deleteDoc(doc(db, 'relations', id));

  return { relations, addRelation, updateRelation, deleteRelation };
}

export function useForeshadows(projectId) {
  const [foreshadows, setForeshadows] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, 'foreshadows'), where('projectId', '==', projectId));
    return onSnapshot(q, snap => setForeshadows(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [projectId]);

  const addForeshadow = (data) => addDoc(collection(db, 'foreshadows'), { ...data, projectId, createdAt: serverTimestamp() });
  const updateForeshadow = (id, data) => updateDoc(doc(db, 'foreshadows', id), data);
  const deleteForeshadow = (id) => deleteDoc(doc(db, 'foreshadows', id));

  return { foreshadows, addForeshadow, updateForeshadow, deleteForeshadow };
}

export function useWorldDocs(projectId) {
  const [docs, setDocs] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, 'worldDocs'), where('projectId', '==', projectId));
    return onSnapshot(q, snap => setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [projectId]);

  const addWorldDoc = (title) => addDoc(collection(db, 'worldDocs'), { projectId, title, content: '', createdAt: serverTimestamp() });
  const updateWorldDoc = (id, data) => updateDoc(doc(db, 'worldDocs', id), data);
  const deleteWorldDoc = (id) => deleteDoc(doc(db, 'worldDocs', id));

  return { docs, addWorldDoc, updateWorldDoc, deleteWorldDoc };
}

export function useTimelineEvents(projectId) {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, 'timelineEvents'), where('projectId', '==', projectId));
    return onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [projectId]);

  const addEvent = (data) => addDoc(collection(db, 'timelineEvents'), { ...data, projectId, createdAt: serverTimestamp() });
  const updateEvent = (id, data) => updateDoc(doc(db, 'timelineEvents', id), data);
  const deleteEvent = (id) => deleteDoc(doc(db, 'timelineEvents', id));

  return { events, addEvent, updateEvent, deleteEvent };
}

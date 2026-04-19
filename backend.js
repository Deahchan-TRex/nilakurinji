// ============================================================
// backend.js - 데이터 영속화 (localStorage ↔ Firebase 전환)
// ============================================================

import { CONFIG } from './config.js';

const listeners = { pet: [], logs: [] };
let db = null;

// ────────────────────────────────────────────────────────────
// Firebase 초기화 (LOCAL_TEST_MODE이 false일 때만)
// ────────────────────────────────────────────────────────────
async function initFirebase() {
  if (CONFIG.LOCAL_TEST_MODE) return;

  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
  const fs = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

  const app = initializeApp(CONFIG.FIREBASE);
  db = fs.getFirestore(app);
  db._fns = fs;
}

// ────────────────────────────────────────────────────────────
// 기본 캐릭터
// ────────────────────────────────────────────────────────────
export function defaultPet() {
  return {
    name: CONFIG.PET_NAME,
    fullName: CONFIG.PET_FULLNAME,
    origin: CONFIG.PET_ORIGIN,
    bornAt: new Date(CONFIG.PET_BIRTH).getTime(),
    lastTickAt: Date.now(),
    stage: 'EGG',
    isDead: false,
    deathCount: 0,

    hunger: 80, happy: 80, energy: 80, hygiene: 80,
    strength: 10, intel: 10, bond: 10,
    exp: 0, level: 1,

    personality: {
      activeVsCalm: 0,
      greedVsTemperance: 0,
      socialVsIntro: 0,
      diligentVsFree: 0,
    },
    counters: {
      feed: 0, play: 0, sleep: 0, clean: 0, train: 0,
    },
    // 크루별 기억: { [crewName]: { feed: n, play: n, ..., lastAction, lastAt } }
    crewMemory: {},
    // 최근 행동한 크루 (최근 5명, 최신이 앞)
    recentCrew: [],
    // 인상적인 대사 기록 (최근 5개) — 나중에 회상용
    memorableQuotes: [],

    lastSpeech: null,
  };
}

// ────────────────────────────────────────────────────────────
export const Backend = {
  async init() {
    await initFirebase();
    const pet = await this.getPet();
    if (!pet) await this.savePet(defaultPet());
  },

  async getPet() {
    if (CONFIG.LOCAL_TEST_MODE) {
      const raw = localStorage.getItem('nk_pet');
      return raw ? JSON.parse(raw) : null;
    }
    const snap = await db._fns.getDoc(db._fns.doc(db, 'pet', 'main'));
    return snap.exists() ? snap.data() : null;
  },

  async savePet(pet) {
    if (CONFIG.LOCAL_TEST_MODE) {
      localStorage.setItem('nk_pet', JSON.stringify(pet));
      listeners.pet.forEach(cb => cb(pet));
      return;
    }
    await db._fns.setDoc(db._fns.doc(db, 'pet', 'main'), pet);
  },

  onPetChange(callback) {
    listeners.pet.push(callback);

    if (CONFIG.LOCAL_TEST_MODE) {
      // 같은 브라우저 다른 탭 감지
      window.addEventListener('storage', e => {
        if (e.key === 'nk_pet' && e.newValue) callback(JSON.parse(e.newValue));
      });
      this.getPet().then(p => { if (p) callback(p); });
      return;
    }
    return db._fns.onSnapshot(db._fns.doc(db, 'pet', 'main'), snap => {
      if (snap.exists()) callback(snap.data());
    });
  },

  async addLog(entry) {
    const log = { ...entry, at: Date.now() };

    if (CONFIG.LOCAL_TEST_MODE) {
      const logs = JSON.parse(localStorage.getItem('nk_logs') || '[]');
      logs.push(log);  // 최신을 뒤에
      // 로그 개수 제한: 앞(오래된 것)부터 자르기
      const trimmed = logs.slice(-50);
      localStorage.setItem('nk_logs', JSON.stringify(trimmed));
      listeners.logs.forEach(cb => cb(trimmed));
      return;
    }
    await db._fns.addDoc(db._fns.collection(db, 'logs'), {
      ...entry, at: db._fns.serverTimestamp(),
    });
  },

  onLogsChange(callback) {
    listeners.logs.push(callback);

    if (CONFIG.LOCAL_TEST_MODE) {
      const logs = JSON.parse(localStorage.getItem('nk_logs') || '[]');
      callback(logs);
      window.addEventListener('storage', e => {
        if (e.key === 'nk_logs' && e.newValue) callback(JSON.parse(e.newValue));
      });
      return;
    }
    const q = db._fns.query(
      db._fns.collection(db, 'logs'),
      db._fns.orderBy('at', 'asc'),
      db._fns.limit(50)
    );
    return db._fns.onSnapshot(q, snap => {
      callback(snap.docs.map(d => d.data()));
    });
  },

  async reset() {
    if (CONFIG.LOCAL_TEST_MODE) {
      localStorage.removeItem('nk_pet');
      localStorage.removeItem('nk_logs');
      listeners.logs.forEach(cb => cb([]));
    } else {
      // Firebase: logs 컬렉션 전체 삭제
      try {
        const logsSnap = await db._fns.getDocs(db._fns.collection(db, 'logs'));
        const deletePromises = logsSnap.docs.map(d =>
          db._fns.deleteDoc(db._fns.doc(db, 'logs', d.id))
        );
        await Promise.all(deletePromises);
      } catch (err) {
        console.error('로그 삭제 실패:', err);
      }
    }
    await this.savePet(defaultPet());
  },

  // ────────────────────────────────────────────────────
  // Presence (동접자) — 2분마다 heartbeat, 5분 이상이면 오프라인 판정
  // ────────────────────────────────────────────────────
  async updatePresence(userName) {
    if (CONFIG.LOCAL_TEST_MODE) {
      // 로컬 모드: 본인 기록만 저장 (실제 공유 X)
      const presence = JSON.parse(localStorage.getItem('nk_presence') || '{}');
      presence[userName] = Date.now();
      localStorage.setItem('nk_presence', JSON.stringify(presence));
      return;
    }
    try {
      await db._fns.setDoc(
        db._fns.doc(db, 'presence', userName),
        { at: db._fns.serverTimestamp(), name: userName }
      );
    } catch (err) {
      console.error('presence 업데이트 실패:', err);
    }
  },

  onPresenceChange(callback) {
    if (CONFIG.LOCAL_TEST_MODE) {
      // 로컬: 본인만 표시
      const presence = JSON.parse(localStorage.getItem('nk_presence') || '{}');
      callback(presence);
      return;
    }
    return db._fns.onSnapshot(
      db._fns.collection(db, 'presence'),
      snap => {
        const map = {};
        snap.docs.forEach(d => {
          const data = d.data();
          // Firestore Timestamp → ms
          const at = data.at?.toMillis ? data.at.toMillis() : Date.now();
          map[d.id] = at;
        });
        callback(map);
      }
    );
  },

  // 관리자용: 백업/복원
  async backup() {
    const pet = await this.getPet();
    const logs = CONFIG.LOCAL_TEST_MODE
      ? JSON.parse(localStorage.getItem('nk_logs') || '[]')
      : [];
    return { pet, logs, at: new Date().toISOString() };
  },

  async restore(data) {
    if (!data?.pet) throw new Error('invalid backup');
    await this.savePet(data.pet);
    if (CONFIG.LOCAL_TEST_MODE && data.logs) {
      localStorage.setItem('nk_logs', JSON.stringify(data.logs));
      listeners.logs.forEach(cb => cb(data.logs));
    }
  },
};

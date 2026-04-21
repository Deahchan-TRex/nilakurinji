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
  if (CONFIG.LOCAL_TEST_MODE) {
    console.warn('[Backend] ⚠ 로컬 테스트 모드입니다. Firebase 실시간 동기화 비활성화.');
    console.warn('[Backend] 실제 이벤트에선 config.js에서 LOCAL_TEST_MODE: false 로 변경하세요.');
    return;
  }
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const fs = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const app = initializeApp(CONFIG.FIREBASE);
    db = fs.getFirestore(app);
    db._fns = fs;
    console.log('[Backend] Firebase 초기화 성공 · projectId:', CONFIG.FIREBASE.projectId);
  } catch (err) {
    console.error('[Backend] ⚠ Firebase 초기화 실패:', err);
    console.error('[Backend] config.js의 FIREBASE 설정값이 올바른지 확인하세요.');
    throw err;
  }
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
    // EGG 상태에서 크루가 남긴 메시지 { user, text, at }[] — 부화 후 회상용
    eggMessages: [],

    // 미지의 신호 관련
    // signals[signalId] = { spawnedAt, stage, decoded, decodedBy: [크루이름], expiredAt? }
    signals: {},
    // 예약된 발사 [{signalId, fireAt, scheduledBy}]
    scheduledSignals: [],
    // 신호로 쌓인 꿈 조각 [{text, from: 'signal-XXX'}]
    dreamFragments: [],
    // 수집한 아카이브 아이템 [{name, from}]
    archiveItems: [],
    // 해독 피로 상태 { userName: { count, startAt } }
    decodeFatigue: {},
    // FINALE 답장 수집 { userName: 'text' }
    finaleReplies: {},
    // 현재 활성 버프 [{type, until, value}]
    activeBuffs: [],

    // 공용 마지막 대사 (누가 봐도 보이는 것 - 진화 순간 등)
    lastSpeech: null,
    // 유저별 개인 대사: { [userName]: { text, at, to } }
    lastSpeechBy: {},
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
    try {
      await db._fns.setDoc(db._fns.doc(db, 'pet', 'main'), pet);
      console.log('[pet] Firebase 저장 성공');
    } catch (err) {
      console.error('[pet] ⚠ Firebase 저장 실패! 보안 규칙 확인:', err);
      console.error('[pet] 규칙 필요: match /pet/main { allow read, write: if true; }');
      throw err;
    }
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
    return db._fns.onSnapshot(
      db._fns.doc(db, 'pet', 'main'),
      snap => {
        if (snap.exists()) {
          console.log('[pet] 실시간 변경 수신 (stage:', snap.data().stage, ')');
          callback(snap.data());
        }
      },
      err => {
        console.error('[pet] ⚠ 실시간 구독 실패! 보안 규칙 확인:', err);
      }
    );
  },

  async addLog(entry) {
    const nowMs = Date.now();

    if (CONFIG.LOCAL_TEST_MODE) {
      const log = { ...entry, at: nowMs };
      const logs = JSON.parse(localStorage.getItem('nk_logs') || '[]');
      logs.push(log);
      const trimmed = logs.slice(-100);  // 로컬도 100개만
      localStorage.setItem('nk_logs', JSON.stringify(trimmed));
      listeners.logs.forEach(cb => cb(trimmed));
      return;
    }
    // Firebase: 서버 타임스탬프(정확성) + atMs(즉시 표시용 fallback) 동시 저장
    try {
      await db._fns.addDoc(db._fns.collection(db, 'logs'), {
        ...entry,
        at: db._fns.serverTimestamp(),
        atMs: nowMs,
      });

      // 자동 트림: 가끔 전체 개수 체크하고 300개 넘으면 오래된 것부터 삭제
      // 매번 하면 과부하이므로 5% 확률로만 실행 (평균 20회당 1번)
      if (Math.random() < 0.05) {
        this._trimOldLogs(300).catch(err => {
          console.error('[log] 자동 트림 실패:', err);
        });
      }
    } catch (err) {
      console.error('[log] ⚠ 로그 저장 실패! 보안 규칙 확인:', err);
      console.error('[log] 규칙 필요: match /logs/{logId} { allow read, create: if true; }');
    }
  },

  // ─────────────────────────────────────────────────
  // 자동 트림: 오래된 로그 삭제 (최신 keepCount만 남김)
  // ─────────────────────────────────────────────────
  async _trimOldLogs(keepCount = 300) {
    if (CONFIG.LOCAL_TEST_MODE) return;

    // 전체 로그를 최신순으로 가져옴 (atMs 기준)
    const allSnap = await db._fns.getDocs(
      db._fns.query(
        db._fns.collection(db, 'logs'),
        db._fns.orderBy('atMs', 'desc')
      )
    );

    if (allSnap.size <= keepCount) return;  // 안 넘으면 조용히 종료

    // keepCount 이후의 문서들 (오래된 것)만 삭제 대상
    const toDelete = allSnap.docs.slice(keepCount);
    console.log(`[log] 자동 트림: ${allSnap.size}개 중 ${toDelete.length}개 삭제 (최신 ${keepCount}개 유지)`);

    // 배치 500개씩 (Firestore 제한)
    for (let i = 0; i < toDelete.length; i += 500) {
      const batch = toDelete.slice(i, i + 500);
      await Promise.all(
        batch.map(d => db._fns.deleteDoc(db._fns.doc(db, 'logs', d.id)))
      );
    }
    console.log(`[log] 자동 트림 완료`);
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
    // 로그 쿼리: 최신순으로 가져옴 (최근 100개)
    // atMs 필드가 없는 옛날 로그는 제외될 수 있지만, 오늘 이후 로그는 모두 atMs 있음
    const q = db._fns.query(
      db._fns.collection(db, 'logs'),
      db._fns.orderBy('atMs', 'desc'),
      db._fns.limit(100)
    );
    return db._fns.onSnapshot(
      q,
      snap => {
        const arr = snap.docs.map(d => {
          const data = d.data();
          let atMs = data.atMs || 0;
          if (!atMs && data.at?.toMillis) {
            atMs = data.at.toMillis();
          }
          if (!atMs && typeof data.at === 'number') {
            atMs = data.at;
          }
          return { ...data, at: atMs, _id: d.id };
        });
        // UI 표시용: 오래된 것 → 최신 순으로 정렬 (기존 render 로직 호환)
        arr.sort((a, b) => (a.at || 0) - (b.at || 0));
        console.log('[logs] 실시간 갱신:', arr.length, '개');
        callback(arr);
      },
      err => {
        console.error('[logs] ⚠ 실시간 구독 실패! 보안 규칙 확인:', err);
      }
    );
  },

  async reset() {
    if (CONFIG.LOCAL_TEST_MODE) {
      localStorage.removeItem('nk_pet');
      localStorage.removeItem('nk_logs');
      listeners.logs.forEach(cb => cb([]));
    } else {
      // Firebase: logs 컬렉션 전체 삭제 (배치 500개씩)
      try {
        await this.clearLogs();
      } catch (err) {
        console.error('로그 삭제 실패:', err);
      }
    }
    await this.savePet(defaultPet());
  },

  // ────────────────────────────────────────────────────
  // 로그만 삭제 (pet 상태는 유지)
  // ────────────────────────────────────────────────────
  async clearLogs() {
    if (CONFIG.LOCAL_TEST_MODE) {
      localStorage.removeItem('nk_logs');
      listeners.logs.forEach(cb => cb([]));
      return;
    }
    // Firestore 배치는 500개씩 제한
    let totalDeleted = 0;
    while (true) {
      const logsSnap = await db._fns.getDocs(
        db._fns.query(db._fns.collection(db, 'logs'), db._fns.limit(500))
      );
      if (logsSnap.empty) break;
      const deletePromises = logsSnap.docs.map(d =>
        db._fns.deleteDoc(db._fns.doc(db, 'logs', d.id))
      );
      await Promise.all(deletePromises);
      totalDeleted += logsSnap.docs.length;
      console.log(`[clearLogs] 삭제 진행: ${totalDeleted}개`);
      if (logsSnap.docs.length < 500) break;
    }
    console.log(`[clearLogs] 완료: 총 ${totalDeleted}개 삭제`);
  },

  // ────────────────────────────────────────────────────
  // Presence (동접자) — 2분마다 heartbeat, 5분 이상이면 오프라인 판정
  // ────────────────────────────────────────────────────
  async updatePresence(userName) {
    if (CONFIG.LOCAL_TEST_MODE) {
      const presence = JSON.parse(localStorage.getItem('nk_presence') || '{}');
      presence[userName] = Date.now();
      localStorage.setItem('nk_presence', JSON.stringify(presence));
      console.log('[presence] (로컬) 업데이트:', userName);
      return;
    }
    try {
      await db._fns.setDoc(
        db._fns.doc(db, 'presence', userName),
        {
          at: db._fns.serverTimestamp(),
          atMs: Date.now(),
          name: userName,
        }
      );
      console.log('[presence] Firebase 쓰기 성공:', userName);
    } catch (err) {
      console.error('[presence] ⚠ Firebase 쓰기 실패! 보안 규칙을 확인하세요:', err);
      console.error('[presence] 규칙에 이 부분이 있어야 합니다: match /presence/{crewName} { allow read, write: if true; }');
    }
  },

  onPresenceChange(callback) {
    if (CONFIG.LOCAL_TEST_MODE) {
      const presence = JSON.parse(localStorage.getItem('nk_presence') || '{}');
      callback(presence);
      // 같은 브라우저 다른 탭/창 감지
      window.addEventListener('storage', e => {
        if (e.key === 'nk_presence' && e.newValue) {
          callback(JSON.parse(e.newValue));
        }
      });
      return;
    }
    return db._fns.onSnapshot(
      db._fns.collection(db, 'presence'),
      snap => {
        const map = {};
        snap.docs.forEach(d => {
          const data = d.data();
          let atMs = data.atMs || 0;
          if (data.at?.toMillis) {
            atMs = data.at.toMillis();
          }
          map[d.id] = atMs;
        });
        console.log('[presence] 구독 갱신:', Object.keys(map).length, '명 →', Object.keys(map).join(', '));
        callback(map);
      },
      err => {
        console.error('[presence] ⚠ 구독 실패! 보안 규칙을 확인하세요:', err);
      }
    );
  },

  async removePresence(userName) {
    if (CONFIG.LOCAL_TEST_MODE) {
      const presence = JSON.parse(localStorage.getItem('nk_presence') || '{}');
      delete presence[userName];
      localStorage.setItem('nk_presence', JSON.stringify(presence));
      return;
    }
    try {
      await db._fns.deleteDoc(db._fns.doc(db, 'presence', userName));
    } catch (err) {
      console.error('presence 삭제 실패:', err);
    }
  },

  // ────────────────────────────────────────────────────
  // 스냅샷 (롤백용)
  // ────────────────────────────────────────────────────
  async saveSnapshot(pet, label, type = 'manual') {
    const atMs = Date.now();
    const snap = {
      pet: JSON.parse(JSON.stringify(pet)),  // deep copy
      atMs, label, type,
    };

    if (CONFIG.LOCAL_TEST_MODE) {
      const snaps = JSON.parse(localStorage.getItem('nk_snapshots') || '[]');
      snaps.push({ ...snap, _id: `local_${atMs}` });
      // 오래된 것부터 정리: auto는 24개, manual은 10개 제한
      const autos = snaps.filter(s => s.type === 'auto').sort((a,b) => b.atMs - a.atMs);
      const manuals = snaps.filter(s => s.type === 'manual').sort((a,b) => b.atMs - a.atMs);
      const kept = [...autos.slice(0, 24), ...manuals.slice(0, 10)];
      localStorage.setItem('nk_snapshots', JSON.stringify(kept));
      return;
    }
    // Firebase
    await db._fns.addDoc(db._fns.collection(db, 'snapshots'), {
      ...snap,
      at: db._fns.serverTimestamp(),
    });
    // 오래된 자동 스냅샷 정리 (24개 넘으면)
    await this._pruneSnapshots();
  },

  async _pruneSnapshots() {
    if (CONFIG.LOCAL_TEST_MODE) return;
    try {
      // 자동 스냅샷 24개 초과 분 삭제
      const autoQuery = db._fns.query(
        db._fns.collection(db, 'snapshots'),
        db._fns.where('type', '==', 'auto'),
        db._fns.orderBy('atMs', 'desc')
      );
      const autoSnap = await db._fns.getDocs(autoQuery);
      if (autoSnap.docs.length > 24) {
        const toDelete = autoSnap.docs.slice(24);
        await Promise.all(toDelete.map(d =>
          db._fns.deleteDoc(db._fns.doc(db, 'snapshots', d.id))
        ));
      }
      // 수동 스냅샷 10개 초과 분 삭제
      const manualQuery = db._fns.query(
        db._fns.collection(db, 'snapshots'),
        db._fns.where('type', '==', 'manual'),
        db._fns.orderBy('atMs', 'desc')
      );
      const manualSnap = await db._fns.getDocs(manualQuery);
      if (manualSnap.docs.length > 10) {
        const toDelete = manualSnap.docs.slice(10);
        await Promise.all(toDelete.map(d =>
          db._fns.deleteDoc(db._fns.doc(db, 'snapshots', d.id))
        ));
      }
    } catch (err) {
      console.error('스냅샷 정리 실패:', err);
    }
  },

  async listSnapshots() {
    if (CONFIG.LOCAL_TEST_MODE) {
      const snaps = JSON.parse(localStorage.getItem('nk_snapshots') || '[]');
      return snaps.sort((a, b) => b.atMs - a.atMs);
    }
    const q = db._fns.query(
      db._fns.collection(db, 'snapshots'),
      db._fns.orderBy('atMs', 'desc')
    );
    const snap = await db._fns.getDocs(q);
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  },

  async restoreSnapshot(snapshotId, { deleteLaterLogs = false } = {}) {
    let snapshot;
    if (CONFIG.LOCAL_TEST_MODE) {
      const snaps = JSON.parse(localStorage.getItem('nk_snapshots') || '[]');
      snapshot = snaps.find(s => s._id === snapshotId);
    } else {
      const docRef = db._fns.doc(db, 'snapshots', snapshotId);
      const docSnap = await db._fns.getDoc(docRef);
      if (!docSnap.exists()) return { ok: false, reason: 'not_found' };
      snapshot = { _id: docSnap.id, ...docSnap.data() };
    }
    if (!snapshot) return { ok: false, reason: 'not_found' };

    // pet 복원
    await this.savePet(snapshot.pet);

    // 옵션: 복원 시점 이후 로그 삭제
    if (deleteLaterLogs) {
      if (CONFIG.LOCAL_TEST_MODE) {
        const logs = JSON.parse(localStorage.getItem('nk_logs') || '[]');
        const filtered = logs.filter(l => (l.at || 0) <= snapshot.atMs);
        localStorage.setItem('nk_logs', JSON.stringify(filtered));
        listeners.logs.forEach(cb => cb(filtered));
      } else {
        try {
          const lq = db._fns.query(
            db._fns.collection(db, 'logs'),
            db._fns.where('atMs', '>', snapshot.atMs)
          );
          const lsnap = await db._fns.getDocs(lq);
          await Promise.all(lsnap.docs.map(d =>
            db._fns.deleteDoc(db._fns.doc(db, 'logs', d.id))
          ));
        } catch (err) {
          console.error('로그 삭제 실패:', err);
        }
      }
    }
    return { ok: true, snapshot };
  },

  async deleteSnapshot(snapshotId) {
    if (CONFIG.LOCAL_TEST_MODE) {
      const snaps = JSON.parse(localStorage.getItem('nk_snapshots') || '[]');
      const filtered = snaps.filter(s => s._id !== snapshotId);
      localStorage.setItem('nk_snapshots', JSON.stringify(filtered));
      return;
    }
    await db._fns.deleteDoc(db._fns.doc(db, 'snapshots', snapshotId));
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

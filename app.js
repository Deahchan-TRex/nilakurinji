// ============================================================
// app.js - UI 진입점 및 상태 관리
// ============================================================

import { CONFIG } from './config.js';
import { Backend } from './backend.js';
import { renderTeddy, renderTeddyBlink, renderTeddyHug } from './teddy.js';
import {
  tickStats, updateStage, applyAction, revive,
  personalityLabel, getProgress,
  getEggNarrative, getEggNarrativeIndex,
  getStageNarrative, getStageNarrativeKey,
  checkSignalSpawn, spawnSignal, expireOldSignals,
  decodeSignal, getSignalInfo, listActiveSignals,
} from './game.js';
import {
  getActionSpeech, getWarningSpeech, getIdleSpeech,
  pickSpeech, SPEECHES, getCrewFavorites,
  getTimeGreeting, getWelcomeSpeech, getTalkTopics, getTalkResponse,
  pickTalkTurnCount, getTalkFarewell,
  recordMemorableQuote, getQuoteRecall, getEggMessageRecall,
  getNextTopicChoices, getTopicBridge,
  matchGreeting, getGreetingResponse,
  pickBubbleSpeech, pickTapSpeech, pickTeenAngrySpeech,
  getSignalRecall, getLullabyRecall,
} from './speeches.js';

// ────────────────────────────────────────────────────────────
// 전역 상태
// ────────────────────────────────────────────────────────────
let currentUser = null;   // { name, key, isAdmin }
let currentPet = null;

/**
 * OBJECT(관리자) 미니게임 테스트 모드
 * true일 때 pet 저장/로그 기록/카운트 증가 모두 스킵
 */
let minigameTestMode = false;

function isMinigameTestMode() {
  return currentUser?.isAdmin && minigameTestMode;
}
let logs = [];
let prevUser = null;
let presenceMap = {};     // { userName: lastSeenMs }

// 전역 타이머 ID (긴급 중단용)
const timers = {
  tick: null,
  heartbeat: null,
  autoSnapshot: null,
  blink: null,
  bubble: null,
};

function stopAllTimers() {
  Object.values(timers).forEach(id => {
    if (id) { clearInterval(id); clearTimeout(id); }
  });
  console.warn('[timers] 모든 타이머 중단됨');
}

// ────────────────────────────────────────────────────────────
// 로그인 화면
// ────────────────────────────────────────────────────────────
function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login">
      <div class="top-bar">
        <span>CALLA-LILY-01 // DOCK BAY 7</span>
        <span><span class="blink">■</span> SECURE CONNECTION</span>
      </div>
      <div class="login-body">
        <pre class="login-banner">┌─────────────────────────────────────────────┐
│                                             │
│     C A L L A - L I L Y    M A N I F E S T  │
│          CREW ACCESS TERMINAL v2.4          │
│         2026.03 INTAKE - MARS II            │
│                                             │
└─────────────────────────────────────────────┘</pre>
        <h1>칼라릴리호 · 관리 단말</h1>
        <div class="sub">CREW AUTHENTICATION REQUIRED</div>

        <div class="lore-block">
          <div class="lore-title">▶ 꽃잎 속 이름 // AB-1</div>
          <div class="lore-body">
            이 름 &nbsp;&nbsp;&nbsp;&nbsp;: <span class="hl">크림슨 오퍼튜니티 마르스 II</span><br>
            온 곳 &nbsp;&nbsp;&nbsp;&nbsp;: <span class="hl">붉은 땅</span> / 기회를 쫓던 이들의 자리<br>
            아 버 지 &nbsp;: <span class="warn">크림슨 오퍼튜니티 마르스 I — 그 땅에 묻혔다</span><br>
            이름의 뜻 : 오래전 붉은 행성을 걸었던 탐사선을 기린다<br>
            명 단 &nbsp;&nbsp;&nbsp;&nbsp;: <span class="hl">MARS II</span> 수송 대기<br>
            비 고 &nbsp;&nbsp;&nbsp;&nbsp;: '사슬' 한 가닥 허용 — 고향과 겨우 이어진 실
          </div>
        </div>

        <div class="input-row">
          <span class="prefix">CREW&gt;</span>
          <input id="login-input" type="text" placeholder="승무원 이름 입력 (예: 마레)" autofocus autocomplete="off" />
        </div>
        <div class="login-error" id="login-error"></div>

        <div class="crew-list">
          <div class="crew-list-title">
            <span>◢ AUTHORIZED CREW</span>
            <span>${CONFIG.MEMBERS.length} / ${CONFIG.MEMBERS.length}</span>
          </div>
          <div class="crew-list-body">
            ${CONFIG.MEMBERS.map(m => m.name).join(' · ')}
          </div>
        </div>

        <div class="login-hint">// CALLA-LILY MANIFEST SYSTEM // MARS II //</div>
      </div>
    </div>
  `;

  const input = document.getElementById('login-input');
  const err = document.getElementById('login-error');

  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = input.value.trim();
    if (!v) return;

    // 관리자
    if (v.toUpperCase() === CONFIG.ADMIN_KEYWORD) {
      currentUser = { name: CONFIG.ADMIN_KEYWORD, key: '__admin__', isAdmin: true };
      sessionStorage.setItem('nk_user', JSON.stringify(currentUser));
      startGame();
      return;
    }

    // 일반 크루
    const found = CONFIG.MEMBERS.find(m => m.name === v || m.key === v);
    if (!found) {
      err.textContent = `"${v}" 은(는) 등록된 승무원이 아닙니다.`;
      return;
    }
    currentUser = { ...found, isAdmin: false };
    sessionStorage.setItem('nk_user', JSON.stringify(currentUser));
    startGame();
  });
}

// ────────────────────────────────────────────────────────────
// 메인 화면
// ────────────────────────────────────────────────────────────
function renderMain() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="terminal">
      <div class="term-bar">
        <span><span class="status-dot"></span>CALLA-LILY-01 // CREW: <span id="current-user"></span><span id="admin-badge"></span></span>
        <span id="time-info">LOADING...</span>
      </div>
      <div class="term-body">
        <div class="grid">
          <!-- LEFT: 캐릭터 -->
          <div class="tbl">
            <div class="tbl-head">
              <span>AB-1</span>
              <span class="badge" id="stage-badge">EGG</span>
            </div>
            <div class="tbl-body">
              <div class="pet-art-wrap">
                <pre class="pet-art" id="pet-art"></pre>
                <div id="radio-icon-slot" class="radio-icon-slot"></div>
              </div>
              <div class="pet-id">
                <div class="cn">${CONFIG.PET_NAME}</div>
                <div class="full">${CONFIG.PET_FULLNAME}</div>
                <div class="origin">◣ ${CONFIG.PET_ORIGIN} ◥</div>
              </div>
              <div class="pet-tags" id="pet-tags">
                <span class="tag">FROM MARS</span>
                <span class="tag">SHACKLE</span>
              </div>
              <div style="border-top:1px solid #2d5a3e;padding-top:8px;" id="pet-extras"></div>
            </div>
          </div>

          <!-- CENTER -->
          <div>
            <div class="tbl">
              <div class="tbl-head">
                <span>VITALS</span>
                <span class="badge sub">REAL-TIME</span>
              </div>
              <table class="stat-table" id="stat-table"></table>
            </div>

            <div id="speech-wrapper"></div>

            <div class="log-tbl">
              <table>
                <thead>
                  <tr><th>TIME</th><th>CREW</th><th>ACTION</th><th>EFFECT</th></tr>
                </thead>
                <tbody id="log-body"></tbody>
              </table>
            </div>
          </div>

          <!-- RIGHT -->
          <div>
            <div class="tbl">
              <div class="tbl-head">
                <span>PERSONALITY</span>
                <span class="badge sub">4-AXIS</span>
              </div>
              <div class="tbl-body" style="padding:6px 10px;" id="persona"></div>
            </div>

            <div class="tbl">
              <div class="tbl-head">
                <span>CREW · ${CONFIG.MEMBERS.length}</span>
                <span class="badge sub" id="crew-online">00</span>
              </div>
              <div class="crew-tbl" id="crew-list"></div>
            </div>

            <div class="tbl">
              <div class="tbl-head"><span>MISSION</span></div>
              <div class="tbl-body" style="padding:6px 10px;" id="mission"></div>
            </div>
          </div>
        </div>

        <!-- 기본 명령 -->
        <div class="cmds" id="cmds-main"></div>
        <!-- 관리자 명령 -->
        <div class="cmds" id="cmds-admin" style="margin-top:4px;"></div>

        <div class="prompt">
          <span class="prefix">CMD&gt;</span>
          <input id="prompt-input" autocomplete="off" placeholder="명령어 입력 (help 입력 시 전체 명령어 목록)" />
        </div>

        <div class="admin-hint" id="admin-hint"></div>

        <div class="footer">
          ◣ STATS DECAY IN REAL-TIME // EVERY ACTION SHAPES PERSONALITY // 14-DAY CYCLE ◥
        </div>
      </div>
    </div>
  `;

  // 유저 표시
  document.getElementById('current-user').textContent = currentUser.name;
  if (currentUser.isAdmin) {
    document.getElementById('admin-badge').innerHTML = '<span class="admin-badge">ADMIN</span>';
    document.getElementById('admin-hint').className = 'admin-hint active';
    document.getElementById('admin-hint').textContent = '// ADMIN MODE ACTIVE — 위험한 명령 사용 가능 //';
  } else {
    document.getElementById('admin-hint').textContent = '';
  }

  // 명령 버튼 렌더
  renderCommandButtons();

  // 프롬프트
  const pInput = document.getElementById('prompt-input');
  pInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const raw = e.target.value.trim();
    if (!raw) return;
    e.target.value = '';
    handleCommand(raw);
  });
}

// ────────────────────────────────────────────────────────────
// 명령 버튼
// ────────────────────────────────────────────────────────────
/**
 * SIGNAL 버튼 펄스 토글 - render()에서 매번 호출
 * 활성 신호(미해독, 미만료) 있으면 .signal-pulse 추가
 */
function updateSignalPulse() {
  if (!currentPet) return;
  const sigBtn = document.querySelector('button[data-act="signal"]');
  if (!sigBtn) return;
  const hasActive = currentPet.signals
    && Object.values(currentPet.signals).some(s =>
      s && !s.skipped && !s.expired && !s.completedAt
    );
  if (hasActive) {
    sigBtn.classList.add('signal-pulse');
  } else {
    sigBtn.classList.remove('signal-pulse');
  }
}

function renderCommandButtons() {
  const mainCmds = document.getElementById('cmds-main');
  const adminCmds = document.getElementById('cmds-admin');

  mainCmds.innerHTML = `
    <button class="cmd primary" data-act="feed">FEED</button>
    <button class="cmd primary" data-act="play">PLAY</button>
    <button class="cmd primary" data-act="sleep">SLEEP</button>
    <button class="cmd primary" data-act="clean">CLEAN</button>
    <button class="cmd primary" data-act="train">TRAIN</button>
    <button class="cmd primary" data-act="talk">TALK</button>
  `;

  // 관리자가 아닐 경우: SIGNAL / GAME / PENDING / LORE(TEEN 이전만) / LOGOUT
  if (!currentUser.isAdmin) {
    const stage = currentPet?.stage;
    const showLore = (stage !== 'TEEN' && stage !== 'ADULT');
    // 진행 중인 신호 (해독 진행 중, 미완료/미만료) 있으면 펄스 클래스
    // 활성 = !skipped && !expired && !completedAt
    const hasActiveSignal = currentPet?.signals
      && Object.values(currentPet.signals).some(s =>
        s && !s.skipped && !s.expired && !s.completedAt
      );
    const signalCls = hasActiveSignal ? ' signal-pulse' : '';
    if (showLore) {
      adminCmds.innerHTML = `
        <button class="cmd${signalCls}" data-act="signal" style="grid-column: span 2;">SIGNAL</button>
        <button class="cmd" data-act="minigame" style="grid-column: span 2;">GAME</button>
        <button class="cmd" data-act="pending" style="grid-column: span 2;">COMMUNICATE</button>
        <button class="cmd" data-act="lore">LORE</button>
        <button class="cmd" data-act="logout">LOGOUT</button>
      `;
    } else {
      // TEEN/ADULT: LORE 제거
      adminCmds.innerHTML = `
        <button class="cmd${signalCls}" data-act="signal" style="grid-column: span 2;">SIGNAL</button>
        <button class="cmd" data-act="minigame" style="grid-column: span 2;">GAME</button>
        <button class="cmd" data-act="pending">COMMUNICATE</button>
        <button class="cmd" data-act="logout">LOGOUT</button>
      `;
    }
  } else {
    // 관리자일 경우: 상단 줄 (핵심 명령)
    adminCmds.innerHTML = `
      <button class="cmd admin" data-act="reset">RESET 전체</button>
      <button class="cmd admin" data-act="edit">EDIT</button>
      <button class="cmd admin" data-act="status">STATUS</button>
      <button class="cmd admin" data-act="help">HELP</button>
    `;

    // 기존 분산된 바들 제거 (재렌더 시 중복 방지)
    ['cmds-sim', 'cmds-preset', 'cmds-time', 'cmds-stat'].forEach(id => {
      const old = document.getElementById(id);
      if (old) old.remove();
    });

    // 카테고리 그룹 컨테이너 (한 번만 생성)
    let groupedBar = document.getElementById('cmds-grouped');
    if (!groupedBar) {
      groupedBar = document.createElement('div');
      groupedBar.id = 'cmds-grouped';
      groupedBar.className = 'admin-groups';
      groupedBar.style.marginTop = '4px';
      adminCmds.parentNode.insertBefore(groupedBar, adminCmds.nextSibling);
    }

    // 펼침 상태 저장 (localStorage, 세션 유지)
    const savedExpanded = JSON.parse(localStorage.getItem('adminGroupExpanded') || '{}');

    const groups = [
      {
        id: 'sim',
        label: '단계 이동',
        defaultOpen: false,
        buttons: `
          <button class="cmd admin" data-act="sim-egg">→ EGG</button>
          <button class="cmd admin" data-act="sim-baby">→ BABY</button>
          <button class="cmd admin" data-act="sim-child">→ CHILD</button>
          <button class="cmd admin" data-act="sim-teen">→ TEEN</button>
          <button class="cmd admin" data-act="sim-adult">→ ADULT</button>
          <button class="cmd admin" data-act="sim-kill">→ DEAD</button>
        `,
      },
      {
        id: 'time',
        label: '시간 조작',
        defaultOpen: false,
        buttons: `
          <button class="cmd admin" data-act="age-1">+1h</button>
          <button class="cmd admin" data-act="age-3">+3h</button>
          <button class="cmd admin" data-act="age-6">+6h</button>
          <button class="cmd admin" data-act="age-12">+12h</button>
          <button class="cmd admin" data-act="age-24">+24h</button>
          <button class="cmd admin" data-act="age-custom">⏱ 커스텀</button>
        `,
      },
      {
        id: 'edit',
        label: '스탯/성격 편집',
        defaultOpen: false,
        buttons: `
          <button class="cmd admin" data-act="preset-full">스탯 MAX</button>
          <button class="cmd admin" data-act="preset-low">스탯 LOW</button>
          <button class="cmd admin" data-act="edit-stat">스탯 편집</button>
          <button class="cmd admin" data-act="edit-persona">성격 편집</button>
        `,
      },
      {
        id: 'events',
        label: '이벤트 / 미니게임',
        defaultOpen: true,
        buttons: `
          <button class="cmd admin" data-act="signal-admin">📡 신호 제어</button>
          <button class="cmd admin" data-act="finale">⭐ FINALE</button>
          <button class="cmd admin" data-act="minigame">🎯 GAME</button>
          <button class="cmd admin" data-act="pending">💭 COMMUNICATE</button>
          <button class="cmd admin" data-act="radio-test">📻 라디오 테스트</button>
          <button class="cmd admin" data-act="radio-broadcast">📡 모든 크루에게 라디오 발사</button>
          <button class="cmd admin" data-act="noise-test">⚡ 노이즈 테스트</button>
        `,
      },
      {
        id: 'system',
        label: '시스템',
        defaultOpen: false,
        buttons: `
          <button class="cmd admin" data-act="forcerefresh">⚡ 전체 새로고침</button>
          <button class="cmd admin" data-act="killswitch">🔒 킬스위치</button>
          <button class="cmd admin" data-act="trimlogs">🧹 LOG 정리</button>
          <button class="cmd admin" data-act="clearlogs">LOG 리셋</button>
        `,
      },
      {
        id: 'backup',
        label: '백업 / 복원',
        defaultOpen: false,
        buttons: `
          <button class="cmd admin" data-act="snapshotsave">💾 SNAP</button>
          <button class="cmd admin" data-act="snapshotlist">♻ RESTORE</button>
          <button class="cmd admin" data-act="adminrevive">REVIVE</button>
        `,
      },
      {
        id: 'exit',
        label: '기타',
        defaultOpen: true,
        buttons: `
          <button class="cmd" data-act="lore">LORE</button>
          <button class="cmd" data-act="logout">LOGOUT</button>
        `,
      },
    ];

    groupedBar.innerHTML = groups.map(g => {
      const open = savedExpanded[g.id] !== undefined ? savedExpanded[g.id] : g.defaultOpen;
      return `
        <div class="admin-group ${open ? 'open' : ''}" data-group="${g.id}">
          <div class="admin-group-head" data-toggle="${g.id}">
            <span class="admin-group-arrow">${open ? '▾' : '▸'}</span>
            <span class="admin-group-label">${g.label}</span>
          </div>
          <div class="admin-group-body">
            <div class="cmds">${g.buttons}</div>
          </div>
        </div>
      `;
    }).join('');

    // 토글 동작
    groupedBar.querySelectorAll('.admin-group-head').forEach(head => {
      head.addEventListener('click', () => {
        const gid = head.dataset.toggle;
        const box = groupedBar.querySelector(`[data-group="${gid}"]`);
        const willOpen = !box.classList.contains('open');
        box.classList.toggle('open', willOpen);
        head.querySelector('.admin-group-arrow').textContent = willOpen ? '▾' : '▸';
        savedExpanded[gid] = willOpen;
        localStorage.setItem('adminGroupExpanded', JSON.stringify(savedExpanded));
      });
    });
  }

  document.querySelectorAll('.cmd').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'lore') showLore();
      else if (act === 'talk') showTalkMenu();
      else if (act === 'feed') showActionSubmenu('feed');
      else if (act === 'play') showActionSubmenu('play');
      else if (act === 'reset') adminReset();
      else if (act === 'signal') showSignalList();
      else if (act === 'signal-admin') showSignalAdminPanel();
      else if (act === 'minigame') showMinigameHub();
      else if (act === 'pending') showPendingQuestions();
      else if (act === 'radio-test') testRadioPopup();
      else if (act === 'radio-broadcast') broadcastRadioToAllCrew();
      else if (act === 'noise-test') triggerNoiseEffect();
      else if (act === 'finale') {
        // 이미 봉인된 경우 편지 보기, 아니면 답장 UI
        if (currentPet?.finaleSealed) showSealedLetter();
        else if (currentUser.isAdmin) showFinaleAdminMenu();
        else showFinaleUI();
      }
      else if (act === 'clearlogs') adminClearLogs();
      else if (act === 'trimlogs') adminTrimLogs();
      else if (act === 'forcerefresh') adminForceRefresh();
      else if (act === 'killswitch') adminKillSwitch();
      else if (act === 'edit') adminEdit();
      else if (act === 'edit-stat') adminEditStat();
      else if (act === 'edit-persona') adminEditPersona();
      else if (act === 'adminrevive') adminRevive();
      else if (act === 'backup') adminBackup();
      else if (act === 'snapshotsave') adminSnapshotSave();
      else if (act === 'snapshotlist') adminSnapshotList();
      else if (act === 'logout') doLogout();
      else if (act === 'help') showHelp();
      else if (act === 'status') adminStatus();
      else if (act.startsWith('sim-')) adminSimJump(act.slice(4));
      else if (act.startsWith('preset-')) adminPreset(act.slice(7));
      else if (act.startsWith('age-')) {
        const key = act.slice(4);
        if (key === 'custom') adminAgeCustom();
        else adminAge(Number(key));
      }
      else handleAction(act);
    });
  });
}

// ────────────────────────────────────────────────────────────
// 프롬프트 명령 처리
// ────────────────────────────────────────────────────────────
/**
 * 화면 전체 노이즈 이펙트 (순간적)
 * - TEEN+ CMD '화성' 또는 OBJECT 테스트용
 * - 약 0.8초 지속
 */
function triggerNoiseEffect() {
  const existing = document.getElementById('noise-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'noise-overlay';
  overlay.className = 'noise-overlay';

  // 정적 SVG 노이즈 (turbulence 필터)
  overlay.innerHTML = `
    <svg width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="noise-filter">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="matrix" values="
          0 0 0 0 0.1
          0 0 0 0 0.8
          0 0 0 0 0.3
          0 0 0 0.45 0
        "/>
      </filter>
      <rect width="100%" height="100%" filter="url(#noise-filter)"/>
    </svg>
    <div class="noise-scanline"></div>
  `;
  document.body.appendChild(overlay);

  // 치지직 소리
  try {
    if (!sfxAudioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) sfxAudioCtx = new AC();
    }
    if (sfxAudioCtx) {
      if (sfxAudioCtx.state === 'suspended') sfxAudioCtx.resume();
      const ctx = sfxAudioCtx;
      const bufSize = ctx.sampleRate * 0.6;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + 0.6);
    }
  } catch (err) { /* ignore */ }

  setTimeout(() => overlay.remove(), 800);
}

function handleCommand(raw) {
  // 특수 키워드: '화성' → 노이즈 이펙트 (TEEN 이상, OBJECT는 항상)
  if (raw.trim() === '화성') {
    if (currentUser?.isAdmin ||
        currentPet?.stage === 'TEEN' ||
        currentPet?.stage === 'ADULT') {
      triggerNoiseEffect();
      return;
    }
  }

  // 1) 인사말 매칭 먼저 (자연어 우선)
  const greetKey = matchGreeting(raw);
  if (greetKey) return handleGreeting(greetKey, raw);

  const cmd = raw.toLowerCase();
  const [head, ...args] = cmd.split(/\s+/);

  // 기본 행동
  if (head === 'feed') return showActionSubmenu('feed');
  if (head === 'play') return showActionSubmenu('play');
  if (['sleep','clean','train'].includes(head)) {
    handleAction(head);
    return;
  }

  if (head === 'lore') return showLore();
  if (head === 'talk') return showTalkMenu();
  if (head === 'help' || head === '?') return showHelp();
  if (head === 'logout' || head === 'exit') return doLogout();

  // 관리자 전용
  if (!currentUser.isAdmin) {
    // 자유 문장으로 간주하여 펜딩 질문으로 저장
    savePendingQuestion(raw);
    return;
  }

  if (head === 'reset') return adminReset();
  if (head === 'revive') return adminRevive();
  if (head === 'backup') return adminBackup();
  if (head === 'snapshot' || head === 'snap') return adminSnapshotSave();
  if (head === 'restore' || head === 'snapshots') return adminSnapshotList();
  if (head === 'restore') return adminRestore();
  if (head === 'kill') return adminKill();
  if (head === 'evolve') return adminEvolve(args[0]);
  if (head === 'set') return adminSet(args[0], args[1]);
  if (head === 'age') return adminAge(args[0]);
  if (head === 'persona') return adminPersona(args[0], args[1]);
  if (head === 'say') return adminSay(args.join(' '));
  if (head === 'narrate') return adminNarrate(args.join(' '));
  if (head === 'status') return adminStatus();
  if (head === 'clear-logs' || head === 'clearlogs') return adminClearLogs();
  if (head === 'refresh' || head === 'force-refresh') return adminForceRefresh();
  if (head === 'kill' || head === 'killswitch') return adminKillSwitch();

  appendSystemLog(`⚠ "${head}": 알 수 없는 명령입니다. help 입력.`, 'warn');
}

/**
 * 크루가 CMD로 명령어 대신 자유 문장을 입력한 경우
 * → 펜딩 질문으로 원자적 저장 (다른 크루 동시 저장 시에도 유실 안 됨)
 */
async function savePendingQuestion(raw) {
  if (!currentPet || currentPet.isDead) return;
  if (!raw || raw.trim().length < 2) return;

  const text = raw.trim().slice(0, 120);
  const question = {
    user: currentUser.name,
    text,
    at: Date.now(),
    answered: false,
    answer: '',
    answerBy: '',
    answerAt: 0,
  };

  try {
    // 트랜잭션으로 추가 (Firebase 레벨에서 원자적)
    await Backend.appendPendingQuestion(question);
    // 공용 로그
    await Backend.addLog({
      user: currentUser.name, action: 'MSG',
      text: `◎ "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}" 남김`,
      type: 'system',
    });
    appendSystemLog(`◎ 질문이 기록되었어. 언젠가 답이 돌아올지도 몰라.`, 'personality');
  } catch (err) {
    console.error('[pending] 저장 실패:', err);
    appendSystemLog(`⚠ 메시지 저장 실패 · 다시 시도해주세요`, 'warn');
  }
}

// ────────────────────────────────────────────────────────────
// 기본 행동
// ────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────
// FEED / PLAY 서브메뉴 — 종류 선택 팝업
// ────────────────────────────────────────────────────────────
function showActionSubmenu(action) {
  if (!currentPet || currentPet.isDead) return;
  // EGG 상태에서도 허용 (돌봄 가능)

  // 이미 열려있으면 토글
  const existing = document.getElementById('submenu-modal');
  if (existing) { existing.remove(); return; }

  const stage = currentPet.stage || 'CHILD';
  const menuDef = action === 'feed'
    ? (CONFIG.FEED_MENU_BY_STAGE?.[stage] || CONFIG.FEED_MENU)
    : action === 'play'
      ? (CONFIG.PLAY_MENU_BY_STAGE?.[stage] || CONFIG.PLAY_MENU)
      : null;
  if (!menuDef) return;

  const titles = {
    feed: '무엇을 먹일까?',
    play: '무엇을 하고 놀까?',
  };

  const modal = document.createElement('div');
  modal.id = 'submenu-modal';
  modal.className = 'talk-modal';

  modal.innerHTML = `
    <div class="talk-modal-head">
      <span>▶ ${titles[action]}</span>
      <span class="talk-close" id="submenu-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body">
      ${menuDef.map(item => `
        <button class="talk-option" data-key="${item.key}">${item.label}</button>
      `).join('')}
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('submenu-close').addEventListener('click', () => modal.remove());

  modal.querySelectorAll('.talk-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const selected = menuDef.find(m => m.key === key);
      modal.remove();
      handleAction(action, selected);
    });
  });
}

async function handleAction(action, submenuItem = null) {
  if (!currentPet) return;

  tickStats(currentPet);

  // 적용 전 성격 상태 저장 (변화 감지용)
  const prevPersonality = { ...(currentPet.personality || {}) };

  const result = applyAction(currentPet, action, currentUser.name, submenuItem?.override);

  if (!result.ok) {
    const reasons = {
      dead: '사망 상태입니다. 부활이 필요합니다.',
      egg: 'EGG 상태입니다. 부화를 기다려주세요.',
      tired: `${currentPet.name}이(가) 너무 피곤해서 할 수 없어요.`,
      unknown: '알 수 없는 명령',
    };
    await Backend.addLog({
      user: currentUser.name, action,
      text: `⚠ ${reasons[result.reason] || result.reason}`,
      type: 'warn',
    });
    if (result.reason === 'tired') showEmote('sweat');
    return;
  }

  // 이모티콘 표시
  emoteForAction(action);

  // ASCII 흔들기 애니메이션 (액션별로 다른 움직임)
  playActionAnimation(action);

  // 액션별 8bit 사운드
  playActionSfx(action);

  // 성격 변화 감지 → 토스트
  const personaDelta = CONFIG.PERSONALITY_DELTA[action] || {};
  const personaLabels = {
    activeVsCalm:      ['차분함 ↓', '활발함 ↑'],
    greedVsTemperance: ['절제 ↓', '탐욕 ↑'],
    socialVsIntro:     ['내향 ↓', '사교 ↑'],
    diligentVsFree:    ['자유 ↓', '성실 ↑'],
  };
  for (const [axis, d] of Object.entries(personaDelta)) {
    if (d === 0) continue;
    const labels = personaLabels[axis];
    if (!labels) continue;
    const label = d > 0 ? labels[1] : labels[0];
    showToast(`⚙ PERSONALITY: ${label} (${d > 0 ? '+' : ''}${d})`, 'personality');
  }

  // 크루 최애/가장 뜸한 크루 계산
  const { fav, least } = getCrewFavorites(currentPet);

  // 대사 생성 (서브메뉴 종류 포함)
  let speech = getActionSpeech(action, currentPet, {
    user: currentUser.name,
    prevUser: prevUser || '누군가',
    name: currentPet.name,
    fav, least,
    submenuLabel: submenuItem?.label,
    submenuKey: submenuItem?.key,
  });

  // SLEEP 시 30% 확률로 자장가 회상으로 대체 (signal-003 해독 시)
  if (action === 'sleep' && Math.random() < 0.3) {
    const lullaby = getLullabyRecall(currentPet, {
      user: currentUser.name, name: currentPet.name,
    });
    if (lullaby) speech = lullaby;
  }

  if (speech) {
    saveSpeechForUser(currentPet, currentUser.name, { text: speech, at: Date.now(), to: currentUser.key });
  }
  prevUser = currentUser.name;

  const eff = CONFIG.ACTIONS[action];
  const actualEff = { ...eff, ...(submenuItem?.override || {}) };
  // 성격 라벨 (personality 객체 평탄화용)
  const effectPersonaLabels = {
    activeVsCalm:      ['차분', '활발'],
    greedVsTemperance: ['절제', '탐욕'],
    socialVsIntro:     ['내향', '사교'],
    diligentVsFree:    ['자유', '성실'],
  };
  const parts = [];
  for (const [k, v] of Object.entries(actualEff)) {
    if (['label', 'desc', 'exp'].includes(k)) continue;
    if (k === 'personality' && v && typeof v === 'object') {
      // 성격 객체 평탄화
      for (const [axis, d] of Object.entries(v)) {
        if (d === 0 || !effectPersonaLabels[axis]) continue;
        const label = d > 0 ? effectPersonaLabels[axis][1] : effectPersonaLabels[axis][0];
        parts.push(`${label} ${d > 0 ? '+' : ''}${d}`);
      }
    } else if (typeof v === 'number') {
      parts.push(`${k} ${v > 0 ? '+' : ''}${v}`);
    }
  }
  const effTxt = parts.join(' / ');

  const actionLabel = submenuItem
    ? `${eff.label} · ${submenuItem.label}`
    : eff.label;

  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: actionLabel,
    text: effTxt || eff.desc,
    type: 'action',
    ...(currentUser.isAdmin ? { viewer: currentUser.name } : {}),
  });
}

// ────────────────────────────────────────────────────────────
// 로그 스크롤 — 점프 버튼 (사용자가 위에서 보고 있을 때만 표시)
// ────────────────────────────────────────────────────────────
function showLogJumpButton(container) {
  let btn = document.getElementById('log-jump-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'log-jump-btn';
    btn.className = 'log-jump';
    btn.innerHTML = '↓ 최신 로그로';
    btn.addEventListener('click', () => {
      container.scrollTop = container.scrollHeight;
      container.dataset.lastSeenAt = Date.now();
      container.dataset.userScrolledUp = 'false';  // 자동 모드 복귀
      hideLogJumpButton();
    });
    // 로그 컨테이너의 부모 안에 absolute로 배치
    if (container.parentNode) {
      container.parentNode.style.position = 'relative';
      container.parentNode.appendChild(btn);
    }
  }
  btn.style.display = 'block';
}

function hideLogJumpButton() {
  const btn = document.getElementById('log-jump-btn');
  if (btn) btn.style.display = 'none';
}

// 사용자가 직접 맨 아래로 스크롤하면 lastSeenAt 갱신 + 버튼 숨김
function attachLogScrollListener() {
  const logBody = document.getElementById('log-body');
  if (!logBody) return;
  const container = logBody.closest('.log-tbl');
  if (!container || container.dataset.scrollListener === 'on') return;
  container.dataset.scrollListener = 'on';
  // 초기 상태: 자동 따라가기 모드 (맨 아래)
  container.dataset.userScrolledUp = 'false';

  // 프로그램에 의한 scrollTop 변경과 사용자 스크롤을 구분하기 위해
  // wheel/touchstart 이벤트로 "사용자 의도"를 감지
  const markUserScrolled = () => {
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distFromBottom > 50) {
      container.dataset.userScrolledUp = 'true';
    }
  };
  container.addEventListener('wheel', markUserScrolled, { passive: true });
  container.addEventListener('touchstart', markUserScrolled, { passive: true });
  container.addEventListener('touchmove', markUserScrolled, { passive: true });

  // scroll 이벤트에서 맨 아래 도달 체크 (버튼 숨김 + 자동 모드 복귀)
  container.addEventListener('scroll', () => {
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distFromBottom < 20) {
      container.dataset.userScrolledUp = 'false';
      container.dataset.lastSeenAt = Date.now();
      hideLogJumpButton();
    }
  });
}

// ────────────────────────────────────────────────────────────
// 화면 렌더 (구독 콜백에서 매번 호출)
// ────────────────────────────────────────────────────────────
function render() {
  if (!currentPet) return;

  // 로그 스크롤 리스너 한 번 등록
  attachLogScrollListener();

  // 화면 진입 시 지연 계산
  tickStats(currentPet);
  const stageResult = updateStage(currentPet);
  const progress = getProgress(currentPet);

  // 헤더 시간
  document.getElementById('time-info').textContent =
    `DAY ${String(progress.day).padStart(2,'0')} · ${progress.hoursLived}h`;

  // 캐릭터 아트 (표정 동적)
  // 팔 벌리기/액션 애니메이션 중에는 덮어쓰지 않음
  const petArtEl = document.getElementById('pet-art');
  const isAnimating = petArtEl.classList.contains('pet-hug')
    || petArtEl.className.match(/act-(feed|play|sleep|clean|train)/);
  if (!isAnimating) {
    petArtEl.textContent = renderTeddy(currentPet);
  }
  document.getElementById('stage-badge').textContent = currentPet.stage;
  // 탭 리스너 유지 (DOM이 바뀌었을 수도 있으니 확인)
  attachPetTapListener();

  // 라디오 신호 아이콘 (활성 이벤트 있을 때만 표시)
  renderRadioIcon();

  // SIGNAL 버튼 펄스 토글 (활성 신호 있을 때)
  updateSignalPulse();

  // 단계별 태그
  const stageTags = {
    EGG:   [{ text: '포장 중', class: '' }, { text: '수송 대기', class: '' }],
    BABY:  [{ text: '갓 부화', class: '' }, { text: '꽃봉오리', class: '' }],
    CHILD: [{ text: '유년기', class: '' }, { text: 'AGE ~5', class: '' }],
    TEEN:  [{ text: '청소년기', class: '' }, { text: 'AGE ~12', class: '' }],
    ADULT: [{ text: '성년기', class: '' }, { text: 'AGE 13+', class: '' }, { text: '분류 대상', class: '' }],
  };
  const tagsEl = document.getElementById('pet-tags');
  if (tagsEl) {
    const tags = stageTags[currentPet.stage] || [];
    tagsEl.innerHTML = `
      <span class="tag">FROM MARS</span>
      ${tags.map(t => `<span class="tag ${t.class}">${t.text}</span>`).join('')}
      <span class="tag">SHACKLE</span>
    `;
  }

  // 부가 스탯 - EGG일 땐 승선 타임라인으로 대체
  if (currentPet.stage === 'EGG') {
    const hoursLived = Math.max(0, (Date.now() - currentPet.bornAt) / 3600000);
    const remaining = Math.max(0, 36 - hoursLived);
    const narrative = getEggNarrative(currentPet);
    document.getElementById('pet-extras').innerHTML = `
      <div style="text-align:center;color:#8fb39a;font-size:11px;letter-spacing:2px;margin-bottom:8px;">
        ── 칼라릴리호 항해 중 ──
      </div>
      <div class="kv-row"><span class="k">ELAPSED</span><span class="v hl">${Math.floor(hoursLived)}h</span></div>
      <div class="kv-row"><span class="k">TO HATCH</span><span class="v" style="color:#e8a853;">${Math.floor(remaining)}h</span></div>
      <div style="margin-top:8px;padding:6px 8px;background:#0d1f14;border:1px dotted #2d5a3e;font-size:10px;color:#8fb39a;line-height:1.7;font-style:italic;">
        ${narrative ? narrative.text : '◎ 승선 대기 중…'}
      </div>
    `;
  } else {
    // 다음 단계까지 남은 시간 계산 (분 단위까지)
    const hoursLived = Math.max(0, (Date.now() - currentPet.bornAt) / 3600000);
    const stageInfo = CONFIG.STAGES.find(s => s.name === currentPet.stage);
    const nextStageInfo = stageInfo ? CONFIG.STAGES.find(s => s.fromHour === stageInfo.toHour) : null;
    const hoursToNext = stageInfo ? Math.max(0, stageInfo.toHour - hoursLived) : 0;
    const nextStageName = nextStageInfo?.name || null;
    const wholeHours = Math.floor(hoursToNext);
    const remainMinutes = Math.floor((hoursToNext - wholeHours) * 60);
    const remainLabel = wholeHours > 0
      ? `${wholeHours}h ${remainMinutes}m`
      : `${remainMinutes}m`;

    document.getElementById('pet-extras').innerHTML = `
      <div class="kv-row"><span class="k">STRENGTH</span><span class="v hl">${Math.round(currentPet.strength)}</span></div>
      <div class="kv-row"><span class="k">INTEL</span><span class="v hl">${Math.round(currentPet.intel)}</span></div>
      <div class="kv-row"><span class="k">BOND</span><span class="v hl">${Math.round(currentPet.bond)}</span></div>
      <div class="kv-row"><span class="k">LEVEL</span><span class="v">${currentPet.level || 1}</span></div>
      ${nextStageName ? `
        <div class="kv-row divider-top"><span class="k">→ ${nextStageName}</span>
          <span class="v" style="color:#e8a853;">${remainLabel}</span>
        </div>
      ` : ''}
      <div class="kv-row ${nextStageName ? '' : 'divider-top'}"><span class="k">REVIVE</span>
        <span class="v" style="color:#c97d5f;">${renderReviveDots(currentPet.deathCount)}</span>
      </div>
    `;
  }

  // 메인 스탯
  document.getElementById('stat-table').innerHTML = `
    <tr><td class="k">HUNGER</td><td class="b b-hunger ${currentPet.hunger<20?'critical-bar':''}">${renderBar(currentPet.hunger)}</td><td class="v">${Math.round(currentPet.hunger)}</td><td class="d">-${CONFIG.DECAY_PER_HOUR.hunger}/h</td></tr>
    <tr><td class="k">HAPPY</td><td class="b b-happy ${currentPet.happy<20?'critical-bar':''}">${renderBar(currentPet.happy)}</td><td class="v">${Math.round(currentPet.happy)}</td><td class="d">-${CONFIG.DECAY_PER_HOUR.happy}/h</td></tr>
    <tr><td class="k">ENERGY</td><td class="b b-energy ${currentPet.energy<20?'critical-bar':''}">${renderBar(currentPet.energy)}</td><td class="v">${Math.round(currentPet.energy)}</td><td class="d">-${CONFIG.DECAY_PER_HOUR.energy}/h</td></tr>
    <tr><td class="k">HYGIENE</td><td class="b b-hygiene ${currentPet.hygiene<20?'critical-bar':''}">${renderBar(currentPet.hygiene)}</td><td class="v">${Math.round(currentPet.hygiene)}</td><td class="d">-${CONFIG.DECAY_PER_HOUR.hygiene}/h</td></tr>
  `;

  // 대사 / 사망 박스
  const speechWrapper = document.getElementById('speech-wrapper');
  if (currentPet.isDead) {
    const isFinal = currentPet.deathCount >= CONFIG.MAX_REVIVES;
    const finalText = isFinal
      ? pickSpeech(SPEECHES.finalDeath, { name: currentPet.name })
      : pickSpeech(SPEECHES.dying, { name: currentPet.name });
    speechWrapper.innerHTML = `
      <div class="death-box">
        <h3>✝ SUBJECT DECEASED ✝</h3>
        <p>${finalText}</p>
        <p style="font-size:10px;color:#6b8f76;">사망 횟수: ${currentPet.deathCount} / ${CONFIG.MAX_REVIVES}</p>
        ${isFinal ? '' : '<button class="revive-btn" id="revive-btn">부활시키기</button>'}
      </div>
    `;
    const rBtn = document.getElementById('revive-btn');
    if (rBtn) rBtn.addEventListener('click', doRevive);
  } else if (currentPet.stage === 'EGG') {
    // EGG: 본인에게 한 대사가 있으면 그걸 보여주고, 없으면 아카이브 해설
    const personalSpeech = getVisibleSpeech(currentPet, currentUser.name);
    const narrative = getEggNarrative(currentPet);
    const hoursLived = Math.max(0, (Date.now() - currentPet.bornAt) / 3600000);
    const remaining = Math.max(0, 36 - hoursLived);

    // 최근 1분 이내에 개인 대사가 있었으면 그걸 우선 표시 (행동 직후)
    const recentSpeech = personalSpeech && (Date.now() - (personalSpeech.at || 0) < 60000);

    if (recentSpeech) {
      speechWrapper.innerHTML = `
        <div class="speech">
          <div class="speech-head">
            <span>▶ ${currentPet.name} · ${timeAgo(personalSpeech.at)}</span>
            <span>EGG</span>
          </div>
          <div class="speech-body">${personalSpeech.text}</div>
        </div>
        <div style="padding:8px 12px;background:#050a07;border:1px dotted #2d5a3e;margin-bottom:8px;font-size:11px;color:#6b8f76;text-align:center;letter-spacing:1px;">
          // 칼라릴리호 항해 중 — 부화까지 ${Math.floor(remaining)}h //
        </div>
      `;
    } else {
      speechWrapper.innerHTML = `
        <div class="speech">
          <div class="speech-head">
            <span>▶ ARCHIVE LOG // MARS II</span>
            <span>T-${Math.floor(remaining)}h</span>
          </div>
          <div class="speech-body" style="font-style:normal;color:#8fb39a;">
            ${narrative ? narrative.text.replace('◎ ', '') : '승선 대기 중…'}
          </div>
        </div>
        <div style="padding:8px 12px;background:#050a07;border:1px dotted #2d5a3e;margin-bottom:8px;font-size:11px;color:#6b8f76;text-align:center;letter-spacing:1px;">
          // 칼라릴리호 항해 중 — 부화까지 ${Math.floor(remaining)}h //
        </div>
      `;
    }
  } else {
    // 개인 대사가 있으면 그것을, 없으면 공용 대사 (최신 기준)
    const lastSpeech = getVisibleSpeech(currentPet, currentUser.name);
    // "~에게" 표시: 개인 대사라면 본인에게 한 말이니 표시 안 함 (중복 제거)
    const showAddressee = lastSpeech?.to
      && lastSpeech.to !== '__sys__'
      && lastSpeech.to !== '__admin__'
      && lastSpeech.to !== currentUser.key;
    const speechText = lastSpeech?.text || '…';
    const speechKey = lastSpeech ? `${lastSpeech.at}_${speechText.slice(0, 10)}` : '_';
    speechWrapper.innerHTML = `
      <div class="speech">
        <div class="speech-head">
          <span>▶ ${currentPet.name} · ${lastSpeech ? timeAgo(lastSpeech.at) : '–'}${showAddressee ? ' · ' + getUserNameByKey(lastSpeech.to) + '에게' : ''}</span>
        </div>
        <div class="speech-body" id="speech-body" data-speech-key="${speechKey}">${speechText}</div>
      </div>
    `;
    // 타자기 연출 (새 대사일 때만)
    startSpeechTypewriter();
  }

  // 로그 (최신 로그 ID 기억해서 새 로그만 애니메이션)
  const logBody = document.getElementById('log-body');
  const lastShownAt = logBody.dataset.lastAt ? Number(logBody.dataset.lastAt) : 0;
  let newestAt = lastShownAt;

  // 개인용 archive 필터링: viewer 필드가 없거나 본인인 것만
  // 추가: MSG 액션 로그는 OBJECT(관리자)만 보임 (펜딩 추적 도구)
  const visibleLogs = logs.filter(l => {
    if (l.viewer && l.viewer !== currentUser.name) return false;
    if (l.action === 'MSG' && !currentUser.isAdmin) return false;
    return true;
  });

  logBody.innerHTML = visibleLogs.length
    ? visibleLogs.map(l => {
        const atMs = Number(l.at) || 0;
        const t = atMs > 0
          ? new Date(atMs).toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'})
          : '--:--';
        const cls = l.type === 'warn' ? 'warn' : l.type === 'epic' ? 'epic' : l.type === 'system' ? 'system' : l.type === 'admin' ? 'admin' : '';
        const isNew = atMs > lastShownAt;
        if (atMs > newestAt) newestAt = atMs;
        return `<tr class="${cls}${isNew ? ' log-new' : ''}"><td class="time">${t}</td><td class="user">${l.user || 'SYS'}</td><td class="action">${l.action || '-'}</td><td class="effect">${l.text || ''}</td></tr>`;
      }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#4a5f50;padding:14px;">기록 없음</td></tr>';

  logBody.dataset.lastAt = newestAt;

  // 로그 테이블 스크롤 처리
  // - 기본 동작: 새 로그가 오면 항상 맨 아래로 자동 이동 (최신 상태 유지)
  // - 사용자가 스크롤로 위로 올린 상태(userScrolledUp=true)면 자동 이동 중단
  // - 사용자가 다시 맨 아래에 도달하면 자동 이동 재개
  const logContainer = logBody.closest('.log-tbl');
  if (logContainer) {
    const userScrolledUp = logContainer.dataset.userScrolledUp === 'true';
    if (!userScrolledUp) {
      // 자동 따라감
      logContainer.scrollTop = logContainer.scrollHeight;
      hideLogJumpButton();
    } else {
      // 사용자가 올려놓은 상태 → 새 로그 들어오면 버튼 표시
      const hasNewSinceLastView = newestAt > (parseInt(logContainer.dataset.lastSeenAt) || 0);
      if (hasNewSinceLastView) {
        showLogJumpButton(logContainer);
      }
    }
  }

  // 성격 - 호출 규칙: (음수쪽 라벨, 값, 양수쪽 라벨)
  // activeVsCalm 양수=활발, socialVsIntro 양수=사교, ...
  document.getElementById('persona').innerHTML = `
    ${personaRow('차분', currentPet.personality.activeVsCalm, '활발')}
    ${personaRow('절제', currentPet.personality.greedVsTemperance, '탐욕')}
    ${personaRow('내향', currentPet.personality.socialVsIntro, '사교')}
    ${personaRow('자유', currentPet.personality.diligentVsFree, '성실')}
    <div class="persona-label">◆ ${personalityLabel(currentPet)} ◆</div>
  `;

  // 크루 리스트 — 동접자 표시
  const ONLINE_WINDOW = 5 * 60 * 1000; // 5분 이내 heartbeat = 온라인
  const now = Date.now();
  const onlineCrew = [];
  const offlineCrew = [];

  // 디버깅: presenceMap과 MEMBERS 이름이 정확히 일치하는지
  const presenceKeys = Object.keys(presenceMap);
  if (presenceKeys.length > 0) {
    const memberNames = CONFIG.MEMBERS.map(m => m.name);
    const orphans = presenceKeys.filter(k => !memberNames.includes(k));
    if (orphans.length > 0) {
      console.warn('[presence] ⚠ MEMBERS에 없는 이름:', orphans);
    }
  }

  for (const m of CONFIG.MEMBERS) {
    const lastSeen = presenceMap[m.name];
    const isOnline = lastSeen && (now - lastSeen) < ONLINE_WINDOW;
    const isMe = m.name === currentUser.name;
    if (isOnline || isMe) onlineCrew.push({ name: m.name, isMe });
    else offlineCrew.push({ name: m.name });
  }

  // 본인이 맨 위, 온라인 크루, 오프라인 요약
  document.getElementById('crew-list').innerHTML = `
    <table>
      ${onlineCrew.map(c => `
        <tr class="${c.isMe ? 'me' : 'on'}">
          <td class="dot">●</td>
          <td>${c.name}${c.isMe ? ' (ME)' : ''}</td>
        </tr>
      `).join('')}
      ${offlineCrew.length > 0 ? `
        <tr class="off" style="font-size:10px;">
          <td class="dot">·</td>
          <td style="color:#6b8f76;">외 ${offlineCrew.length}명 (오프라인)</td>
        </tr>
      ` : ''}
    </table>
  `;
  document.getElementById('crew-online').textContent = String(onlineCrew.length).padStart(2, '0');

  // 미션 진행률
  document.getElementById('mission').innerHTML = `
    <div class="mission-info">MARS II · CYCLE</div>
    <div class="progress"><div class="progress-fill" style="width:${progress.percent.toFixed(1)}%"></div></div>
    <div class="progress-label">
      <span class="hl">${progress.percent.toFixed(1)}%</span>
      <span>${progress.hoursLived} / ${progress.totalHours}h</span>
    </div>
  `;

  // 버튼 비활성화 — 사망 시에만 막음 (EGG는 돌봄 가능)
  const dead = currentPet.isDead;
  document.querySelectorAll('.cmd.primary').forEach(b => {
    b.disabled = dead;
  });

  // 모든 단계: 시간대별 아카이브 해설 자동 노출
  // 각 크루가 새로 접속/갱신 시점에 자기 기준으로 확인
  // narrativeShownKeyBy: { [userName]: lastSeenKey } — 개인별 중복 방지
  const narrativeKey = getStageNarrativeKey(currentPet);
  const viewerName = currentUser.name;
  currentPet.narrativeShownKeyBy = currentPet.narrativeShownKeyBy || {};
  const lastShown = currentPet.narrativeShownKeyBy[viewerName];

  // 중요: narrativeKey가 바뀌어야만 실행 (render마다 Backend 쓰기 방지)
  if (narrativeKey && lastShown !== narrativeKey && !currentPet._narrativeProcessing) {
    currentPet._narrativeProcessing = true;  // 동시 실행 방지
    const narrative = getStageNarrative(currentPet);
    if (narrative) {
      currentPet.narrativeShownKeyBy[viewerName] = narrativeKey;

      // EGG 단계에서는 말풍선 자리를 해설이 차지
      if (currentPet.stage === 'EGG') {
        saveSpeechForUser(currentPet, viewerName, {
          text: narrative.text, at: Date.now(), to: viewerName,
        });
      }

      Backend.savePet(currentPet).finally(() => {
        delete currentPet._narrativeProcessing;
      });
      Backend.addLog({
        user: null, action: 'ARCHIVE',
        text: narrative.text,
        type: 'system',
        viewer: viewerName,
      });
    } else {
      delete currentPet._narrativeProcessing;
    }
  }

  // 진화 감지
  if (stageResult.evolved) {
    const evolveKey = `${stageResult.from}_to_${stageResult.to}`;
    const text = pickSpeech(SPEECHES.evolve[evolveKey], {
      user: currentUser.name, name: currentPet.name,
    });
    if (text) {
      saveBroadcastSpeech(currentPet, { text, at: Date.now(), to: '__sys__' });
      // 진화 순간의 대사는 항상 memorableQuote에 기록
      recordMemorableQuote(currentPet, text, { user: currentUser.name });
    }
    Backend.savePet(currentPet);
    Backend.addLog({
      user: null, action: 'EVOLVE',
      text: `✦ ${stageResult.from} → ${stageResult.to}`,
      type: 'epic',
    });

    // CHILD 진화 시 미니게임 해금 안내 (전 크루에게)
    if (stageResult.to === 'CHILD') {
      Backend.addLog({
        user: null, action: 'SYSTEM',
        text: `◆ 새 놀이 해금: [G] 메뉴에서 블랙잭과 틱택토가 열렸습니다`,
        type: 'epic',
      });
    }

    // TEEN 진화 시 라디오 감각 각성 안내
    if (stageResult.to === 'TEEN') {
      Backend.addLog({
        user: null, action: 'SYSTEM',
        text: `◆ 새 감각 각성: 라디오 신호를 듣기 시작했다. 매시간마다 한 번씩 잡힌다.`,
        type: 'epic',
      });
    }
  }
}

// ────────────────────────────────────────────────────────────
// 렌더 헬퍼
// ────────────────────────────────────────────────────────────
function renderBar(val) {
  const n = Math.max(0, Math.min(10, Math.round(val / 10)));
  return '█'.repeat(n) + '░'.repeat(10 - n);
}

function renderReviveDots(count) {
  const max = CONFIG.MAX_REVIVES;
  const used = Math.min(count || 0, max);
  return '● '.repeat(used).trim() + ' ' + '○ '.repeat(max - used).trim();
}

function personaRow(left, val, right) {
  const v = Math.max(-100, Math.min(100, val || 0));
  const displayV = Math.round(v);  // 표시는 정수로
  // 양수면 오른쪽(right)으로 채워짐, 음수면 왼쪽(left)으로 채워짐
  const percent = Math.abs(v) / 2;  // 0 ~ 50%
  const isNeg = v < 0;
  const isPos = v > 0;
  // 더 강한 값일수록 진한 색
  const intensity = Math.abs(v) / 100;  // 0 ~ 1
  const colorRight = `rgba(3, 179, 82, ${0.4 + intensity * 0.6})`;   // 녹색
  const colorLeft = `rgba(232, 168, 83, ${0.4 + intensity * 0.6})`;  // 주황
  const labelColorLeft = isNeg ? '#e8a853' : '#5a6a5e';
  const labelColorRight = isPos ? '#03B352' : '#5a6a5e';

  return `
    <div class="persona-row">
      <span class="persona-label-side" style="color:${labelColorLeft};">◁ ${left}</span>
      <div class="persona-gauge">
        <div class="persona-gauge-track">
          <div class="persona-gauge-center"></div>
          ${isNeg ? `<div class="persona-gauge-fill-left" style="width:${percent.toFixed(1)}%;background:${colorLeft};"></div>` : ''}
          ${isPos ? `<div class="persona-gauge-fill-right" style="width:${percent.toFixed(1)}%;background:${colorRight};"></div>` : ''}
        </div>
        <div class="persona-gauge-value" style="color:${displayV === 0 ? '#5a6a5e' : (isPos ? '#03B352' : '#e8a853')};">${displayV > 0 ? '+' : ''}${displayV}</div>
      </div>
      <span class="persona-label-side" style="color:${labelColorRight};">${right} ▷</span>
    </div>
  `;
}

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return '방금';
  if (d < 3600000) return Math.floor(d / 60000) + '분 전';
  return Math.floor(d / 3600000) + '시간 전';
}

function getUserNameByKey(key) {
  const m = CONFIG.MEMBERS.find(x => x.key === key);
  return m ? m.name : key === '__admin__' ? CONFIG.ADMIN_KEYWORD : '누군가';
}

function appendSystemLog(text, type = 'system') {
  Backend.addLog({ user: 'SYS', action: 'MSG', text, type });
}

// ────────────────────────────────────────────────────────────
// 관리자 행동 로그 래퍼 — 관리자 액션은 본인에게만 보이도록
// admin 타입이거나 관리자가 수행한 모든 액션을 본인 로그로 격리
// (단, EVOLVE/archive 같은 시스템 이벤트는 viewer 없이 공개)
// ────────────────────────────────────────────────────────────
async function logAdminAction(entry) {
  // 관리자가 호출한 경우 viewer를 본인으로 (다른 크루에겐 안 보임)
  if (currentUser?.isAdmin) {
    return Backend.addLog({ ...entry, viewer: currentUser.name });
  }
  return Backend.addLog(entry);
}

// ────────────────────────────────────────────────────────────
// 개인 대사 저장/조회 헬퍼
// 특정 유저에게 한 대사는 그 유저에게만 말풍선으로 보임
// 공용 대사(진화 순간 등)는 lastSpeech에만 저장되어 모두에게 보임
// ────────────────────────────────────────────────────────────
function saveSpeechForUser(pet, userName, speechObj) {
  if (!pet || !userName) return;
  pet.lastSpeechBy = pet.lastSpeechBy || {};
  pet.lastSpeechBy[userName] = speechObj;
}

function saveBroadcastSpeech(pet, speechObj) {
  // 공용 대사 - 모든 유저에게 보임
  if (!pet) return;
  pet.lastSpeech = speechObj;
}

function getVisibleSpeech(pet, userName) {
  if (!pet) return null;
  const personal = pet.lastSpeechBy?.[userName];
  const broadcast = pet.lastSpeech;

  // 둘 중 최신 것 (단, 개인 대사가 우선)
  if (personal && broadcast) {
    return (personal.at || 0) >= (broadcast.at || 0) ? personal : broadcast;
  }
  return personal || broadcast || null;
}

// ────────────────────────────────────────────────────────────
// 픽셀 이모티콘 — 캐릭터 옆에 잠깐 떠오르는 반응
// ────────────────────────────────────────────────────────────
const EMOTE_PRESETS = {
  heart:   { char: '♥', cls: 'heart' },
  heart2:  { char: '<3', cls: 'heart' },
  sweat:   { char: '💦', cls: 'sweat' },
  star:    { char: '★', cls: 'star' },
  sleep:   { char: 'Z', cls: 'sleep' },
  sleep2:  { char: 'zzZ', cls: 'sleep' },
  sparkle: { char: '✧', cls: 'sparkle' },
  note:    { char: '♪', cls: 'note' },
  angry:   { char: '!', cls: 'angry' },
  thinking:{ char: '?', cls: 'star' },
  bubble:  { char: '○', cls: 'sparkle' },
};

function showEmote(presetName) {
  const preset = EMOTE_PRESETS[presetName];
  if (!preset) return;

  let layer = document.getElementById('emote-layer');
  if (!layer) {
    const petArt = document.getElementById('pet-art');
    if (!petArt) return;
    layer = document.createElement('div');
    layer.id = 'emote-layer';
    layer.className = 'emote-layer';
    petArt.appendChild(layer);
  }

  const el = document.createElement('span');
  el.className = `emote ${preset.cls}`;
  el.textContent = preset.char;
  // 약간의 랜덤 위치
  el.style.left = `${Math.random() * 30 - 15}px`;
  el.style.top = `${Math.random() * 10}px`;
  layer.appendChild(el);

  // 애니메이션 끝나면 제거
  setTimeout(() => el.remove(), 1700);
}

// 행동별 이모티콘 매핑
const ACTION_EMOTES = {
  feed:  ['heart', 'sparkle', 'note'],
  play:  ['star', 'note', 'sparkle'],
  sleep: ['sleep', 'sleep2'],
  clean: ['bubble', 'sparkle'],
  train: ['sweat', 'star'],
  talk:  ['heart2', 'note'],
};

function emoteForAction(action) {
  const pool = ACTION_EMOTES[action];
  if (!pool) return;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  showEmote(picked);
}

// ────────────────────────────────────────────────────────────
// 토스트 알림 — 우측 상단에 잠깐 떠오름
// ────────────────────────────────────────────────────────────
function showToast(text, type = 'default') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = text;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ────────────────────────────────────────────────────────────
// ASCII 눈 깜빡임 — 간헐적으로 눈 감았다 뜸
// ────────────────────────────────────────────────────────────
let blinkTimer = null;
function startBlinking() {
  if (blinkTimer) clearInterval(blinkTimer);

  const blink = () => {
    if (!currentPet || currentPet.isDead || currentPet.stage === 'EGG') return;
    const petArt = document.getElementById('pet-art');
    if (!petArt) return;
    // 팔 벌리기/액션 애니메이션 중에는 깜빡이지 않음
    if (petArt.classList.contains('pet-hug')) return;
    if (petArt.className.match(/act-(feed|play|sleep|clean|train)/)) return;

    // 깜빡임 한 번
    petArt.textContent = renderTeddyBlink(currentPet);
    setTimeout(() => {
      if (!currentPet) return;
      const art = document.getElementById('pet-art');
      if (art && !art.classList.contains('pet-hug')
          && !art.className.match(/act-(feed|play|sleep|clean|train)/)) {
        art.textContent = renderTeddy(currentPet);
      }
    }, 150);
  };

  // 3-8초마다 무작위로 깜빡임
  const scheduleNext = () => {
    const delay = 3000 + Math.random() * 5000;
    blinkTimer = setTimeout(() => {
      blink();
      scheduleNext();
    }, delay);
  };
  scheduleNext();
}

// ────────────────────────────────────────────────────────────
// 캐릭터 대사 타자기 연출 (새 대사일 때만)
// ────────────────────────────────────────────────────────────
let lastTypedSpeechKey = '';
let typewriterTimer = null;

function startSpeechTypewriter() {
  const el = document.getElementById('speech-body');
  if (!el) return;
  const key = el.dataset.speechKey || '';
  // 같은 대사 재렌더면 스킵 (이미 썼음)
  if (key === lastTypedSpeechKey) return;
  // 빈 대사(...) 는 스킵
  const fullText = el.textContent || '';
  if (!fullText || fullText.trim() === '…') {
    lastTypedSpeechKey = key;
    return;
  }
  lastTypedSpeechKey = key;

  // 이전 타이머 중단
  if (typewriterTimer) clearTimeout(typewriterTimer);

  // 초기화: 빈 상태로 시작
  el.textContent = '';
  el.classList.add('speech-typing');

  let i = 0;
  const CHAR_DELAY = 35;  // ms per char
  const step = () => {
    if (!el.isConnected) {
      el.classList.remove('speech-typing');
      return;
    }
    i++;
    el.textContent = fullText.slice(0, i);
    if (i < fullText.length) {
      // 마침표/쉼표 뒤에는 살짝 쉼
      const lastChar = fullText[i - 1];
      const extraDelay = (lastChar === '.' || lastChar === '?' || lastChar === '!') ? 180
                       : (lastChar === ',') ? 80 : 0;
      typewriterTimer = setTimeout(step, CHAR_DELAY + extraDelay);
    } else {
      el.classList.remove('speech-typing');
      typewriterTimer = null;
    }
  };
  step();
}

// ────────────────────────────────────────────────────────────
// 캐릭터 말풍선 (짧은 대사 간헐적 표시)
// ────────────────────────────────────────────────────────────
function showChatBubble(text) {
  if (!text) return;
  const petArt = document.getElementById('pet-art');
  if (!petArt) return;

  // 기존 말풍선 제거 (중복 방지)
  const old = petArt.parentNode.querySelector('.chat-bubble');
  if (old) old.remove();

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  petArt.parentNode.style.position = 'relative';
  petArt.parentNode.appendChild(bubble);

  setTimeout(() => bubble.remove(), 4000);
}

let bubbleTimer = null;
function startBubbleTimer() {
  if (bubbleTimer) clearTimeout(bubbleTimer);

  const attempt = () => {
    if (!currentPet || currentPet.isDead) return;

    // 현재 메인 말풍선이 방금 전에 떴으면 스킵 (겹침 방지)
    const visibleSpeech = getVisibleSpeech(currentPet, currentUser.name);
    const recentlySpoke = visibleSpeech && (Date.now() - (visibleSpeech.at || 0)) < 15000;
    if (recentlySpoke) return;

    const text = pickBubbleSpeech(currentPet);
    if (text) showChatBubble(text);
  };

  // 15-40초마다 랜덤하게
  const scheduleNext = () => {
    const delay = 15000 + Math.random() * 25000;
    bubbleTimer = setTimeout(() => {
      attempt();
      scheduleNext();
    }, delay);
  };
  scheduleNext();
}

// ────────────────────────────────────────────────────────────
// ASCII 캐릭터 클릭 시 대사 표시
// ────────────────────────────────────────────────────────────
let lastTapAt = 0;
// TEEN 연속 탭 카운트 (30초 내 연속 탭하면 화냄)
let tapStreakCount = 0;
let tapStreakWindowStart = 0;

/**
 * 8bit 스타일 사운드 재생 (Web Audio API로 즉석 생성)
 * @param {string} kind - 'happy' | 'cute' | 'angry' | 'blip'
 */
let sfxAudioCtx = null;
function playSfx(kind = 'happy') {
  try {
    if (!sfxAudioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      sfxAudioCtx = new AC();
    }
    if (sfxAudioCtx.state === 'suspended') sfxAudioCtx.resume();

    const ctx = sfxAudioCtx;
    const now = ctx.currentTime;

    // 사운드 프리셋: [주파수 배열, 각 음 길이(s), gain 피크]
    const presets = {
      happy:  { notes: [523.25, 659.25, 783.99], dur: 0.07, peak: 0.08 },  // C-E-G 아르페지오
      cute:   { notes: [880, 1046.5], dur: 0.06, peak: 0.07 },             // A-C 짧은 2음
      angry:  { notes: [220, 180], dur: 0.10, peak: 0.10 },                // 낮은 버징
      blip:   { notes: [1318.5], dur: 0.05, peak: 0.05 },                  // 단음 클릭
      fanfare:{ notes: [523.25, 659.25, 783.99, 1046.5, 1046.5, 1318.5], dur: 0.12, peak: 0.10 },  // C-E-G-C'-C'-E' 팡파레
      defeat: { notes: [392, 349.23, 311.13, 261.63], dur: 0.18, peak: 0.07 },   // G-F-Eb-C 하강 (패배)
    };
    const preset = presets[kind] || presets.happy;

    preset.notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';  // 8bit 스타일
      osc.frequency.value = freq;

      const start = now + i * preset.dur;
      const end = start + preset.dur;
      // envelope: attack 짧게, 빠른 감쇠
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(preset.peak, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    });
  } catch (err) {
    // 오디오 실패는 무시 (게임 동작에 영향 없음)
  }
}

/**
 * 액션별 8bit 사운드
 */
function playActionSfx(action) {
  try {
    if (!sfxAudioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      sfxAudioCtx = new AC();
    }
    if (sfxAudioCtx.state === 'suspended') sfxAudioCtx.resume();
    const ctx = sfxAudioCtx;
    const now = ctx.currentTime;

    // 액션별 음계
    const presets = {
      feed:  { notes: [659.25, 783.99, 1046.5], dur: 0.08, peak: 0.09, wave: 'square' },   // E-G-C (식사 차임)
      play:  { notes: [1046.5, 1318.5, 1046.5, 1567.98], dur: 0.06, peak: 0.08, wave: 'square' }, // C-E-C-G (장난감)
      sleep: { notes: [523.25, 392, 261.63], dur: 0.18, peak: 0.06, wave: 'triangle' },     // C-G-C 하강 (자장가)
      clean: { notes: [1318.5, 1567.98, 1318.5, 1567.98], dur: 0.05, peak: 0.07, wave: 'square' }, // 트위치 (물뿌림)
      train: { notes: [440, 554.37, 659.25, 880], dur: 0.07, peak: 0.09, wave: 'square' }, // A-C#-E-A (운동)
      talk:  { notes: [659.25, 880], dur: 0.07, peak: 0.07, wave: 'square' },              // E-A (인사)
    };
    const preset = presets[action] || presets.feed;

    preset.notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = preset.wave;
      osc.frequency.value = freq;

      const start = now + i * preset.dur;
      const end = start + preset.dur;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(preset.peak, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    });
  } catch (err) { /* ignore */ }
}

/**
 * 액션별 ASCII 흔들기 애니메이션
 * CSS 클래스 추가 → 자동 제거
 */
function playActionAnimation(action) {
  const petArt = document.getElementById('pet-art');
  if (!petArt) return;
  // 기존 액션 클래스 모두 제거
  petArt.classList.remove('act-feed', 'act-play', 'act-sleep', 'act-clean', 'act-train');
  // 팔 벌리기 중이면 건너뜀 (그 애니메이션 방해 방지)
  if (petArt.classList.contains('pet-hug')) return;

  const className = `act-${action}`;
  petArt.classList.add(className);
  // 애니메이션 끝나면 자동 제거 (0.8s)
  setTimeout(() => {
    if (petArt) petArt.classList.remove(className);
  }, 800);
}

function handlePetTap() {
  if (!currentPet || currentPet.isDead) return;

  // 연타 방지 (팔 벌리기 애니메이션 4초 동안은 중복 실행 안 함)
  const now = Date.now();
  if (now - lastTapAt < 4000) return;
  lastTapAt = now;

  // TEEN/ADULT에서 연속 탭 체크 (30초 윈도우)
  const STREAK_WINDOW = 30 * 1000;
  const ANGRY_THRESHOLD = 3;  // 30초 내 3번 탭하면 화냄
  const isAngryStage = (currentPet.stage === 'TEEN');  // TEEN만 (ADULT는 무던)

  if (now - tapStreakWindowStart > STREAK_WINDOW) {
    // 윈도우 리셋
    tapStreakWindowStart = now;
    tapStreakCount = 1;
  } else {
    tapStreakCount++;
  }

  const isAngry = isAngryStage && tapStreakCount >= ANGRY_THRESHOLD;

  // 팔 벌리기 애니메이션 (4초) - 화내는 경우는 생략
  const petArt = document.getElementById('pet-art');
  if (petArt && currentPet.stage !== 'EGG' && !isAngry) {
    petArt.textContent = renderTeddyHug(currentPet);
    petArt.classList.add('pet-hug');
    setTimeout(() => {
      if (petArt) {
        petArt.textContent = renderTeddy(currentPet);
        petArt.classList.remove('pet-hug');
      }
    }, 4000);
  }

  const { fav, least } = getCrewFavorites(currentPet);

  // 화난 경우 화난 대사 + 성격 변화
  let speech;
  if (isAngry) {
    speech = pickTeenAngrySpeech({ user: currentUser.name, name: currentPet.name });
    // 화내는 성격 영향
    currentPet.personality = currentPet.personality || {};
    currentPet.personality.activeVsCalm = Math.min(100,
      (currentPet.personality.activeVsCalm || 0) + 2);  // 공격적
    currentPet.personality.socialVsIntro = Math.max(-100,
      (currentPet.personality.socialVsIntro || 0) - 3);  // 내향
    currentPet.personality.diligentVsFree = Math.max(-100,
      (currentPet.personality.diligentVsFree || 0) - 3);  // 자유 (반항)
    currentPet.happy = Math.max(0, currentPet.happy - 3);
    currentPet.bond = Math.max(0, (currentPet.bond || 0) - 1);
    // 화난 이모티콘 + 낮은 버징 소리
    showEmote('angry');
    playSfx('angry');
  } else {
    speech = pickTapSpeech(currentPet, {
      user: currentUser.name, name: currentPet.name, fav, least,
    });
    // 가벼운 반응 이모티콘
    const tapEmotes = ['heart2', 'sparkle', 'note', 'bubble'];
    const picked = tapEmotes[Math.floor(Math.random() * tapEmotes.length)];
    showEmote(picked);
    // 단계별 사운드: EGG 조용, BABY 귀여운 음, CHILD+ 밝은 아르페지오
    if (currentPet.stage === 'EGG') {
      playSfx('blip');
    } else if (currentPet.stage === 'BABY') {
      playSfx('cute');
    } else {
      playSfx('happy');
    }
    // 아주 가벼운 부가 스탯 (값 폭주 방지)
    currentPet.bond = Math.min(100, (currentPet.bond || 0) + 0.05);
    currentPet.intel = Math.min(100, (currentPet.intel || 0) + 0.03);
  }

  if (speech) {
    saveSpeechForUser(currentPet, currentUser.name, {
      text: speech, at: now, to: currentUser.key,
    });
    Backend.savePet(currentPet);
  }
}

function attachPetTapListener() {
  const petArt = document.getElementById('pet-art');
  if (!petArt) return;
  // 중복 방지: 이미 리스너가 있으면 추가 안 함
  if (petArt.dataset.tapListener === 'on') return;
  petArt.style.cursor = 'pointer';
  petArt.addEventListener('click', handlePetTap);
  petArt.addEventListener('touchend', e => {
    e.preventDefault();  // 클릭 이벤트 중복 방지
    handlePetTap();
  });
  petArt.dataset.tapListener = 'on';
}

// ────────────────────────────────────────────────────────────
// 추가 기능
// ────────────────────────────────────────────────────────────
async function handleGreeting(greetKey, rawInput) {
  if (!currentPet || currentPet.isDead) {
    appendSystemLog('💭 답을 들을 수 없는 상태입니다.', 'warn');
    return;
  }

  // EGG 상태: 관찰형 반응
  if (currentPet.stage === 'EGG') {
    const eggReactions = {
      hello:     ['(알이 살짝 기울어졌다. 인사 같다.)', '(꿈틀, 반응한다.)', '(따뜻해진다.)'],
      bye:       ['(알이 조용해진다. 아쉬워하는 것 같다.)', '(미세한 진동.)'],
      goodnight: ['(알 속에서 숨소리가 느려진다.)', '(잠이 든 것 같다.)'],
      thanks:    ['(알이 따스하게 빛난다.)', '(두근, 반응한다.)'],
      sorry:     ['(알이 가만히 있다.)', '(괜찮다는 듯 미동.)'],
      love:      ['(알이 밝게 빛난다.)', '(포근해진다.)'],
      howareyou: ['(알이 천천히 기울어진다.)', '(두근두근)'],
    };
    const pool = eggReactions[greetKey] || ['(알이 미세하게 움직인다.)'];
    const reaction = pool[Math.floor(Math.random() * pool.length)];

    saveSpeechForUser(currentPet, currentUser.name, {
      text: reaction, at: Date.now(), to: currentUser.key
    });
    currentPet.bond = Math.min(100, (currentPet.bond || 0) + 0.05);
    showEmote({
      hello: 'note', bye: 'heart2', goodnight: 'sleep',
      thanks: 'heart', love: 'heart', sorry: 'bubble', howareyou: 'sparkle',
    }[greetKey] || 'bubble');

    await Backend.savePet(currentPet);
    await Backend.addLog({
      user: currentUser.name, action: 'CHAT',
      text: `💭 "${rawInput}" → 알이 반응했다`,
      type: 'action',
      viewer: currentUser.name,
    });
    return;
  }

  const { fav, least } = getCrewFavorites(currentPet);
  const vars = {
    user: currentUser.name,
    prevUser: prevUser || '누군가',
    name: currentPet.name,
    fav, least,
  };

  const response = getGreetingResponse(greetKey, currentPet, vars);
  if (!response) return;

  saveSpeechForUser(currentPet, currentUser.name, { text: response, at: Date.now(), to: currentUser.key });
  prevUser = currentUser.name;

  // 인사는 가벼운 효과
  currentPet.happy = Math.min(100, currentPet.happy + 1);
  currentPet.bond = Math.min(100, (currentPet.bond || 0) + 0.1);

  // 이모티콘 (인사 종류에 따라)
  const emoteMap = {
    hello: 'note',
    bye: 'heart2',
    goodnight: 'sleep',
    thanks: 'heart',
    sorry: 'bubble',
    love: 'heart',
    howareyou: 'sparkle',
  };
  showEmote(emoteMap[greetKey] || 'bubble');

  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'CHAT',
    text: `💭 "${rawInput}"`,
    type: 'action',
    ...(currentUser.isAdmin ? { viewer: currentUser.name } : {}),
  });
}

function showLore() {
  const lines = [
    '── 크림슨 오퍼튜니티 마르스 II세 ──',
    '',
    '붉은 땅에서 온 아이.',
    '아버지 1세는 그 땅의 틈에 자기 삶을 밀어넣다',
    '그 틈에 삼켜졌다. 마지막 빛은 숫자로 바뀌어',
    '이 아이에게 전해졌다.',
    '',
    '\'오퍼튜니티\'라는 이름은,',
    '오래전 붉은 행성을 밟았던 작은 탐사선을 기린다.',
    '닳아 멈출 때까지 그곳을 걸었던 이름.',
    '크림슨 가계는 대대로 그 이름을 물려왔다.',
    '',
    '지금 이 아이는 칼라릴리호에 실려 있다.',
    '\'사슬\'이라 불리는 가느다란 끈을 통해',
    '붉은 땅과 아직 연결되어 있다 — 얼마 동안은.',
  ];
  // 각 줄의 타임스탬프를 150ms 간격으로 강제 부여하여 순서 보장
  lines.forEach((l, i) => {
    setTimeout(() => {
      Backend.addLog({ user: 'SYS', action: 'LORE', text: l, type: 'system' });
    }, i * 150);
  });
}

// ────────────────────────────────────────────────────────────
// TALK 시스템 — 하루 1세션, 주제가 연결되어 흘러감
//
// pet.dailyTalk = {
//   dayKey: 'YYYY-MM-DD',    // 오늘 키 (KST 자정 기준)
//   usedTopics: [...],        // 오늘 이미 쓴 주제들
//   lastTopic: 'weather',     // 다음 연결용
//   turnsLeft: N,             // 남은 턴
// }
// 새 날이 되면 자동 초기화.
// 하루 총 4-6회 대화 가능 (유대에 따라).
// ────────────────────────────────────────────────────────────

function initDailyTalk(pet) {
  const { dayKey } = getProgress(pet);
  const dt = pet.dailyTalk;

  // 오늘 키가 다르면 리셋
  if (!dt || dt.dayKey !== dayKey) {
    pet.dailyTalk = {
      dayKey,
      usedTopics: [],
      lastTopic: null,
      turnsLeft: 9999,  // 실질 무제한
    };
  } else if (dt.turnsLeft < 100) {
    // 이전 세션 데이터가 제한 있는 상태로 남아있으면 무제한으로 확장
    dt.turnsLeft = 9999;
  }
  return pet.dailyTalk;
}

function showTalkMenu() {
  if (!currentPet || currentPet.isDead) return;

  // EGG 단계: 대화 불가 → 메시지 남기기 UI로 대체
  if (currentPet.stage === 'EGG') {
    showEggMessageUI();
    return;
  }

  // 이미 열려있으면 닫기 (토글)
  const existing = document.getElementById('talk-modal');
  if (existing) { existing.remove(); return; }

  // 오늘의 대화 세션 초기화/확인 (제한 없이)
  initDailyTalk(currentPet);

  renderTalkMenu();
}

// ────────────────────────────────────────────────────────────
// EGG 메시지 남기기 UI — 알에게 말을 걸면 부화 후 기억
// ────────────────────────────────────────────────────────────
function showEggMessageUI() {
  // 이미 열려있으면 닫기
  const existing = document.getElementById('egg-msg-modal');
  if (existing) { existing.remove(); return; }

  // 본인이 이미 남긴 메시지
  const existingMsgs = (currentPet.eggMessages || []).filter(m => m.user === currentUser.name);

  const modal = document.createElement('div');
  modal.id = 'egg-msg-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = `
    <div class="talk-modal-head">
      <span>▶ 알에게 메시지를 남긴다</span>
      <span class="talk-close" id="egg-msg-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:12px;">
      <div style="color:#8fb39a;font-size:11px;margin-bottom:8px;line-height:1.5;">
        알은 아직 눈도 뜨지 않았지만, 네 목소리는 들을 수 있을지도 모른다.<br>
        부화한 뒤, 이 말을 기억해낼지도 모른다.
      </div>
      <textarea id="egg-msg-input" rows="3" maxlength="80"
        style="width:100%;background:#000;border:1px solid #2d5a3e;color:#03B352;
        font-family:inherit;font-size:12px;padding:8px;resize:none;"
        placeholder="너에게 하고 싶은 말... (최대 80자)"></textarea>
      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <span style="color:#6b8f76;font-size:10px;" id="egg-msg-counter">0 / 80</span>
        <button id="egg-msg-submit" style="background:#0a1410;border:1px solid #03B352;color:#03B352;
          padding:4px 14px;cursor:pointer;font-family:inherit;font-size:11px;">
          말 걸어두기
        </button>
      </div>
      ${existingMsgs.length > 0 ? `
        <div style="margin-top:14px;border-top:1px solid #2d5a3e;padding-top:10px;">
          <div style="color:#8fb39a;font-size:10px;margin-bottom:6px;">
            ◢ 네가 이미 남긴 메시지 (${existingMsgs.length}개)
          </div>
          ${existingMsgs.map(m => `
            <div style="font-size:11px;color:#c9c9c9;padding:4px 0;line-height:1.4;">
              · ${m.text.replace(/</g, '&lt;')}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  const input = document.getElementById('egg-msg-input');
  const counter = document.getElementById('egg-msg-counter');
  input.focus();
  input.addEventListener('input', () => {
    counter.textContent = `${input.value.length} / 80`;
  });

  document.getElementById('egg-msg-close').addEventListener('click', () => modal.remove());
  document.getElementById('egg-msg-submit').addEventListener('click', handleEggMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEggMessage();
  });
}

async function handleEggMessage() {
  const input = document.getElementById('egg-msg-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  if (text.length > 80) {
    appendSystemLog('⚠ 메시지가 너무 깁니다 (최대 80자)', 'warn');
    return;
  }

  currentPet.eggMessages = currentPet.eggMessages || [];
  currentPet.eggMessages.push({
    user: currentUser.name,
    text,
    at: Date.now(),
  });

  // 유저 1명당 3개까지만
  const userMsgs = currentPet.eggMessages.filter(m => m.user === currentUser.name);
  if (userMsgs.length > 3) {
    // 본인 것 중 가장 오래된 것 제거
    const otherMsgs = currentPet.eggMessages.filter(m => m.user !== currentUser.name);
    const myRecentMsgs = userMsgs.slice(-3);
    currentPet.eggMessages = [...otherMsgs, ...myRecentMsgs];
  }

  // 소소한 효과
  showEmote('heart');

  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'WHISPER',
    text: `💌 알에게 속삭였다: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
    type: 'action',
    viewer: currentUser.name,  // 본인에게만 보이는 로그
  });

  const modal = document.getElementById('egg-msg-modal');
  if (modal) modal.remove();

  showToast('💌 말을 전했다. 알이 움찔했다.', 'personality');
}

function renderTalkMenu() {
  if (!currentPet) return;
  const dt = currentPet.dailyTalk;
  if (!dt) return;

  // 이전 모달 제거
  const prev = document.getElementById('talk-modal');
  if (prev) prev.remove();

  // 주제 후보 결정
  let topicCandidates;
  let headText;

  if (!dt.lastTopic) {
    // 첫 주제 — 전체 중에서 선택
    const allTopics = getTalkTopics();
    topicCandidates = allTopics.filter(t => !dt.usedTopics.includes(t.key));
    headText = '어떤 얘기부터 할까?';
  } else {
    // 이어지는 주제 — lastTopic의 연결 주제들
    const nextKeys = getNextTopicChoices(dt.lastTopic, dt.usedTopics);
    if (nextKeys.length === 0) {
      closeTalkSession();
      return;
    }
    const allTopics = getTalkTopics();
    topicCandidates = allTopics.filter(t => nextKeys.includes(t.key));
    headText = '이야기를 이어갈까?';
  }

  if (topicCandidates.length === 0) {
    closeTalkSession();
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'talk-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = `
    <div class="talk-modal-head">
      <span>▶ ${headText}</span>
      <span class="talk-close" id="talk-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body">
      ${topicCandidates.map(t => `
        <button class="talk-option" data-topic="${t.key}">${t.label}</button>
      `).join('')}
      ${dt.lastTopic ? `<button class="talk-option" data-topic="__end__" style="border-color:#c97d5f;color:#c97d5f;">✕ 이야기 마치기</button>` : ''}
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('talk-close').addEventListener('click', closeTalkSession);

  modal.querySelectorAll('.talk-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = btn.dataset.topic;
      if (topic === '__end__') {
        closeTalkSession();
      } else {
        handleTalk(topic);
      }
    });
  });
}

async function closeTalkSession() {
  const modal = document.getElementById('talk-modal');
  if (modal) modal.remove();

  // 종료 멘트 (사용한 주제가 있을 때만)
  if (currentPet && !currentPet.isDead && currentPet.dailyTalk?.usedTopics?.length > 0) {
    const { fav, least } = getCrewFavorites(currentPet);
    const farewell = getTalkFarewell(currentPet, {
      user: currentUser.name, name: currentPet.name, fav, least,
    });
    if (farewell) {
      saveSpeechForUser(currentPet, currentUser.name, { text: farewell, at: Date.now(), to: currentUser.key });

      // 세션이 충분히 길었으면 bond 보너스
      if (currentPet.dailyTalk.usedTopics.length >= 3) {
        currentPet.bond = Math.min(100, (currentPet.bond || 0) + 1);
      }
      await Backend.savePet(currentPet);
    }
  }
}

async function handleTalk(topicKey) {
  if (!currentPet || currentPet.isDead) return;
  const dt = currentPet.dailyTalk;
  if (!dt) return;

  const { fav, least } = getCrewFavorites(currentPet);
  const vars = {
    user: currentUser.name,
    prevUser: prevUser || '누군가',
    name: currentPet.name,
    fav, least,
  };

  // 주제 전환 이음말 (이전 주제 있을 때)
  let bridge = null;
  if (dt.lastTopic && dt.lastTopic !== topicKey) {
    bridge = getTopicBridge(dt.lastTopic, topicKey, vars);
  }

  // 주제 응답
  const response = getTalkResponse(topicKey, currentPet, vars);
  if (!response) {
    appendSystemLog('⚠ 주제를 불러오지 못했습니다.', 'warn');
    return;
  }

  // 이음말 + 본 응답을 한 줄로 합치거나 개별 대사로 표시
  const finalText = bridge ? `${bridge} ${response}` : response;

  saveSpeechForUser(currentPet, currentUser.name, { text: finalText, at: Date.now(), to: currentUser.key });
  prevUser = currentUser.name;

  // 인상적인 대사로 기록 (30%)
  if (Math.random() < 0.3) {
    recordMemorableQuote(currentPet, response, { user: currentUser.name });
  }

  // 효과
  currentPet.happy = Math.min(100, currentPet.happy + 3);
  currentPet.bond = Math.min(100, (currentPet.bond || 0) + 0.7);
  currentPet.intel = Math.min(100, (currentPet.intel || 0) + 1);

  // 이모티콘
  emoteForAction('talk');

  // 크루 기억
  currentPet.crewMemory = currentPet.crewMemory || {};
  const mem = currentPet.crewMemory[currentUser.name] || {
    feed: 0, play: 0, sleep: 0, clean: 0, train: 0, talk: 0,
    total: 0, lastAction: null, lastAt: 0,
  };
  mem.talk = (mem.talk || 0) + 1;
  mem.total = (mem.total || 0) + 0.5;
  mem.lastAction = 'talk';
  mem.lastAt = Date.now();
  currentPet.crewMemory[currentUser.name] = mem;

  // 세션 진행
  dt.usedTopics.push(topicKey);
  dt.lastTopic = topicKey;

  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'TALK',
    text: `💬 ${SPEECHES.talkTopics[topicKey]?.label || topicKey}`,
    type: 'action',
    ...(currentUser.isAdmin ? { viewer: currentUser.name } : {}),
  });

  // 모달 비활성화 → 잠시 후 다음 메뉴
  const modal = document.getElementById('talk-modal');
  if (modal) {
    modal.querySelectorAll('.talk-option').forEach(b => {
      b.disabled = true;
      b.style.opacity = '0.4';
    });
  }

  setTimeout(() => {
    renderTalkMenu();
  }, 1800);
}

function showHelp() {
  const cmds = [
    '─── BASIC COMMANDS ───',
    'feed / play / sleep / clean / train — 기본 행동',
    'talk — 대화 주제 선택',
    'lore — 세계관 정보',
    'logout — 로그아웃',
    'help — 이 도움말',
  ];
  if (currentUser.isAdmin) {
    cmds.push(
      '',
      '─── ADMIN COMMANDS ───',
      'reset — 전체 초기화',
      'revive — 강제 부활 (카운트 소모 없음)',
      'kill — 강제 사망 (테스트용)',
      'set <stat> <val> — 스탯 설정 (예: set hunger 80)',
      '  → stats: hunger/happy/energy/hygiene/strength/intel/bond/level/exp',
      'persona <axis> <val> — 성격 설정 (-100~+100)',
      '  → axes: active/greed/social/diligent',
      'age <hours> — 나이 조정 (예: age 50 = 50시간 진행)',
      'evolve <stage> — 진화 강제 (egg/baby/child/teen/adult)',
      'say <text> — 캐릭터 강제 대사',
      'narrate <text> — 시스템 아카이브 메시지 추가',
      'status — 전체 상태 덤프',
      'backup — JSON 백업 다운로드',
      'restore — 백업 파일 복원',
      'clear-logs — 로그 전체 삭제',
    );
  }
  cmds.forEach((l, i) => {
    setTimeout(() => Backend.addLog({ user: 'SYS', action: 'HELP', text: l, type: 'system' }), i * 60);
  });
}

async function doRevive() {
  if (!currentPet) return;
  const r = revive(currentPet, false);
  if (!r.ok) {
    appendSystemLog(`⚠ 부활 불가: ${r.reason === 'max' ? '부활 횟수 소진' : r.reason}`, 'warn');
    return;
  }
  const text = pickSpeech(SPEECHES.revived, { user: currentUser.name, name: currentPet.name });
  saveSpeechForUser(currentPet, currentUser.name, { text, at: Date.now(), to: currentUser.key });
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'REVIVE',
    text: `💫 부활 성공. 남은 기회: ${r.remaining}`,
    type: 'epic',
  });
}

async function doLogout() {
  // presence에서 즉시 제거 (다른 크루에게 바로 반영)
  if (currentUser && !currentUser.isAdmin) {
    try {
      await Backend.removePresence(currentUser.name);
    } catch (err) {
      console.error('presence 제거 실패:', err);
    }
  }
  sessionStorage.removeItem('nk_user');
  location.reload();
}

// ────────────────────────────────────────────────────────────
// 관리자 명령
// ────────────────────────────────────────────────────────────
async function adminReset() {
  if (!currentUser.isAdmin) return;
  if (!confirm('전체 상태와 로그를 초기화합니다. 되돌릴 수 없습니다. 계속할까요?')) return;

  // 로그 전체 삭제 + pet 초기화. 리셋 수행 기록도 남기지 않음.
  await Backend.reset();

  // 클라이언트 상태도 정리
  logs = [];
  prevUser = null;

  // 강제 새로고침으로 모든 화면 초기화
  setTimeout(() => location.reload(), 500);
}

async function adminRevive() {
  if (!currentUser.isAdmin) return;
  if (!currentPet.isDead) {
    appendSystemLog('⚠ 사망 상태가 아닙니다.', 'warn');
    return;
  }
  revive(currentPet, true); // 강제
  saveBroadcastSpeech(currentPet, {
    text: pickSpeech(SPEECHES.revived, { user: currentUser.name, name: currentPet.name }),
    at: Date.now(), to: '__admin__',
  });
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'REVIVE',
    text: '⚙ 관리자 강제 부활 (카운트 소모 없음)',
    type: 'admin',
  viewer: currentUser.name,
  });
}

async function adminKill() {
  if (!currentUser.isAdmin) return;
  currentPet.isDead = true;
  currentPet.hunger = 0; currentPet.happy = 0; currentPet.energy = 0;
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'KILL',
    text: '⚙ 관리자 강제 사망 (테스트)',
    type: 'admin',
  viewer: currentUser.name,
  });
}

async function adminEdit() {
  if (!currentUser.isAdmin) return;
  const stat = prompt('수정할 스탯 (hunger/happy/energy/hygiene/strength/intel/bond):');
  if (!stat) return;
  const val = prompt(`${stat}의 새로운 값 (0-100):`);
  if (val === null) return;
  await adminSet(stat, val);
}

async function adminSet(stat, valStr) {
  if (!currentUser.isAdmin) return;
  const validStats = ['hunger','happy','energy','hygiene','strength','intel','bond','level','exp'];
  if (!validStats.includes(stat)) {
    appendSystemLog(`⚠ 알 수 없는 스탯: ${stat}`, 'warn');
    return;
  }
  const val = Number(valStr);
  if (isNaN(val)) {
    appendSystemLog(`⚠ 숫자가 아닙니다: ${valStr}`, 'warn');
    return;
  }
  currentPet[stat] = Math.max(0, Math.min(100, val));
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'SET',
    text: `⚙ ${stat} = ${val}`,
    type: 'admin',
  viewer: currentUser.name,
  });
}

async function adminEvolve(stageName) {
  if (!currentUser.isAdmin) return;
  const s = (stageName || '').toUpperCase();
  const valid = ['EGG','BABY','CHILD','TEEN','ADULT'];
  if (!valid.includes(s)) {
    appendSystemLog(`⚠ 유효한 단계: ${valid.join(', ')}`, 'warn');
    return;
  }
  const from = currentPet.stage;
  currentPet.stage = s;
  // bornAt도 조정해서 자연스럽게
  const target = CONFIG.STAGES.find(x => x.name === s);
  if (target) currentPet.bornAt = Date.now() - (target.fromHour * 3600000);
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'EVOLVE',
    text: `⚙ ${from} → ${s} (강제)`,
    type: 'admin',
  viewer: currentUser.name,
  });
}

async function adminBackup() {
  if (!currentUser.isAdmin) return;
  const data = await Backend.backup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nk_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  await Backend.addLog({
    user: currentUser.name, action: 'BACKUP',
    text: '⚙ 백업 파일 다운로드',
    type: 'admin',
  viewer: currentUser.name,
  });
}

// ────────────────────────────────────────────────────────────
// 스냅샷 (롤백용) 수동 저장
// ────────────────────────────────────────────────────────────
async function adminSnapshotSave() {
  if (!currentUser.isAdmin) return;
  const label = prompt('스냅샷 라벨 (예: "진화 직전", "이벤트 D+3"):', '');
  if (label === null) return;
  const finalLabel = label.trim() || `수동 ${new Date().toLocaleString('ko-KR', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}`;

  try {
    await Backend.saveSnapshot(currentPet, finalLabel, 'manual');
    showToast(`💾 스냅샷 저장: ${finalLabel}`, 'personality');
    await Backend.addLog({
      user: currentUser.name, action: 'SNAPSHOT',
      text: `💾 스냅샷 생성: "${finalLabel}"`,
      type: 'admin',
    viewer: currentUser.name,
    });
  } catch (err) {
    console.error(err);
    appendSystemLog(`⚠ 스냅샷 저장 실패: ${err.message}`, 'warn');
  }
}

// ────────────────────────────────────────────────────────────
// 스냅샷 목록 + 복원 UI
// ────────────────────────────────────────────────────────────
async function adminSnapshotList() {
  if (!currentUser.isAdmin) return;

  const existing = document.getElementById('snapshot-modal');
  if (existing) { existing.remove(); return; }

  let snapshots;
  try {
    snapshots = await Backend.listSnapshots();
  } catch (err) {
    appendSystemLog(`⚠ 스냅샷 불러오기 실패: ${err.message}`, 'warn');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'snapshot-modal';
  modal.className = 'talk-modal';
  modal.style.maxHeight = '70vh';
  modal.style.overflowY = 'auto';

  modal.innerHTML = `
    <div class="talk-modal-head">
      <span>▶ 스냅샷 목록 (${snapshots.length}개)</span>
      <span class="talk-close" id="snap-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:0;">
      ${snapshots.length === 0 ? `
        <div style="padding:20px;color:#6b8f76;text-align:center;">
          저장된 스냅샷이 없습니다.<br>
          [💾 SNAPSHOT] 버튼으로 현재 상태를 저장할 수 있습니다.
        </div>
      ` : `
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          <thead>
            <tr style="background:#0d1f14;color:#8fb39a;">
              <th style="padding:6px;text-align:left;">시각</th>
              <th style="padding:6px;text-align:left;">타입</th>
              <th style="padding:6px;text-align:left;">단계</th>
              <th style="padding:6px;text-align:left;">라벨</th>
              <th style="padding:6px;text-align:left;">액션</th>
            </tr>
          </thead>
          <tbody>
            ${snapshots.map(s => {
              const t = s.atMs ? new Date(s.atMs).toLocaleString('ko-KR', {
                month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'
              }) : '--';
              const stage = s.pet?.stage || '-';
              const typeColor = s.type === 'auto' ? '#6b8f76' : '#e8a853';
              const labelEsc = (s.label || '').replace(/"/g, '&quot;');
              return `
                <tr style="border-bottom:1px solid #2d5a3e;">
                  <td style="padding:6px;color:#8fb39a;">${t}</td>
                  <td style="padding:6px;color:${typeColor};">${s.type}</td>
                  <td style="padding:6px;color:#03B352;">${stage}</td>
                  <td style="padding:6px;color:#c9c9c9;">${(s.label || '').substring(0, 28)}</td>
                  <td style="padding:6px;white-space:nowrap;">
                    <button class="snap-restore" data-id="${s._id}" data-label="${labelEsc}"
                      style="background:#0a1410;border:1px solid #03B352;color:#03B352;padding:3px 8px;cursor:pointer;font-family:inherit;font-size:10px;margin-right:4px;">
                      복원
                    </button>
                    <button class="snap-delete" data-id="${s._id}"
                      style="background:#0a1410;border:1px solid #c97d5f;color:#c97d5f;padding:3px 8px;cursor:pointer;font-family:inherit;font-size:10px;">
                      삭제
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('snap-close').addEventListener('click', () => modal.remove());

  // 복원
  modal.querySelectorAll('.snap-restore').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const label = btn.dataset.label;

      // 3단계 선택지
      const choice = confirm(
        `"${label}" 시점으로 복원합니다.\n\n` +
        `확인: 복원 이후의 모든 로그도 함께 삭제\n` +
        `취소: 이 복원 자체를 취소\n\n` +
        `복원하시겠습니까?`
      );
      if (!choice) return;

      const deleteLogs = confirm(
        `복원 이후의 로그도 함께 삭제하시겠습니까?\n\n` +
        `확인: 복원 시점 이후 로그 모두 삭제 (깔끔)\n` +
        `취소: 로그는 그대로 유지 (흔적 남음)`
      );

      try {
        const result = await Backend.restoreSnapshot(id, { deleteLaterLogs: deleteLogs });
        if (!result.ok) {
          appendSystemLog(`⚠ 복원 실패: ${result.reason}`, 'warn');
          return;
        }
        modal.remove();

        await Backend.addLog({
          user: currentUser.name, action: 'RESTORE',
          text: `♻ 스냅샷 복원: "${label}"${deleteLogs ? ' + 이후 로그 삭제' : ''}`,
          type: 'admin',
        viewer: currentUser.name,
        });

        showToast(`♻ 복원 완료`, 'personality');
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        console.error(err);
        appendSystemLog(`⚠ 복원 실패: ${err.message}`, 'warn');
      }
    });
  });

  // 삭제
  modal.querySelectorAll('.snap-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 스냅샷을 삭제합니다. 계속할까요?')) return;
      const id = btn.dataset.id;
      try {
        await Backend.deleteSnapshot(id);
        modal.remove();
        adminSnapshotList();  // 목록 새로고침
      } catch (err) {
        appendSystemLog(`⚠ 삭제 실패: ${err.message}`, 'warn');
      }
    });
  });
}

// ────────────────────────────────────────────────────────────
// 자동 스냅샷 (1시간마다)
// ────────────────────────────────────────────────────────────
function startAutoSnapshot() {
  const AUTO_INTERVAL = 60 * 60 * 1000; // 1시간
  const LAST_KEY = 'nk_last_auto_snapshot';

  const attempt = async () => {
    if (!currentPet) return;
    const last = Number(localStorage.getItem(LAST_KEY) || 0);
    if (Date.now() - last < AUTO_INTERVAL) return;

    try {
      const label = `자동 ${new Date().toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}`;
      await Backend.saveSnapshot(currentPet, label, 'auto');
      localStorage.setItem(LAST_KEY, String(Date.now()));
      console.log('[자동 스냅샷] 저장:', label);
    } catch (err) {
      console.error('자동 스냅샷 실패:', err);
    }
  };

  // 첫 시도는 30초 후
  setTimeout(attempt, 30 * 1000);
  // 이후 10분마다 체크
  setInterval(attempt, 10 * 60 * 1000);
}

function adminRestore() {
  if (!currentUser.isAdmin) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      await Backend.restore(data);
      await Backend.addLog({
        user: currentUser.name, action: 'RESTORE',
        text: `⚙ 백업 복원 완료 (${data.at || '-'})`,
        type: 'admin',
      viewer: currentUser.name,
      });
    } catch (err) {
      appendSystemLog(`⚠ 복원 실패: ${err.message}`, 'warn');
    }
  };
  input.click();
}

// ── 새 관리자 명령 ──────────────────────────────────

async function adminAge(hoursStr) {
  if (!currentUser.isAdmin) return;
  const hours = Number(hoursStr);
  if (isNaN(hours)) {
    appendSystemLog('⚠ 사용법: age <시간> (예: age 50 → 50시간 진행, age -10 → 10시간 되돌림)', 'warn');
    return;
  }
  // bornAt을 hours만큼 과거로 이동 = 그만큼 나이 먹는 효과
  currentPet.bornAt -= hours * 3600 * 1000;
  currentPet.lastTickAt = Date.now(); // 스탯 즉시 감소 막기 위해 리셋
  // 해설 중복 방지키 초기화 (새 시점에 맞게 다시 노출)
  delete currentPet.narrativeShownKey;
  // 진화 단계도 새 시간에 맞춰 자동 업데이트
  const hoursLived = (Date.now() - currentPet.bornAt) / 3600000;
  for (const s of CONFIG.STAGES) {
    if (hoursLived >= s.fromHour && hoursLived < s.toHour) {
      const from = currentPet.stage;
      if (from !== s.name) {
        currentPet.stage = s.name;
        await Backend.addLog({
          user: currentUser.name, action: 'EVOLVE',
          text: `✦ ${from} → ${s.name} (시간 조정)`,
          type: 'epic',
        });
      }
      break;
    }
  }
  await Backend.savePet(currentPet);
  showToast(`⏱ 나이 ${hours > 0 ? '+' : ''}${hours}h → ${currentPet.stage}`, 'personality');
  await Backend.addLog({
    user: currentUser.name, action: 'AGE',
    text: `⚙ 나이 ${hours > 0 ? '+' : ''}${hours}h 조정`,
    type: 'admin',
  viewer: currentUser.name,
  });
}

// 커스텀 시간 입력
async function adminAgeCustom() {
  if (!currentUser.isAdmin) return;
  const input = prompt(
    '몇 시간 진행할까요?\n' +
    '(양수: 성장 진행 / 음수: 되돌림 / 예: 72 또는 -24)\n\n' +
    '현재 단계 참고:\n' +
    'EGG 0~36h, BABY 36~84h, CHILD 84~156h, TEEN 156~264h, ADULT 264~336h',
    '24'
  );
  if (input === null) return;
  const hours = Number(input);
  if (isNaN(hours)) {
    appendSystemLog('⚠ 숫자로 입력해주세요', 'warn');
    return;
  }
  await adminAge(hours);
}

// 스탯 개별 편집 (모달)
async function adminEditStat() {
  if (!currentUser.isAdmin) return;
  const existing = document.getElementById('edit-stat-modal');
  if (existing) { existing.remove(); return; }

  const stats = [
    { key: 'hunger', label: '배고픔' },
    { key: 'happy', label: '행복' },
    { key: 'energy', label: '에너지' },
    { key: 'hygiene', label: '청결' },
    { key: 'strength', label: '체력' },
    { key: 'intel', label: '지능' },
    { key: 'bond', label: '유대' },
    { key: 'level', label: '레벨' },
    { key: 'exp', label: '경험치' },
  ];

  const modal = document.createElement('div');
  modal.id = 'edit-stat-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = `
    <div class="talk-modal-head">
      <span>⚙ 스탯 편집</span>
      <span class="talk-close" id="edit-stat-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:12px;">
      <div style="color:#8fb39a;font-size:11px;margin-bottom:10px;">
        각 스탯 값을 직접 입력해서 저장할 수 있습니다 (0-100).
      </div>
      <table style="width:100%;font-size:12px;">
        ${stats.map(s => `
          <tr>
            <td style="padding:4px 6px;color:#8fb39a;width:80px;">${s.label}</td>
            <td style="padding:4px 6px;color:#6b8f76;width:50px;">(${s.key})</td>
            <td style="padding:4px 6px;color:#03B352;width:40px;text-align:right;">
              ${Math.floor(currentPet[s.key] || 0)}
            </td>
            <td style="padding:4px 6px;">
              <input type="number" min="0" max="100" data-stat="${s.key}"
                value="${Math.floor(currentPet[s.key] || 0)}"
                style="width:60px;background:#000;border:1px solid #2d5a3e;color:#03B352;
                font-family:inherit;font-size:11px;padding:3px 5px;" />
            </td>
          </tr>
        `).join('')}
      </table>
      <div style="margin-top:12px;text-align:right;">
        <button id="edit-stat-submit"
          style="background:#0a1410;border:1px solid #03B352;color:#03B352;
          padding:6px 18px;cursor:pointer;font-family:inherit;font-size:12px;">
          저장
        </button>
      </div>
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('edit-stat-close').addEventListener('click', () => modal.remove());
  document.getElementById('edit-stat-submit').addEventListener('click', async () => {
    const inputs = modal.querySelectorAll('input[data-stat]');
    let changed = 0;
    for (const inp of inputs) {
      const key = inp.dataset.stat;
      const val = Number(inp.value);
      if (isNaN(val)) continue;
      const clamped = Math.max(0, Math.min(100, val));
      if (currentPet[key] !== clamped) {
        currentPet[key] = clamped;
        changed++;
      }
    }
    if (changed > 0) {
      await Backend.savePet(currentPet);
      await Backend.addLog({
        user: currentUser.name, action: 'EDIT',
        text: `⚙ 스탯 편집 (${changed}개 변경)`,
        type: 'admin',
      viewer: currentUser.name,
      });
      showToast(`⚙ ${changed}개 스탯 수정됨`, 'personality');
    }
    modal.remove();
  });
}

// 성격 편집 (슬라이더)
async function adminEditPersona() {
  if (!currentUser.isAdmin) return;
  const existing = document.getElementById('edit-persona-modal');
  if (existing) { existing.remove(); return; }

  const axes = [
    { key: 'activeVsCalm',      left: '차분', right: '활발' },
    { key: 'greedVsTemperance', left: '절제', right: '탐욕' },
    { key: 'socialVsIntro',     left: '내향', right: '사교' },
    { key: 'diligentVsFree',    left: '자유', right: '성실' },
  ];

  const p = currentPet.personality || {};

  const modal = document.createElement('div');
  modal.id = 'edit-persona-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = `
    <div class="talk-modal-head">
      <span>⚙ 성격 편집</span>
      <span class="talk-close" id="edit-persona-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:12px;">
      <div style="color:#8fb39a;font-size:11px;margin-bottom:10px;">
        -100 (왼쪽) ~ +100 (오른쪽). 0은 중립.
      </div>
      ${axes.map(a => {
        const val = p[a.key] || 0;
        return `
          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#8fb39a;margin-bottom:4px;">
              <span>◁ ${a.left}</span>
              <span style="color:#03B352;" id="persona-val-${a.key}">${val}</span>
              <span>${a.right} ▷</span>
            </div>
            <input type="range" min="-100" max="100" value="${val}" data-axis="${a.key}"
              style="width:100%;" />
          </div>
        `;
      }).join('')}
      <div style="margin-top:12px;text-align:right;">
        <button id="edit-persona-submit"
          style="background:#0a1410;border:1px solid #03B352;color:#03B352;
          padding:6px 18px;cursor:pointer;font-family:inherit;font-size:12px;">
          저장
        </button>
      </div>
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  // 슬라이더 값 실시간 표시
  modal.querySelectorAll('input[data-axis]').forEach(inp => {
    inp.addEventListener('input', () => {
      const v = document.getElementById(`persona-val-${inp.dataset.axis}`);
      if (v) v.textContent = inp.value;
    });
  });

  document.getElementById('edit-persona-close').addEventListener('click', () => modal.remove());
  document.getElementById('edit-persona-submit').addEventListener('click', async () => {
    currentPet.personality = currentPet.personality || {};
    let changed = 0;
    modal.querySelectorAll('input[data-axis]').forEach(inp => {
      const val = Number(inp.value);
      if (currentPet.personality[inp.dataset.axis] !== val) {
        currentPet.personality[inp.dataset.axis] = val;
        changed++;
      }
    });
    if (changed > 0) {
      await Backend.savePet(currentPet);
      await Backend.addLog({
        user: currentUser.name, action: 'EDIT',
        text: `⚙ 성격 편집 (${changed}축 변경)`,
        type: 'admin',
      viewer: currentUser.name,
      });
      showToast(`⚙ 성격 ${changed}축 수정됨`, 'personality');
    }
    modal.remove();
  });
}

async function adminPersona(axis, valStr) {
  if (!currentUser.isAdmin) return;
  const validAxes = ['activeVsCalm','greedVsTemperance','socialVsIntro','diligentVsFree',
                     'active','greed','social','diligent'];  // 단축명 허용
  const axisMap = {
    active: 'activeVsCalm',
    greed: 'greedVsTemperance',
    social: 'socialVsIntro',
    diligent: 'diligentVsFree',
  };
  const key = axisMap[axis] || axis;
  if (!validAxes.includes(axis)) {
    appendSystemLog(`⚠ 사용법: persona <axis> <value>`, 'warn');
    appendSystemLog(`   axis: active/greed/social/diligent (또는 풀네임)`, 'warn');
    appendSystemLog(`   value: -100 ~ +100`, 'warn');
    return;
  }
  const val = Number(valStr);
  if (isNaN(val)) {
    appendSystemLog(`⚠ 숫자가 아닙니다: ${valStr}`, 'warn');
    return;
  }
  currentPet.personality = currentPet.personality || {};
  currentPet.personality[key] = Math.max(-100, Math.min(100, val));
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'PERSONA',
    text: `⚙ ${key} = ${val}`,
    type: 'admin',
  viewer: currentUser.name,
  });
}

async function adminSay(text) {
  if (!currentUser.isAdmin) return;
  if (!text) {
    appendSystemLog('⚠ 사용법: say <대사 내용>', 'warn');
    return;
  }
  saveBroadcastSpeech(currentPet, { text, at: Date.now(), to: '__admin__' });
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'SAY',
    text: `⚙ 캐릭터 강제 대사: "${text}"`,
    type: 'admin',
  viewer: currentUser.name,
  });
}

async function adminNarrate(text) {
  if (!currentUser.isAdmin) return;
  if (!text) {
    appendSystemLog('⚠ 사용법: narrate <해설 내용>', 'warn');
    return;
  }
  await Backend.addLog({
    user: null, action: 'ARCHIVE',
    text: '◎ ' + text,
    type: 'system',
  });
}

function adminStatus() {
  if (!currentUser.isAdmin || !currentPet) return;
  const p = currentPet;
  const hoursLived = Math.max(0, (Date.now() - p.bornAt) / 3600000);
  const lines = [
    `── STATUS DUMP ──`,
    `name: ${p.name} (${p.stage} · LV ${p.level || 1})`,
    `age: ${hoursLived.toFixed(1)}h / ${CONFIG.DURATION_DAYS * 24}h`,
    `vitals: H${Math.round(p.hunger)} P${Math.round(p.happy)} E${Math.round(p.energy)} C${Math.round(p.hygiene)}`,
    `growth: STR${Math.round(p.strength)} INT${Math.round(p.intel)} BND${Math.round(p.bond)}`,
    `persona: active=${p.personality.activeVsCalm} greed=${p.personality.greedVsTemperance} social=${p.personality.socialVsIntro} diligent=${p.personality.diligentVsFree}`,
    `counters: ${Object.entries(p.counters).map(([k,v]) => `${k}${v}`).join(' ')}`,
    `death: ${p.deathCount}/${CONFIG.MAX_REVIVES} (isDead=${p.isDead})`,
  ];
  lines.forEach((l, i) => {
    setTimeout(() => Backend.addLog({ user: 'SYS', action: 'STATUS', text: l, type: 'admin' }), i * 80);
  });
}

async function adminClearLogs() {
  if (!currentUser.isAdmin) return;
  if (!confirm('로그만 전체 삭제합니다 (캐릭터 상태는 유지). 계속할까요?')) return;

  try {
    await Backend.clearLogs();
    logs = [];
    showToast('⚙ 로그 전체 삭제 완료', 'personality');
    // 로그 삭제 기록 자체는 남기지 않음 (깔끔하게)
    setTimeout(() => location.reload(), 500);
  } catch (err) {
    console.error(err);
    appendSystemLog(`⚠ 로그 삭제 실패: ${err.message}`, 'warn');
  }
}

// ─────────────────────────────────────────────────
// 오래된 로그만 정리 (최근 100개만 남김)
// ─────────────────────────────────────────────────
async function adminTrimLogs() {
  if (!currentUser.isAdmin) return;
  const keep = prompt('최근 몇 개만 남길까요? (기본 100)', '100');
  if (!keep) return;
  const keepCount = Math.max(10, parseInt(keep, 10) || 100);

  try {
    showToast(`🧹 로그 정리 중...`, 'personality');
    await Backend._trimOldLogs(keepCount);
    showToast(`✓ 최근 ${keepCount}개만 남김`, 'personality');
  } catch (err) {
    console.error(err);
    appendSystemLog(`⚠ 로그 정리 실패: ${err.message}`, 'warn');
  }
}

// ────────────────────────────────────────────────────────────
// 긴급: 전체 크루 강제 새로고침 (버전 bump)
// pet.appVersion을 임의로 변경해서 모든 접속자를 자동 새로고침
// ────────────────────────────────────────────────────────────
async function adminForceRefresh() {
  if (!currentUser.isAdmin) return;
  if (!confirm(
    '⚡ 접속 중인 모든 크루의 화면을 자동 새로고침합니다.\n\n' +
    '코드 업데이트 후 기존 탭의 버그 타이머를 끊을 때 유용합니다.\n' +
    '(각자 화면에 "업데이트 감지" 안내 후 3초 뒤 reload)\n\n' +
    '계속할까요?'
  )) return;

  try {
    // forceRefreshAt에 현재 시각을 찍어서 저장
    // 각 클라이언트는 자기 세션 시작 이후의 값만 반응
    const now = Date.now();
    const patched = { ...currentPet, forceRefreshAt: now };
    await Backend.savePet(patched);

    showToast('⚡ 전체 크루에게 새로고침 신호 전송됨', 'personality');
    await Backend.addLog({
      user: currentUser.name, action: 'BROADCAST',
      text: `⚡ 전체 크루 강제 새로고침 신호 전송`,
      type: 'admin',
      viewer: currentUser.name,
    });
    // 관리자 본인은 3초 후 새로고침
    setTimeout(() => location.reload(true), 3000);
  } catch (err) {
    console.error(err);
    appendSystemLog(`⚠ 강제 새로고침 실패: ${err.message}`, 'warn');
  }
}

// ────────────────────────────────────────────────────────────
// 긴급: 킬스위치 — 모든 접속자의 타이머 중단
// (쓰기 폭주 차단. 새로고침 없이도 5초/3분 타이머가 꺼짐)
// ────────────────────────────────────────────────────────────
async function adminKillSwitch() {
  if (!currentUser.isAdmin) return;
  const on = currentPet.stopTimers === true;
  const msg = on
    ? '🔓 킬스위치를 해제합니다. 타이머가 다시 작동합니다.'
    : '🔒 킬스위치를 활성화합니다.\n\n' +
      '모든 접속자의 자동 타이머(5초 틱, heartbeat 등)가 즉시 중단됩니다.\n' +
      '행동 버튼은 정상 작동합니다. 쓰기 폭주 차단용 긴급 스위치입니다.\n\n계속할까요?';

  if (!confirm(msg)) return;

  try {
    currentPet.stopTimers = !on;
    await Backend.savePet(currentPet);
    showToast(on ? '🔓 킬스위치 OFF' : '🔒 킬스위치 ON', 'personality');
    await Backend.addLog({
      user: currentUser.name, action: 'KILLSWITCH',
      text: on ? '🔓 킬스위치 해제' : '🔒 킬스위치 활성화',
      type: 'admin',
      viewer: currentUser.name,
    });
  } catch (err) {
    console.error(err);
    appendSystemLog(`⚠ 킬스위치 실패: ${err.message}`, 'warn');
  }
}

// ── 시뮬레이션 도구 ─────────────────────────────────

/**
 * 특정 단계로 즉시 점프 (bornAt 조정 + 해설키 리셋)
 */
async function adminSimJump(targetStage) {
  if (!currentUser.isAdmin) return;

  if (targetStage === 'kill') {
    currentPet.isDead = true;
    currentPet.hunger = 0; currentPet.happy = 0; currentPet.energy = 0;
    await Backend.savePet(currentPet);
    await Backend.addLog({
      user: currentUser.name, action: 'SIM',
      text: '⚙ [시뮬] 강제 사망 상태',
      type: 'admin',
    viewer: currentUser.name,
    });
    return;
  }

  const stageUpper = targetStage.toUpperCase();
  const stageDef = CONFIG.STAGES.find(s => s.name === stageUpper);
  if (!stageDef) {
    appendSystemLog(`⚠ 알 수 없는 단계: ${targetStage}`, 'warn');
    return;
  }

  // bornAt을 해당 단계 시작 시간 + 약간의 여유 시간으로 설정
  // (여유 시간 1h = 해당 단계의 초반 해설이 바로 보임)
  const targetHour = stageDef.fromHour + 1;
  currentPet.bornAt = Date.now() - targetHour * 3600 * 1000;
  currentPet.lastTickAt = Date.now();
  currentPet.stage = stageUpper;
  currentPet.isDead = false;

  // 스탯을 80으로 리프레시 (연출 보기 좋게)
  currentPet.hunger = 80; currentPet.happy = 80; currentPet.energy = 80; currentPet.hygiene = 80;

  // 해설 키 리셋 (새 단계 해설이 처음부터 노출되게)
  delete currentPet.narrativeShownKey;

  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'SIM',
    text: `⚙ [시뮬] ${stageUpper} 단계로 점프 (+${targetHour}h)`,
    type: 'admin',
  viewer: currentUser.name,
  });
}

/**
 * 프리셋 적용: 특정 스탯/성격 조합
 */
async function adminPreset(preset) {
  if (!currentUser.isAdmin) return;

  const presets = {
    full: {
      hunger: 100, happy: 100, energy: 100, hygiene: 100,
      log: '스탯 전체 MAX',
    },
    low: {
      hunger: 15, happy: 15, energy: 15, hygiene: 15,
      log: '스탯 전체 LOW (위기 테스트)',
    },
    active: {
      personality: { activeVsCalm: 60, socialVsIntro: 60, greedVsTemperance: 20, diligentVsFree: 0 },
      log: '활발/사교 성격 프리셋',
    },
    intro: {
      personality: { activeVsCalm: -60, socialVsIntro: -60, greedVsTemperance: -20, diligentVsFree: -20 },
      log: '내향/차분 성격 프리셋',
    },
    diligent: {
      personality: { activeVsCalm: 0, socialVsIntro: -20, greedVsTemperance: -40, diligentVsFree: 60 },
      log: '성실/절제 성격 프리셋',
    },
  };

  const p = presets[preset];
  if (!p) {
    appendSystemLog(`⚠ 알 수 없는 프리셋: ${preset}`, 'warn');
    return;
  }

  Object.entries(p).forEach(([k, v]) => {
    if (k === 'log') return;
    if (k === 'personality') {
      currentPet.personality = { ...currentPet.personality, ...v };
    } else {
      currentPet[k] = v;
    }
  });

  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'PRESET',
    text: `⚙ [프리셋] ${p.log}`,
    type: 'admin',
  viewer: currentUser.name,
  });
}

// ════════════════════════════════════════════════════════════
// 미지의 신호 (Unknown Signal) 시스템
// ════════════════════════════════════════════════════════════

/**
 * 신호 자동 발사 + 만료 체크 (1분에 한 번 호출)
 * 안전 장치: 시스템 활성화 시점 이전 신호는 자동 스킵
 */
async function processSignalSystem() {
  if (!currentPet || currentPet.isDead) return;

  const now = Date.now();
  let modified = false;

  // ── 안전 활성화: 시스템이 처음 작동하는 순간 기록 ──
  // 이 필드가 없으면 = 코드 도입 직후 첫 실행
  // 이미 지나간 triggerHour 신호들을 "놓친 게 아니라 시스템 도입 전"으로 처리
  if (!currentPet.signalSystemActivatedAt) {
    currentPet.signalSystemActivatedAt = now;
    const hoursLived = (now - currentPet.bornAt) / 3600000;
    // 이미 지나간 triggerHour의 신호는 "skipped"로 표시 (놓친 게 아니라 시작 전)
    currentPet.signals = currentPet.signals || {};
    for (const sigDef of CONFIG.SIGNALS) {
      if (sigDef.triggerHour < hoursLived && !currentPet.signals[sigDef.id]) {
        currentPet.signals[sigDef.id] = {
          id: sigDef.id,
          spawnedAt: now,
          stage: 0,
          decodedBy: [],
          skipped: true,  // 시스템 활성화 전이라 자동 스킵
          expired: true,  // 회상에 안 쓰임
        };
      }
    }
    modified = true;
    console.log('[signal] 시스템 활성화. 이전 신호들 자동 스킵.');
  }

  // ── 자동 발사는 비활성화 (관리자 수동 발사로 전환) ──
  // 예약된 신호만 시간 체크해서 발사
  if (Array.isArray(currentPet.scheduledSignals)) {
    const now = Date.now();
    const ready = currentPet.scheduledSignals.filter(s => s.fireAt <= now);
    if (ready.length > 0) {
      currentPet.scheduledSignals = currentPet.scheduledSignals.filter(s => s.fireAt > now);
      for (const sched of ready) {
        const def = CONFIG.SIGNALS.find(d => d.id === sched.signalId);
        if (def && !currentPet.signals[def.id]) {
          spawnSignal(currentPet, def);
          modified = true;
          console.log('[signal] 예약 발사:', def.name);
          await Backend.addLog({
            user: null, action: 'SIGNAL',
            text: `📡 새로운 신호 수신: "${def.name}" (24시간 내 해독)`,
            type: 'epic',
          });
          showToast(`📡 새 신호: "${def.name}"`, 'personality');
        }
      }
    }
  }

  // ── 만료 체크 ──
  expireOldSignals(currentPet);

  // 만료된 신호 알림 (한 번만)
  for (const sig of Object.values(currentPet.signals || {})) {
    if (sig.expired && !sig.expireNotified && !sig.skipped && sig.stage === 0) {
      sig.expireNotified = true;
      modified = true;
      const def = CONFIG.SIGNALS.find(d => d.id === sig.id);
      if (def) {
        await Backend.addLog({
          user: null, action: 'SIGNAL',
          text: `📡✕ 신호 "${def.name}"이 영구 소멸했습니다. (24시간 미해독)`,
          type: 'warn',
        });
      }
    }
  }

  if (modified) {
    await Backend.savePet(currentPet);
  }
}

/**
 * 신호 목록 모달 — 활성/만료/완료된 모든 신호 보기
 */
function showSignalList(opts = {}) {
  const existing = document.getElementById('signal-list-modal');
  if (existing) { existing.remove(); return; }

  const PER_PAGE = 4;
  const page = opts.page ?? 0;

  const signals = listActiveSignals(currentPet)
    .filter(s => !s.skipped);  // 시스템 활성화 전 스킵된 건 안 보임

  if (signals.length === 0) {
    showToast('📡 아직 수신된 신호가 없습니다', 'system');
    return;
  }

  const totalPages = Math.max(1, Math.ceil(signals.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = signals.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const modal = document.createElement('div');
  modal.id = 'signal-list-modal';
  modal.className = 'talk-modal signal-modal';
  modal.innerHTML = `
    <div class="talk-modal-head signal-head">
      <span>📡 UNKNOWN SIGNAL · ARCHIVE</span>
      <span class="talk-close" id="signal-list-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:14px;">
      <div style="color:#8fb39a;font-size:11px;margin-bottom:10px;">
        수신된 신호 ${signals.length}개 · 24시간 내 해독하지 않으면 영구 소멸합니다.
      </div>
      <div id="signal-list-items">
        ${slice.map(s => renderSignalListItem(s)).join('')}
      </div>

      ${totalPages > 1 ? `
        <div style="display:flex;justify-content:center;align-items:center;gap:10px;
          margin-top:14px;padding-top:10px;border-top:1px dotted #2d5a3e;font-size:11px;">
          <button class="signal-list-page" data-page="${safePage - 1}"
            ${safePage === 0 ? 'disabled' : ''}
            style="background:transparent;border:1px solid ${safePage === 0 ? '#2d5a3e' : '#5fb37a'};
            color:${safePage === 0 ? '#333' : '#5fb37a'};padding:5px 14px;font-family:inherit;font-size:11px;
            cursor:${safePage === 0 ? 'not-allowed' : 'pointer'};">◀ 이전</button>
          <span style="color:#8fb39a;">${safePage + 1} / ${totalPages}</span>
          <button class="signal-list-page" data-page="${safePage + 1}"
            ${safePage >= totalPages - 1 ? 'disabled' : ''}
            style="background:transparent;border:1px solid ${safePage >= totalPages - 1 ? '#2d5a3e' : '#5fb37a'};
            color:${safePage >= totalPages - 1 ? '#333' : '#5fb37a'};padding:5px 14px;font-family:inherit;font-size:11px;
            cursor:${safePage >= totalPages - 1 ? 'not-allowed' : 'pointer'};">다음 ▶</button>
        </div>
      ` : ''}
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('signal-list-close').addEventListener('click', () => modal.remove());

  // 신호 클릭 → 상세
  modal.querySelectorAll('[data-signal-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.signalId;
      modal.remove();
      showSignalDetail(id);
    });
  });

  // 페이지 이동
  modal.querySelectorAll('.signal-list-page').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const newPage = parseInt(btn.dataset.page);
      modal.remove();
      setTimeout(() => showSignalList({ page: newPage }), 50);
    });
  });
}

function renderSignalListItem(sig) {
  const def = sig.def;
  const tierIcon = def.tier === 1 ? '★' : def.tier === 2 ? '★★' : '★★★';
  const tierColor = def.tier === 1 ? '#03B352' : def.tier === 2 ? '#5fb37a' : '#e8a853';

  let statusText, statusColor, clickable;
  if (sig.expired && sig.stage === 0) {
    statusText = '✕ 영구 소멸';
    statusColor = '#666';
    clickable = false;
  } else if (sig.completedAt) {
    statusText = '✓ 완전 해독';
    statusColor = '#03B352';
    clickable = true;
  } else if (sig.stage > 0) {
    statusText = `▷ 해독 중 (${sig.stage}단계)`;
    statusColor = '#e8a853';
    clickable = true;
  } else {
    const hoursLeft = ((CONFIG.SIGNAL_CONFIG.EXPIRE_HOURS * 3600 * 1000) - (Date.now() - sig.spawnedAt)) / 3600000;
    statusText = `▶ 미개봉 (${Math.max(0, Math.floor(hoursLeft))}h 남음)`;
    statusColor = '#5fb37a';
    clickable = true;
  }

  return `
    <div class="signal-item ${clickable ? 'clickable' : 'disabled'}"
         ${clickable ? `data-signal-id="${sig.id}"` : ''}
         style="border:1px solid ${clickable ? '#2d5a3e' : '#333'};
                padding:10px 12px;margin-bottom:8px;
                background:${clickable ? '#0a1410' : '#050a07'};
                cursor:${clickable ? 'pointer' : 'not-allowed'};
                opacity:${clickable ? 1 : 0.5};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="color:${tierColor};font-size:13px;font-weight:bold;">
          ${tierIcon} ${def.name}
        </span>
        <span style="color:${statusColor};font-size:11px;">${statusText}</span>
      </div>
      <div style="color:#666;font-size:10px;">${def.id}</div>
    </div>
  `;
}

/**
 * 신호 상세 + 해독 UI
 */
function showSignalDetail(signalId) {
  const existing = document.getElementById('signal-detail-modal');
  if (existing) existing.remove();

  const info = getSignalInfo(currentPet, signalId);
  if (!info) return;
  if (info.def.isFinale) {
    showFinaleUI();
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'signal-detail-modal';
  modal.className = 'talk-modal signal-modal';
  modal.innerHTML = renderSignalDetailContent(info);

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  attachSignalDetailHandlers(modal, signalId);

  // 이미 진행 중이거나 해독 완료된 신호는 스크램블 애니메이션
  // (처음 여는 신호는 text가 없거나 간단하므로 스킵)
  const textBox = modal.querySelector('#signal-text-box');
  const finalText = textBox?.dataset.finalText || '';
  if (textBox && finalText && finalText !== '(아직 신호를 열지 않았습니다)' && info.percent > 0) {
    runSignalScrambleEffect(textBox, finalText);
  }
}

/**
 * 신호 본문 스크램블 연출
 * - 0~1.5초: 노이즈 문자만
 * - 1.5~3.5초: 서서히 본문으로 수렴
 * - 3.5초 이후: 완성된 본문
 */
function runSignalScrambleEffect(el, finalText) {
  const NOISE_CHARS = '▓▒░█▬▪▫◆◇○●※◈▦▩⌘⌗⍰⍟⌇⎌⏃';
  const TOTAL_MS = 3500;
  const NOISE_ONLY_MS = 1500;
  const startAt = performance.now();

  function randomNoiseLine(length) {
    let s = '';
    for (let i = 0; i < length; i++) {
      s += NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
    }
    return s;
  }

  function randomNoiseMatching(finalText) {
    // finalText 길이만큼 노이즈, 단 줄바꿈/공백은 보존
    let result = '';
    for (const ch of finalText) {
      if (ch === '\n' || ch === ' ') result += ch;
      else result += NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
    }
    return result;
  }

  let frame = 0;
  function step() {
    frame++;
    const elapsed = performance.now() - startAt;
    if (elapsed >= TOTAL_MS) {
      el.textContent = finalText;
      return;
    }

    if (elapsed < NOISE_ONLY_MS) {
      // 완전 노이즈
      el.textContent = randomNoiseMatching(finalText);
    } else {
      // 점진적으로 본문으로 수렴
      const progress = (elapsed - NOISE_ONLY_MS) / (TOTAL_MS - NOISE_ONLY_MS);
      let result = '';
      for (const ch of finalText) {
        if (ch === '\n' || ch === ' ') {
          result += ch;
        } else if (Math.random() < progress) {
          result += ch;  // 본문 문자
        } else {
          result += NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
        }
      }
      el.textContent = result;
    }
    requestAnimationFrame(step);
  }
  step();
}

function renderSignalDetailContent(info) {
  const { def, state, currentStage, maxStage, workingStage, percent, text, canDecode, nextCost, isComplete,
          requiredDecoders, currentWorkingParticipants, participantsNeeded, stageParticipants } = info;
  const tierIcon = def.tier === 1 ? '★' : def.tier === 2 ? '★★' : '★★★';
  const isLowEnergy = currentPet.energy < CONFIG.SIGNAL_CONFIG.LOW_ENERGY_THRESHOLD;
  const isCriticalEnergy = currentPet.energy < CONFIG.SIGNAL_CONFIG.CRITICAL_ENERGY_THRESHOLD;
  const blockedByCritical = def.tier === 3 && isCriticalEnergy;

  // 내가 이미 이 단계에 참여했는지
  const myName = currentUser?.name;
  const alreadyParticipated = myName && currentWorkingParticipants.includes(myName);

  let warningHtml = '';
  if (canDecode) {
    if (blockedByCritical) {
      warningHtml = `<div style="color:#ff6b6b;font-size:11px;margin:8px 0;padding:6px;border:1px solid #ff6b6b;">
        ⚠ 에너지 부족 (10 미만): 결정적 신호 해독 시도 시 신호가 영구 소멸합니다.
      </div>`;
    } else if (isLowEnergy) {
      warningHtml = `<div style="color:#e8a853;font-size:11px;margin:8px 0;padding:6px;border:1px solid #e8a853;">
        ⚠ 에너지 부족 (25 미만): 해독 시 happy -20, hygiene -10 페널티가 발생합니다.
      </div>`;
    }
    if (alreadyParticipated) {
      warningHtml += `<div style="color:#8fb39a;font-size:11px;margin:8px 0;padding:6px;border:1px dotted #5fb37a;">
        ◎ 이 단계에 이미 참여했습니다. 다른 크루가 ${participantsNeeded}명 더 참여하면 다음 단계로 넘어갑니다.
      </div>`;
    }
  }

  // 참여자 현황 박스 (진행 중 단계)
  let progressHtml = '';
  if (canDecode && !isComplete) {
    const filled = currentWorkingParticipants.length;
    const boxes = Array.from({length: requiredDecoders}, (_, i) => {
      if (i < filled) {
        return `<span style="display:inline-block;width:18px;height:18px;background:#03B352;color:#000;text-align:center;line-height:18px;font-size:10px;margin-right:3px;border-radius:2px;">✓</span>`;
      }
      return `<span style="display:inline-block;width:18px;height:18px;border:1px solid #2d5a3e;margin-right:3px;border-radius:2px;"></span>`;
    }).join('');
    const participantNames = currentWorkingParticipants.length > 0
      ? currentWorkingParticipants.join(', ')
      : '(없음)';
    progressHtml = `
      <div style="margin:10px 0;padding:8px 10px;border:1px dotted #5fb37a;background:#0a1410;">
        <div style="font-size:11px;color:#5fb37a;margin-bottom:4px;">
          ◢ ${workingStage}단계 참여 현황 (${filled}/${requiredDecoders})
        </div>
        <div style="margin-bottom:4px;">${boxes}</div>
        <div style="font-size:10px;color:#8fb39a;">참여: ${participantNames}</div>
      </div>
    `;
  }

  // 버튼 텍스트 / 비활성 조건
  const buttonDisabled = blockedByCritical || alreadyParticipated;
  const buttonColor = buttonDisabled ? '#ff6b6b' : '#03B352';
  const buttonBg = buttonDisabled ? '#2a1a1a' : '#0a3818';

  return `
    <div class="talk-modal-head signal-head">
      <span>📡 ${def.name} · ${tierIcon}</span>
      <span class="talk-close" id="signal-detail-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:14px;">
      <div style="color:#666;font-size:10px;margin-bottom:8px;">
        ${def.id} · 발신자 불명 · 좌표 MARS / QUADRANT-7 · ${'★'.repeat(def.tier)} ${requiredDecoders}명 참여 필요/단계
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:11px;">
        <span style="color:#8fb39a;">해독률</span>
        <div style="flex:1;height:8px;background:#0a1410;border:1px solid #2d5a3e;position:relative;">
          <div style="width:${percent}%;height:100%;background:${isComplete ? '#e8a853' : '#03B352'};transition:width 0.5s;"></div>
        </div>
        <span style="color:${isComplete ? '#e8a853' : '#03B352'};min-width:36px;">${percent}%</span>
      </div>

      <div id="signal-text-box" class="signal-text-box"
        data-final-text="${(text || '').replace(/"/g, '&quot;')}"
        style="background:#050a07;border:1px dotted #2d5a3e;padding:14px;font-size:13px;line-height:1.7;letter-spacing:0.5px;min-height:80px;white-space:pre-wrap;${isComplete ? 'color:#e8a853;' : 'color:#03B352;'}">${text || '(아직 신호를 열지 않았습니다)'}</div>

      ${progressHtml}
      ${warningHtml}

      ${isComplete ? `
        <div style="margin-top:14px;padding:10px;border:1px solid #e8a853;background:#0a0a05;">
          <div style="color:#e8a853;font-size:11px;font-weight:bold;margin-bottom:4px;">◆ 아카이브 등록</div>
          <div style="color:#c9a06b;font-size:11px;">${def.reward}</div>
        </div>
      ` : ''}

      <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
        ${canDecode ? `
          <button id="signal-decode-btn"
            style="flex:1;background:${buttonBg};color:${buttonColor};
                   border:1px solid ${buttonColor};
                   padding:10px;cursor:${buttonDisabled ? 'not-allowed' : 'pointer'};
                   font-family:inherit;font-size:12px;"
            ${buttonDisabled ? 'disabled' : ''}>
            ${alreadyParticipated
              ? '✓ 이미 참여함'
              : (currentStage === 0
                ? `[F] 신호 열기 (energy -${nextCost})`
                : `[F] ${workingStage}단계 참여 (energy -${nextCost})`)}
          </button>
        ` : ''}
        <button id="signal-defer-btn"
          style="flex:1;background:transparent;color:#8fb39a;border:1px solid #2d5a3e;padding:10px;cursor:pointer;font-family:inherit;font-size:12px;">
          [K] 지금은 두기
        </button>
      </div>

      <div style="margin-top:8px;font-size:10px;color:#666;text-align:center;">
        해독 단계 ${currentStage} / ${maxStage}
        ${state.decodedBy.length > 0 ? `· 총 참여: ${state.decodedBy.length}명` : ''}
      </div>
    </div>
  `;
}

function attachSignalDetailHandlers(modal, signalId) {
  document.getElementById('signal-detail-close').addEventListener('click', () => modal.remove());
  document.getElementById('signal-defer-btn')?.addEventListener('click', () => modal.remove());

  const decodeBtn = document.getElementById('signal-decode-btn');
  if (decodeBtn) {
    decodeBtn.addEventListener('click', async () => {
      decodeBtn.disabled = true;
      decodeBtn.textContent = '해독 중...';
      const result = decodeSignal(currentPet, signalId, currentUser.name);

      if (!result.ok) {
        const reasons = {
          dead: '⚠ 사망 상태에서는 해독할 수 없습니다',
          unknown: '⚠ 알 수 없는 신호',
          not_spawned: '⚠ 아직 수신되지 않은 신호',
          expired: '⚠ 이미 소멸한 신호',
          already_complete: '⚠ 이미 완전 해독됨',
          already_participated: '◎ 이미 이 단계에 참여했습니다',
          critical_energy: '⚠ 에너지 10 미만 · 결정적 신호 해독 불가',
          fatigued: '⚠ 과부하 상태 · 12시간 후 다시 시도',
        };
        showToast(reasons[result.reason] || `⚠ 실패: ${result.reason}`, 'warn');
        decodeBtn.disabled = false;
        return;
      }

      // 페널티 알림
      if (result.penalty) {
        showToast(`⚠ 에너지 부족 페널티: happy -20, hygiene -10`, 'warn');
      }

      // 단계 완료 알림
      const sigName = getSignalInfo(currentPet, signalId).def.name;
      if (result.completed) {
        showToast(`◆ 해독 완료: ${sigName}`, 'personality');
        await Backend.addLog({
          user: currentUser.name, action: 'DECODE',
          text: `📡 신호 "${sigName}" 완전 해독`,
          type: 'epic',
        });
      } else if (result.stageCompleted) {
        showToast(`✓ ${result.stage}단계 해독! 다음 단계 오픈`, 'personality');
        await Backend.addLog({
          user: currentUser.name, action: 'DECODE',
          text: `📡 신호 "${sigName}" ${result.stage}단계 완료`,
          type: 'epic',
        });
      } else {
        showToast(`◎ 참여 기록 (${result.participantsNeeded}명 더 필요)`, 'personality');
      }

      await Backend.savePet(currentPet);

      // 모달 갱신
      modal.remove();
      setTimeout(() => showSignalDetail(signalId), 100);
    });
  }
}

/**
 * FINALE: 마지막 답장 발신 UI
 */
function showFinaleUI() {
  const existing = document.getElementById('finale-modal');
  if (existing) { existing.remove(); return; }

  const myReply = currentPet.finaleReplies?.[currentUser.name] || '';
  const allReplies = currentPet.finaleReplies || {};
  const respondedCount = Object.keys(allReplies).length;

  const modal = document.createElement('div');
  modal.id = 'finale-modal';
  modal.className = 'talk-modal signal-modal';
  modal.innerHTML = `
    <div class="talk-modal-head signal-head" style="background:#3a2a05;">
      <span>📡 OUTBOUND TRANSMISSION · FINALE</span>
      <span class="talk-close" id="finale-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:16px;">
      <div style="color:#e8a853;font-size:13px;line-height:1.7;margin-bottom:12px;">
        아레스가 눈을 뜬다.<br>
        그는 오랫동안 받아온 신호들을 모두 기억한다.<br>
        이제 그는 말할 수 있다.
      </div>

      <div style="font-size:11px;color:#8fb39a;border-top:1px dotted #2d5a3e;padding-top:10px;margin-bottom:10px;">
        To: MARS / AB-1 Ares Base One<br>
        From: 칼라릴리호 · 크루 24 + 아레스
      </div>

      <div style="color:#c9c9c9;font-size:12px;margin-bottom:8px;">
        당신이 ${currentPet.name}에게 남기고 싶은 말 (최대 30자):
      </div>

      <textarea id="finale-input" rows="2" maxlength="30"
        style="width:100%;background:#000;border:1px solid #e8a853;color:#e8a853;
        font-family:inherit;font-size:13px;padding:8px;resize:none;"
        placeholder="짧은 한 마디...">${myReply}</textarea>

      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <span style="color:#666;font-size:10px;" id="finale-counter">${myReply.length} / 30</span>
        <button id="finale-submit"
          style="background:#3a2a05;border:1px solid #e8a853;color:#e8a853;
                 padding:6px 14px;cursor:pointer;font-family:inherit;font-size:12px;">
          ${myReply ? '수정 저장' : '답장 남기기'}
        </button>
      </div>

      <div style="margin-top:14px;border-top:1px solid #2d5a3e;padding-top:10px;">
        <div style="color:#8fb39a;font-size:11px;margin-bottom:6px;">
          ◢ 응답 현황: ${respondedCount} / 24명
        </div>
        ${respondedCount > 0 ? `
          <div style="font-size:11px;color:#c9c9c9;line-height:1.5;max-height:120px;overflow-y:auto;">
            ${Object.entries(allReplies).map(([name, text]) => `
              <div style="padding:3px 0;">· <span style="color:#e8a853;">${name}</span>: ${text.replace(/</g, '&lt;')}</div>
            `).join('')}
          </div>
        ` : '<div style="color:#666;font-size:11px;">아직 응답이 없습니다.</div>'}
      </div>

      <div style="margin-top:12px;font-size:10px;color:#666;text-align:center;">
        응답하지 않은 크루는 자동 생성된 문장으로 편지에 포함됩니다.
      </div>
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  const input = document.getElementById('finale-input');
  const counter = document.getElementById('finale-counter');
  input.addEventListener('input', () => {
    counter.textContent = `${input.value.length} / 30`;
  });

  document.getElementById('finale-close').addEventListener('click', () => modal.remove());
  document.getElementById('finale-submit').addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) {
      showToast('⚠ 한 줄을 적어주세요', 'warn');
      return;
    }
    currentPet.finaleReplies = currentPet.finaleReplies || {};
    currentPet.finaleReplies[currentUser.name] = text;
    await Backend.savePet(currentPet);
    showToast('💌 답장이 편지에 추가되었습니다', 'personality');
    modal.remove();
  });
}

/**
 * FINALE 미응답 크루의 자동 문장 생성
 * 인터랙션 통계 기반으로 개별화된 한 줄 만들기
 */
function generateFallbackLine(userName, crewMemory) {
  const stats = crewMemory?.[userName] || {};
  const actions = ['feed', 'play', 'sleep', 'clean', 'train', 'talk'];
  let topAction = null;
  let topCount = 0;
  for (const a of actions) {
    if ((stats[a] || 0) > topCount) {
      topCount = stats[a];
      topAction = a;
    }
  }

  if (!topAction || topCount === 0) {
    const silent = [
      `${userName}도 여기 있었다.`,
      `${userName}은 말없이 지켜봤다.`,
      `${userName}의 자리는 비어있지 않았다.`,
    ];
    return silent[Math.floor(Math.random() * silent.length)];
  }

  const templates = {
    feed:  [`${userName}는 자주 따뜻한 것을 건넸다.`,
            `${userName}는 기억에 남는 한 끼를 주었다.`,
            `${userName}는 손에서 따스함이 흘렀다.`],
    play:  [`${userName}는 자주 함께 시간을 보냈다.`,
            `${userName}는 같이 웃는 법을 알려줬다.`,
            `${userName}와 보낸 시간이 가장 빨랐다.`],
    sleep: [`${userName}는 자주 재워주었다.`,
            `${userName}는 고요하게 지켜봤다.`,
            `${userName}의 옆에서 가장 깊이 잤다.`],
    clean: [`${userName}는 손길이 다정했다.`,
            `${userName}는 자주 정리해주었다.`,
            `${userName} 덕에 깔끔할 수 있었다.`],
    train: [`${userName}는 함께 단단해지는 법을 가르쳤다.`,
            `${userName}는 같이 버티는 법을 알려줬다.`,
            `${userName}는 한계를 함께 밀어줬다.`],
    talk:  [`${userName}는 많은 이야기를 들려주었다.`,
            `${userName}의 목소리를 잘 기억한다.`,
            `${userName}와의 대화가 마음에 남았다.`],
  };

  const pool = templates[topAction] || [`${userName}도 여기 있었다.`];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * FINALE 편지 봉인 — 24명분 편지 완성 후 영구 보관
 * 관리자만 실행 가능
 */
async function adminSealFinale() {
  if (!currentUser?.isAdmin) return;

  if (!confirm(
    '⭐ FINALE 편지를 봉인하고 발신합니다.\n\n' +
    '응답하지 않은 크루는 인터랙션 통계 기반 자동 문장으로 채워집니다.\n' +
    '한 번 봉인하면 더 이상 답장 수정 불가합니다.\n\n계속할까요?'
  )) return;

  const replies = currentPet.finaleReplies || {};
  const memory = currentPet.crewMemory || {};
  const finalLetter = [];

  for (const member of CONFIG.MEMBERS) {
    const text = replies[member.name];
    if (text) {
      finalLetter.push({ name: member.name, text, type: 'response' });
    } else {
      finalLetter.push({
        name: member.name,
        text: generateFallbackLine(member.name, memory),
        type: 'auto',
      });
    }
  }

  // pet 문서에 영구 보관
  currentPet.finaleSealed = {
    sealedAt: Date.now(),
    sealedBy: currentUser.name,
    letter: finalLetter,
  };

  await Backend.savePet(currentPet);

  // 시스템 로그 (모두에게 보임)
  await Backend.addLog({
    user: null, action: 'FINALE',
    text: `⭐ 칼라릴리호의 마지막 답장이 발신되었습니다. 24명의 이름으로.`,
    type: 'epic',
  });

  showToast('⭐ 편지가 봉인 · 발신되었습니다', 'personality');

  // 관리자에게 편지 미리보기
  setTimeout(() => showSealedLetter(), 1500);
}

/**
 * 봉인된 편지 열람 UI (모든 크루 가능)
 */
function showSealedLetter() {
  const sealed = currentPet.finaleSealed;
  if (!sealed) {
    showToast('⚠ 아직 편지가 봉인되지 않았습니다', 'warn');
    return;
  }

  const existing = document.getElementById('letter-modal');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.id = 'letter-modal';
  modal.className = 'talk-modal signal-modal';
  modal.innerHTML = `
    <div class="talk-modal-head signal-head" style="background:#3a2a05;">
      <span>⭐ FINAL TRANSMISSION · 봉인됨</span>
      <span class="talk-close" id="letter-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:18px;">
      <div style="text-align:center;color:#e8a853;font-size:11px;margin-bottom:14px;letter-spacing:2px;">
        ──── OUTBOUND ────<br>
        To: MARS / AB-1 Ares Base One<br>
        From: 칼라릴리호 · 크루 24 + 아레스
      </div>

      <div style="background:#0a0a05;border:1px solid #e8a853;padding:14px;font-size:12px;line-height:1.9;color:#c9c9c9;">
        ${sealed.letter.map(line => `
          <div style="margin-bottom:6px;">
            <span style="color:#e8a853;font-weight:bold;">${line.name}</span>
            <span style="color:#666;">·</span>
            <span style="${line.type === 'auto' ? 'color:#999;font-style:italic;' : ''}">
              ${line.text.replace(/</g, '&lt;')}
            </span>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:14px;text-align:center;color:#8fb39a;font-size:11px;line-height:1.7;">
        그해 봄,<br>
        24명의 크루가 탄 칼라릴리호는<br>
        우주 어딘가에서 답장을 보냈다.<br><br>
        답장이 도착했는지는,<br>
        아무도 모른다.
      </div>

      <div style="margin-top:14px;font-size:10px;color:#666;text-align:center;">
        봉인: ${new Date(sealed.sealedAt).toLocaleString('ko-KR')} · ${sealed.sealedBy}
      </div>
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('letter-close').addEventListener('click', () => modal.remove());
}

/**
 * 예약 발사 공통 함수
 */
async function scheduleSignalFire(sigDef, fireAt, label) {
  currentPet.scheduledSignals = currentPet.scheduledSignals || [];
  currentPet.scheduledSignals.push({
    signalId: sigDef.id,
    fireAt: fireAt,
    scheduledBy: currentUser.name,
  });
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'SCHEDULE',
    text: `⏱ "${sigDef.name}" 신호 예약 (${label})`,
    type: 'admin',
    viewer: currentUser.name,
  });
  showToast(`⏱ 예약 완료 (${label})`, 'personality');
}

/**
 * 관리자 신호 제어 패널
 * - 다음 신호 발사 / 발사 예약 / 모든 신호 진행 상태 / 강제 만료 / 재시작
 */
function showSignalAdminPanel(opts = {}) {
  if (!currentUser?.isAdmin) return;
  const existing = document.getElementById('signal-admin-modal');
  if (existing) { existing.remove(); return; }

  const PER_PAGE = 4;
  const firedPage = opts.firedPage ?? 0;

  // 다음 발사 후보 = triggerHour 순으로 정렬 후 첫 번째 미발사 (FINALE 제외)
  const signals = currentPet.signals || {};
  const sortedSignals = [...CONFIG.SIGNALS]
    .filter(s => !s.isFinale)
    .sort((a, b) => a.triggerHour - b.triggerHour);
  const next = sortedSignals.find(s => !signals[s.id]);

  // 미발사 신호 전체 목록 (순번 선택용)
  const unfired = sortedSignals.filter(s => !signals[s.id]);

  // 예약된 신호 목록
  const scheduled = (currentPet.scheduledSignals || []).slice().sort((a, b) => a.fireAt - b.fireAt);

  // 발사된 신호 목록 (만료/완료 포함)
  const fired = Object.values(signals)
    .filter(s => !s.skipped)
    .map(s => ({ ...s, def: CONFIG.SIGNALS.find(d => d.id === s.id) }))
    .filter(s => s.def)
    .sort((a, b) => b.spawnedAt - a.spawnedAt);

  const firedTotalPages = Math.max(1, Math.ceil(fired.length / PER_PAGE));
  const firedSlice = fired.slice(firedPage * PER_PAGE, (firedPage + 1) * PER_PAGE);

  const modal = document.createElement('div');
  modal.id = 'signal-admin-modal';
  modal.className = 'talk-modal signal-modal';
  modal.innerHTML = `
    <div class="talk-modal-head signal-head">
      <span>📡 SIGNAL CONTROL · ADMIN</span>
      <span class="talk-close" id="sigadmin-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:14px;">

      <!-- 다음 발사 -->
      <div style="border:1px solid #5fb37a;background:#0a1410;padding:12px;margin-bottom:14px;">
        <div style="color:#5fb37a;font-size:11px;font-weight:bold;margin-bottom:6px;letter-spacing:1px;">
          ▶ 다음 발사 후보
        </div>
        ${next ? `
          <div style="font-size:14px;margin-bottom:4px;">
            <span style="color:${next.tier===3?'#e8a853':next.tier===2?'#5fb37a':'#03B352'};">
              ${'★'.repeat(next.tier)}
            </span>
            <strong>${next.name}</strong>
          </div>
          <div style="color:#8fb39a;font-size:11px;margin-bottom:10px;">
            ${next.id} · 권장 ${next.triggerHour}h · ${next.reward}
          </div>
          <div style="margin-bottom:10px;font-size:11px;">
            <span style="color:#8fb39a;">전체 신호 선택:</span>
            <select id="sig-select-manual"
              style="background:#050a07;color:#03B352;border:1px solid #2d5a3e;
              padding:4px;font-family:inherit;font-size:11px;margin-left:6px;min-width:240px;">
              <option value="">(기본: ${next.id})</option>
              ${sortedSignals.map(s => {
                const existing = signals[s.id];
                let status = '';
                let disabled = '';
                if (existing) {
                  disabled = 'disabled';
                  if (existing.completedAt) status = ' ✓ 해독완료';
                  else if (existing.expired) status = ' ✕ 만료';
                  else if (existing.stage > 0) status = ` ▷ 진행중(${existing.stage}단계)`;
                  else status = ' ▶ 발사됨';
                }
                const isSelected = s.id === next.id ? 'selected' : '';
                return `
                  <option value="${s.id}" ${isSelected} ${disabled}
                    style="${disabled ? 'color:#666;' : ''}">
                    ${s.id.slice(-3)} ${'★'.repeat(s.tier)} ${s.name} (${s.triggerHour}h)${status}
                  </option>
                `;
              }).join('')}
            </select>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="sig-fire-now"
              style="flex:1;background:#0a3818;border:1px solid #03B352;color:#03B352;
              padding:8px;cursor:pointer;font-family:inherit;font-size:11px;min-width:120px;">
              🚀 지금 즉시 발사
            </button>
            <button id="sig-schedule-delay"
              style="flex:1;background:transparent;border:1px solid #5fb37a;color:#5fb37a;
              padding:8px;cursor:pointer;font-family:inherit;font-size:11px;min-width:120px;">
              ⏱ N분 후 예약
            </button>
            <button id="sig-schedule-time"
              style="flex:1;background:transparent;border:1px solid #5fb37a;color:#5fb37a;
              padding:8px;cursor:pointer;font-family:inherit;font-size:11px;min-width:120px;">
              🕐 시각 지정 예약
            </button>
          </div>
        ` : `
          <div style="color:#666;font-size:12px;text-align:center;padding:14px 0;">
            발사할 신호가 없습니다 (모두 발사됨)
          </div>
        `}
      </div>

      <!-- 예약 목록 -->
      ${scheduled.length > 0 ? `
        <div style="border:1px dotted #5fb37a;padding:10px;margin-bottom:14px;">
          <div style="color:#5fb37a;font-size:11px;font-weight:bold;margin-bottom:6px;">
            ⏱ 예약된 신호 (${scheduled.length}개)
          </div>
          ${scheduled.map((s, i) => {
            const def = CONFIG.SIGNALS.find(d => d.id === s.signalId);
            const fire = new Date(s.fireAt);
            const eta = Math.max(0, Math.floor((s.fireAt - Date.now()) / 60000));
            const timeStr = `${String(fire.getHours()).padStart(2,'0')}:${String(fire.getMinutes()).padStart(2,'0')}`;
            return `
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:4px 0;">
                <span><strong>${def?.name || s.signalId}</strong> · ${timeStr} (${eta}분 후)</span>
                <button class="sig-cancel-sched" data-idx="${i}"
                  style="background:transparent;border:1px solid #ff6b6b;color:#ff6b6b;
                  padding:2px 8px;font-family:inherit;font-size:10px;cursor:pointer;">취소</button>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- 발사된 신호 진행 상태 -->
      <div style="border:1px solid #2d5a3e;padding:10px;">
        <div style="color:#8fb39a;font-size:11px;font-weight:bold;margin-bottom:8px;letter-spacing:1px;">
          ◢ 발사된 신호 진행 상태 (${fired.length}개)
        </div>
        ${fired.length === 0 ? `
          <div style="color:#666;font-size:11px;text-align:center;padding:14px 0;">
            아직 발사된 신호가 없습니다
          </div>
        ` : firedSlice.map(s => renderSignalAdminRow(s)).join('')}

        ${firedTotalPages > 1 ? `
          <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:10px;font-size:11px;">
            <button class="sig-page-btn" data-page="${firedPage - 1}"
              ${firedPage === 0 ? 'disabled' : ''}
              style="background:transparent;border:1px solid ${firedPage === 0 ? '#2d5a3e' : '#5fb37a'};
              color:${firedPage === 0 ? '#333' : '#5fb37a'};padding:4px 10px;font-family:inherit;
              cursor:${firedPage === 0 ? 'not-allowed' : 'pointer'};">◀ 이전</button>
            <span style="color:#8fb39a;">${firedPage + 1} / ${firedTotalPages}</span>
            <button class="sig-page-btn" data-page="${firedPage + 1}"
              ${firedPage >= firedTotalPages - 1 ? 'disabled' : ''}
              style="background:transparent;border:1px solid ${firedPage >= firedTotalPages - 1 ? '#2d5a3e' : '#5fb37a'};
              color:${firedPage >= firedTotalPages - 1 ? '#333' : '#5fb37a'};padding:4px 10px;font-family:inherit;
              cursor:${firedPage >= firedTotalPages - 1 ? 'not-allowed' : 'pointer'};">다음 ▶</button>
          </div>
        ` : ''}
      </div>

    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  // 이벤트 핸들러
  document.getElementById('sigadmin-close').addEventListener('click', () => modal.remove());

  // 페이지 이동
  modal.querySelectorAll('.sig-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const page = parseInt(btn.dataset.page);
      modal.remove();
      setTimeout(() => showSignalAdminPanel({ firedPage: page }), 50);
    });
  });

  // 드롭다운에서 선택한 신호 우선, 없으면 next 사용
  const getSelectedSignal = () => {
    const selectEl = document.getElementById('sig-select-manual');
    const selectedId = selectEl?.value;
    if (selectedId) {
      return CONFIG.SIGNALS.find(s => s.id === selectedId) || next;
    }
    return next;
  };

  document.getElementById('sig-fire-now')?.addEventListener('click', async () => {
    const target = getSelectedSignal();
    if (!target) return;
    // 안전 가드: 이미 발사된 신호면 차단
    if (currentPet.signals?.[target.id]) {
      showToast(`⚠ "${target.name}"은 이미 진행한 신호입니다`, 'warn');
      return;
    }
    if (!confirm(`📡 "${target.name}" 신호를 지금 즉시 발사합니다.\n\n모든 크루에게 알림이 갑니다. 계속할까요?`)) return;
    spawnSignal(currentPet, target);
    await Backend.savePet(currentPet);
    await Backend.addLog({
      user: null, action: 'SIGNAL',
      text: `📡 새로운 신호 수신: "${target.name}" (24시간 내 해독)`,
      type: 'epic',
    });
    showToast(`📡 발사: "${target.name}"`, 'personality');
    modal.remove();
    setTimeout(showSignalAdminPanel, 200);
  });

  document.getElementById('sig-schedule-delay')?.addEventListener('click', async () => {
    const target = getSelectedSignal();
    if (!target) return;
    if (currentPet.signals?.[target.id]) {
      showToast(`⚠ "${target.name}"은 이미 진행한 신호입니다`, 'warn');
      return;
    }
    const input = prompt(`📡 "${target.name}" 신호를 몇 분 후에 발사할까요?\n\n예: 30 (30분 후), 60 (1시간 후), 360 (6시간 후)`, '60');
    if (!input) return;
    const minutes = Number(input);
    if (isNaN(minutes) || minutes < 1) {
      showToast('⚠ 올바른 숫자를 입력해주세요 (분 단위)', 'warn');
      return;
    }
    scheduleSignalFire(target, Date.now() + minutes * 60 * 1000, `${minutes}분 후`);
    modal.remove();
    setTimeout(showSignalAdminPanel, 200);
  });

  document.getElementById('sig-schedule-time')?.addEventListener('click', async () => {
    const target = getSelectedSignal();
    if (!target) return;
    if (currentPet.signals?.[target.id]) {
      showToast(`⚠ "${target.name}"은 이미 진행한 신호입니다`, 'warn');
      return;
    }
    // 현재 시각 기준으로 기본값 제시 (30분 후 올림)
    const now = new Date();
    const defaultH = String(now.getHours()).padStart(2, '0');
    const defaultM = String(now.getMinutes()).padStart(2, '0');
    const input = prompt(
      `📡 "${target.name}" 신호를 언제 발사할까요?\n\n` +
      `24시간제 HH:MM 형식으로 입력 (예: 22:00, 09:30)\n` +
      `현재 시각을 지났으면 내일로 자동 설정됩니다.`,
      `${defaultH}:${defaultM}`
    );
    if (!input) return;
    const match = input.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      showToast('⚠ HH:MM 형식으로 입력해주세요 (예: 22:00)', 'warn');
      return;
    }
    const targetH = parseInt(match[1]);
    const targetM = parseInt(match[2]);
    if (targetH < 0 || targetH > 23 || targetM < 0 || targetM > 59) {
      showToast('⚠ 올바른 시각이 아닙니다', 'warn');
      return;
    }
    const target_time = new Date();
    target_time.setHours(targetH, targetM, 0, 0);
    // 현재 시각 이전이면 내일로
    if (target_time.getTime() <= Date.now()) {
      target_time.setDate(target_time.getDate() + 1);
    }
    const etaMin = Math.round((target_time.getTime() - Date.now()) / 60000);
    const timeLabel = `${String(target_time.getHours()).padStart(2, '0')}:${String(target_time.getMinutes()).padStart(2, '0')}`;
    if (!confirm(`📡 "${target.name}"을\n${timeLabel} (${etaMin}분 후)에 발사합니다.\n\n계속할까요?`)) return;
    scheduleSignalFire(target, target_time.getTime(), timeLabel);
    modal.remove();
    setTimeout(showSignalAdminPanel, 200);
  });

  // 예약 취소
  modal.querySelectorAll('.sig-cancel-sched').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      if (!confirm('이 예약을 취소합니다. 계속할까요?')) return;
      currentPet.scheduledSignals.splice(idx, 1);
      await Backend.savePet(currentPet);
      modal.remove();
      setTimeout(showSignalAdminPanel, 200);
    });
  });

  // 신호 행별 액션
  modal.querySelectorAll('.sig-row-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sigId = btn.dataset.sigId;
      const action = btn.dataset.action;
      await handleSignalAdminAction(sigId, action);
      modal.remove();
      setTimeout(showSignalAdminPanel, 200);
    });
  });
}

function renderSignalAdminRow(sig) {
  const def = sig.def;
  const tierColor = def.tier === 3 ? '#e8a853' : def.tier === 2 ? '#5fb37a' : '#03B352';

  let statusText, statusColor;
  if (sig.expired && sig.stage === 0) {
    statusText = '✕ 만료'; statusColor = '#ff6b6b';
  } else if (sig.expired) {
    statusText = '⚠ 중단'; statusColor = '#ff6b6b';
  } else if (sig.completedAt) {
    statusText = '✓ 완료'; statusColor = '#03B352';
  } else if (sig.stage > 0) {
    statusText = `▷ ${sig.stage}/${Object.keys(def.stages).length}`;
    statusColor = '#e8a853';
  } else {
    const hoursLeft = ((CONFIG.SIGNAL_CONFIG.EXPIRE_HOURS * 3600 * 1000) - (Date.now() - sig.spawnedAt)) / 3600000;
    statusText = `▶ 미개봉 (${Math.max(0, Math.floor(hoursLeft))}h)`;
    statusColor = '#5fb37a';
  }

  // 상태별 액션 버튼
  let actionBtns = '';
  if (sig.expired) {
    actionBtns = `<button class="sig-row-action" data-sig-id="${sig.id}" data-action="restart"
      style="background:transparent;border:1px solid #5fb37a;color:#5fb37a;padding:2px 8px;
      font-family:inherit;font-size:10px;cursor:pointer;">↻ 부활</button>`;
  } else if (!sig.completedAt) {
    actionBtns = `<button class="sig-row-action" data-sig-id="${sig.id}" data-action="expire"
      style="background:transparent;border:1px solid #ff6b6b;color:#ff6b6b;padding:2px 8px;
      font-family:inherit;font-size:10px;cursor:pointer;">✕ 강제만료</button>`;
  }

  const decoders = sig.decodedBy?.length > 0 ? sig.decodedBy.join(', ') : '-';

  return `
    <div style="border-bottom:1px dotted #1a3d28;padding:8px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;">
          <span style="color:${tierColor};">${'★'.repeat(def.tier)}</span>
          <strong>${def.name}</strong>
          <span style="color:#666;font-size:10px;">(${def.id})</span>
        </span>
        <span style="color:${statusColor};font-size:11px;">${statusText}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#666;">
        <span>참여: ${decoders}</span>
        ${actionBtns}
      </div>
    </div>
  `;
}

async function handleSignalAdminAction(signalId, action) {
  if (!currentUser?.isAdmin) return;
  const sig = currentPet.signals?.[signalId];
  const def = CONFIG.SIGNALS.find(d => d.id === signalId);
  if (!sig || !def) return;

  if (action === 'expire') {
    if (!confirm(`📡✕ "${def.name}" 신호를 강제 만료합니다.\n\n해독되지 않은 상태로 영구 소멸하며 회수할 수 없게 됩니다. 계속할까요?`)) return;
    sig.expired = true;
    sig.expiredAt = Date.now();
    sig.expireNotified = true;  // 자동 알림 안 뜨게
    await Backend.savePet(currentPet);
    await Backend.addLog({
      user: currentUser.name, action: 'EXPIRE',
      text: `⚙ "${def.name}" 신호 강제 만료`,
      type: 'admin',
      viewer: currentUser.name,
    });
    showToast(`✕ "${def.name}" 만료됨`, 'warn');
  }
  else if (action === 'restart') {
    if (!confirm(`↻ "${def.name}" 신호를 다시 발사합니다.\n\n24시간 타이머가 새로 시작되며 해독 진행 상황은 유지됩니다. 계속할까요?`)) return;
    sig.spawnedAt = Date.now();
    sig.expired = false;
    sig.expiredAt = null;
    sig.expireNotified = false;
    await Backend.savePet(currentPet);
    await Backend.addLog({
      user: null, action: 'SIGNAL',
      text: `📡↻ 신호 "${def.name}" 다시 활성화됨 (24시간 내 해독)`,
      type: 'epic',
    });
    showToast(`↻ "${def.name}" 부활`, 'personality');
  }
}

/**
 * 관리자 FINALE 메뉴: 미리보기, 본인 답장, 봉인
 */
function showFinaleAdminMenu() {
  if (!currentUser?.isAdmin) return;
  const existing = document.getElementById('finale-admin-modal');
  if (existing) { existing.remove(); return; }

  const replies = currentPet.finaleReplies || {};
  const respondedCount = Object.keys(replies).length;
  const totalMembers = CONFIG.MEMBERS.length;

  const modal = document.createElement('div');
  modal.id = 'finale-admin-modal';
  modal.className = 'talk-modal signal-modal';
  modal.innerHTML = `
    <div class="talk-modal-head signal-head" style="background:#3a2a05;">
      <span>⭐ FINALE 관리</span>
      <span class="talk-close" id="finale-admin-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:16px;">
      <div style="color:#e8a853;font-size:12px;margin-bottom:12px;line-height:1.6;">
        ⭐ 마지막 답장 발신 이벤트 (Day 14 / 약 330h)<br>
        <span style="color:#8fb39a;font-size:11px;">
          현재 응답: ${respondedCount} / ${totalMembers}명
        </span>
      </div>

      <div style="margin-bottom:14px;">
        ${respondedCount > 0 ? `
          <div style="font-size:11px;color:#c9c9c9;line-height:1.5;max-height:180px;overflow-y:auto;
                      background:#050a07;border:1px dotted #2d5a3e;padding:10px;">
            ${Object.entries(replies).map(([name, text]) => `
              <div style="padding:3px 0;">· <span style="color:#e8a853;">${name}</span>: ${text.replace(/</g, '&lt;')}</div>
            `).join('')}
          </div>
        ` : '<div style="color:#666;font-size:11px;text-align:center;padding:20px;">아직 응답 없음</div>'}
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button id="finale-open-input"
          style="flex:1;background:#0a3818;border:1px solid #03B352;color:#03B352;
          padding:8px;cursor:pointer;font-family:inherit;font-size:11px;min-width:140px;">
          📡 답장 UI 열기 (테스트)
        </button>
        <button id="finale-seal"
          style="flex:1;background:#3a2a05;border:1px solid #e8a853;color:#e8a853;
          padding:8px;cursor:pointer;font-family:inherit;font-size:11px;min-width:140px;">
          ⭐ 편지 봉인 + 발신
        </button>
      </div>

      <div style="margin-top:12px;font-size:10px;color:#666;line-height:1.5;">
        · "답장 UI 열기": 본인이 직접 답장 작성 (다른 크루처럼)<br>
        · "편지 봉인": 미응답 크루는 자동 생성 문장 삽입 후 영구 보관<br>
        · 봉인 후엔 모든 크루가 편지 열람 가능
      </div>
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('finale-admin-close').addEventListener('click', () => modal.remove());
  document.getElementById('finale-open-input').addEventListener('click', () => {
    modal.remove();
    showFinaleUI();
  });
  document.getElementById('finale-seal').addEventListener('click', () => {
    modal.remove();
    adminSealFinale();
  });
}

// ════════════════════════════════════════════════════════════
// 펜딩 질문 (답 못한 말들) - 나중에 답할 수 있게 보관
// ════════════════════════════════════════════════════════════

/**
 * 펜딩 질문 목록 UI
 * - 아직 답 안 된 질문에 다른 크루가 답하거나
 * - 관리자가 직접 답하거나 일괄 삭제
 * - 페이지별로 4개씩 표시
 */
function showPendingQuestions(opts = {}) {
  if (!currentPet) return;
  const existing = document.getElementById('pending-modal');
  if (existing) { existing.remove(); return; }

  const PER_PAGE = 4;
  const unansweredPage = opts.unansweredPage ?? 0;
  const answeredPage = opts.answeredPage ?? 0;

  // 기존 데이터 정상화 (answered가 undefined면 false로)
  const all = currentPet.pendingQuestions || [];
  for (const q of all) {
    if (q.answered === undefined) q.answered = false;
    if (q.answer === undefined || q.answer === null) q.answer = '';
    if (q.answerBy === undefined || q.answerBy === null) q.answerBy = '';
    if (q.answerAt === undefined || q.answerAt === null) q.answerAt = 0;
  }

  // OBJECT용 디버그 출력 (누락된 항목 추적)
  if (currentUser?.isAdmin) {
    console.log('[pending] 전체', all.length, '개 · pendingQuestions:', all);
    console.log('[pending] 답 안 된:', all.filter(q => !q.answered).length, '개');
    console.log('[pending] 답한:', all.filter(q => q.answered).length, '개');
  }

  const unanswered = all.filter(q => !q.answered);
  const answered = all.filter(q => q.answered);

  // 페이지 슬라이스 (역순 정렬: 최신부터)
  const unansweredReversed = unanswered.slice().reverse();
  const answeredReversed = answered.slice().reverse();
  const unansweredTotalPages = Math.max(1, Math.ceil(unansweredReversed.length / PER_PAGE));
  const answeredTotalPages = Math.max(1, Math.ceil(answeredReversed.length / PER_PAGE));
  const unansweredSlice = unansweredReversed.slice(unansweredPage * PER_PAGE, (unansweredPage + 1) * PER_PAGE);
  const answeredSlice = answeredReversed.slice(answeredPage * PER_PAGE, (answeredPage + 1) * PER_PAGE);

  const modal = document.createElement('div');
  modal.id = 'pending-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = `
    <div class="talk-modal-head" style="background:#2d4a2d;">
      <span>답하지 못한 말들 (${unanswered.length}개)</span>
      <span class="talk-close" id="pending-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:14px;">
      <div style="color:#8fb39a;font-size:11px;margin-bottom:10px;line-height:1.6;">
        ${currentUser.isAdmin
          ? '누군가가 남긴 말. 답할 수 있다면 아이에게 전해주자.'
          : '아직 아이가 답할 수 없는 말들이야. 답은 언젠가 돌아올지도.'}
        ${currentPet.stage === 'BABY' ? '<br><span style="color:#e8a853;">(BABY가 아직 말을 못 해서 묵혀 있던 말들도 있어.)</span>' : ''}
      </div>

      ${currentUser.isAdmin ? `
        <div style="margin-bottom:10px;">
          <button id="pending-show-msg-log"
            style="width:100%;background:transparent;border:1px dotted #8fb39a;color:#8fb39a;
            padding:6px;font-family:inherit;font-size:11px;cursor:pointer;">
            ▶ MSG 로그에서 누락된 질문 찾기
          </button>
        </div>
      ` : ''}

      ${unanswered.length === 0 ? `
        <div style="color:#666;font-size:12px;text-align:center;padding:20px 0;">
          아직 답 기다리는 말이 없어.
        </div>
      ` : unansweredSlice.map((q) => {
        const idx = all.indexOf(q);  // 원본 배열 인덱스
        const timeStr = new Date(q.at).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
        return `
          <div style="border:1px dotted #5fb37a;padding:10px 12px;margin-bottom:8px;background:#0a1410;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="color:#5fb37a;font-size:11px;font-weight:bold;">${q.user}</span>
              <span style="color:#666;font-size:10px;">${timeStr}</span>
            </div>
            <div style="font-size:13px;color:#c9c9c9;margin-bottom:8px;line-height:1.6;">
              "${q.text.replace(/</g, '&lt;')}"
            </div>
            ${currentUser.isAdmin ? `
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="pending-answer" data-idx="${idx}"
                  style="flex:1;background:#0a3818;border:1px solid #03B352;color:#03B352;
                  padding:6px;font-family:inherit;font-size:11px;cursor:pointer;min-width:120px;">
                  답해주기
                </button>
                <button class="pending-markdone" data-idx="${idx}"
                  style="background:transparent;border:1px solid #8fb39a;color:#8fb39a;
                  padding:6px 10px;font-family:inherit;font-size:11px;cursor:pointer;"
                  title="이미 로그에 답한 기록이 있으면 완료 처리">
                  ✓ 완료 표시
                </button>
                <button class="pending-delete" data-idx="${idx}"
                  style="background:transparent;border:1px solid #c97d5f;color:#c97d5f;
                  padding:6px 10px;font-family:inherit;font-size:11px;cursor:pointer;">
                  ✕ 삭제
                </button>
              </div>
            ` : `
              <div style="color:#8fb39a;font-size:10px;text-align:right;font-style:italic;">
                답변 대기 중
              </div>
            `}
          </div>
        `;
      }).join('')}

      ${unansweredTotalPages > 1 ? `
        <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin:10px 0;font-size:11px;">
          <button class="pending-page-btn" data-target="unanswered" data-page="${unansweredPage - 1}"
            ${unansweredPage === 0 ? 'disabled' : ''}
            style="background:transparent;border:1px solid ${unansweredPage === 0 ? '#2d5a3e' : '#5fb37a'};
            color:${unansweredPage === 0 ? '#333' : '#5fb37a'};padding:4px 10px;font-family:inherit;
            cursor:${unansweredPage === 0 ? 'not-allowed' : 'pointer'};">◀ 이전</button>
          <span style="color:#8fb39a;">${unansweredPage + 1} / ${unansweredTotalPages}</span>
          <button class="pending-page-btn" data-target="unanswered" data-page="${unansweredPage + 1}"
            ${unansweredPage >= unansweredTotalPages - 1 ? 'disabled' : ''}
            style="background:transparent;border:1px solid ${unansweredPage >= unansweredTotalPages - 1 ? '#2d5a3e' : '#5fb37a'};
            color:${unansweredPage >= unansweredTotalPages - 1 ? '#333' : '#5fb37a'};padding:4px 10px;font-family:inherit;
            cursor:${unansweredPage >= unansweredTotalPages - 1 ? 'not-allowed' : 'pointer'};">다음 ▶</button>
        </div>
      ` : ''}

      ${answered.length > 0 ? `
        <div style="margin-top:16px;border-top:1px dotted #2d5a3e;padding-top:10px;">
          <div style="color:#8fb39a;font-size:11px;font-weight:bold;margin-bottom:8px;">
            ◢ 답한 말 (${answered.length}개)
          </div>
          ${answeredSlice.map(q => `
            <div class="pending-answered-row" data-qidx="${all.indexOf(q)}"
              style="padding:8px 10px;margin-bottom:6px;background:#050a07;border:1px solid #1a3d28;font-size:11px;line-height:1.6;cursor:pointer;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:#8fb39a;">${q.user} · <span style="color:#c9c9c9;">"${q.text.slice(0, 30).replace(/</g, '&lt;')}${q.text.length > 30 ? '...' : ''}"</span></span>
                <span style="color:#666;font-size:10px;">▶ 답 보기</span>
              </div>
            </div>
          `).join('')}

          ${answeredTotalPages > 1 ? `
            <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin:10px 0;font-size:11px;">
              <button class="pending-page-btn" data-target="answered" data-page="${answeredPage - 1}"
                ${answeredPage === 0 ? 'disabled' : ''}
                style="background:transparent;border:1px solid ${answeredPage === 0 ? '#2d5a3e' : '#8fb39a'};
                color:${answeredPage === 0 ? '#333' : '#8fb39a'};padding:4px 10px;font-family:inherit;
                cursor:${answeredPage === 0 ? 'not-allowed' : 'pointer'};">◀ 이전</button>
              <span style="color:#8fb39a;">${answeredPage + 1} / ${answeredTotalPages}</span>
              <button class="pending-page-btn" data-target="answered" data-page="${answeredPage + 1}"
                ${answeredPage >= answeredTotalPages - 1 ? 'disabled' : ''}
                style="background:transparent;border:1px solid ${answeredPage >= answeredTotalPages - 1 ? '#2d5a3e' : '#8fb39a'};
                color:${answeredPage >= answeredTotalPages - 1 ? '#333' : '#8fb39a'};padding:4px 10px;font-family:inherit;
                cursor:${answeredPage >= answeredTotalPages - 1 ? 'not-allowed' : 'pointer'};">다음 ▶</button>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('pending-close').addEventListener('click', () => modal.remove());

  // MSG 로그 조회 (관리자 전용)
  document.getElementById('pending-show-msg-log')?.addEventListener('click', () => {
    showMsgLogAudit();
  });

  modal.querySelectorAll('.pending-answer').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      const q = currentPet.pendingQuestions[idx];
      if (!q) return;
      const answer = prompt(
        `"${q.text}"\n\n— ${q.user}의 말에 어떻게 답할까? (100자 이내)`,
        ''
      );
      if (!answer || !answer.trim()) return;
      const trimmed = answer.trim().slice(0, 100);

      try {
        const questionId = `${q.user}_${q.at}`;
        const speechText = `${q.user}, "${q.text}"... ${trimmed}`;

        // 질문 식별 정보를 더 풍부하게 전달 (text도 fallback 용)
        const result = await Backend.answerPendingQuestion(
          questionId, trimmed, currentUser.name, speechText, { user: q.user, text: q.text }
        );

        if (!result?.found) {
          showToast(`⚠ 대상 질문을 찾을 수 없습니다 (F12 콘솔 로그 확인)`, 'warn');
          modal.remove();
          setTimeout(() => showPendingQuestions({ unansweredPage, answeredPage }), 200);
          return;
        }

        await Backend.addLog({
          user: currentUser.name, action: 'ANSWER',
          text: `${q.user}의 오래된 말에 답함`,
          type: 'personality',
        });
        showToast(`${q.user}에게 답이 전해졌어`, 'personality');
        modal.remove();
        setTimeout(() => showPendingQuestions({ unansweredPage, answeredPage }), 200);
      } catch (err) {
        console.error('[pending] 답변 저장 실패:', err);
        showToast(`⚠ 답변 저장 실패 · 다시 시도해주세요`, 'warn');
      }
    });
  });

  modal.querySelectorAll('.pending-markdone').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      const q = currentPet.pendingQuestions?.[idx];
      if (!q) return;
      const existingAnswer = prompt(
        `이 질문을 "이미 답함"으로 표시합니다.\n\n이전에 했던 답변 내용을 입력해주세요 (로그 기록용):\n\n"${q.text}"`,
        '(답변 기록 없음)'
      );
      if (existingAnswer === null) return;
      const trimmed = existingAnswer.trim().slice(0, 100) || '(답변 기록 없음)';

      try {
        const questionId = `${q.user}_${q.at}`;
        const result = await Backend.answerPendingQuestion(
          questionId, trimmed, currentUser.name, null, { user: q.user, text: q.text }
        );
        if (!result?.found) {
          showToast(`⚠ 대상 질문을 찾을 수 없습니다 (F12 콘솔 로그 확인)`, 'warn');
          modal.remove();
          setTimeout(() => showPendingQuestions({ unansweredPage, answeredPage }), 200);
          return;
        }
        showToast(`✓ 완료 처리됨`, 'system');
        modal.remove();
        setTimeout(() => showPendingQuestions({ unansweredPage, answeredPage }), 200);
      } catch (err) {
        console.error('[pending] 완료 표시 실패:', err);
        showToast(`⚠ 완료 표시 실패`, 'warn');
      }
    });
  });

  modal.querySelectorAll('.pending-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      const q = currentPet.pendingQuestions?.[idx];
      if (!q) return;
      if (!confirm('이 질문을 삭제합니다. 계속할까요?')) return;
      try {
        const questionId = `${q.user}_${q.at}`;
        await Backend.deletePendingQuestion(questionId);
        modal.remove();
        setTimeout(() => showPendingQuestions({ unansweredPage, answeredPage }), 200);
      } catch (err) {
        console.error('[pending] 삭제 실패:', err);
        showToast(`⚠ 삭제 실패 · 다시 시도해주세요`, 'warn');
      }
    });
  });

  // 답한 말 클릭 시 상세 보기
  modal.querySelectorAll('.pending-answered-row').forEach(row => {
    row.addEventListener('click', () => {
      const qidx = parseInt(row.dataset.qidx);
      const q = currentPet.pendingQuestions?.[qidx];
      if (!q || !q.answered) return;
      showAnsweredDetail(q);
    });
  });

  // 페이지 이동 버튼
  modal.querySelectorAll('.pending-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const target = btn.dataset.target;
      const page = parseInt(btn.dataset.page);
      modal.remove();
      setTimeout(() => {
        showPendingQuestions({
          unansweredPage: target === 'unanswered' ? page : unansweredPage,
          answeredPage: target === 'answered' ? page : answeredPage,
        });
      }, 50);
    });
  });
}

/**
 * MSG 로그 감사 - 펜딩 질문과 로그를 비교해서 누락 항목 찾기
 */
// MSG 감사에서 '무시'된 항목 (세션 동안만, user_atMs 키)
const msgAuditIgnoredKeys = new Set();

function showMsgLogAudit() {
  if (!currentUser?.isAdmin) return;
  const existing = document.getElementById('msg-audit-modal');
  if (existing) { existing.remove(); return; }

  const msgLogs = (logs || []).filter(l => l.action === 'MSG');
  const pending = currentPet.pendingQuestions || [];

  // 로그와 펜딩을 비교: 로그엔 있는데 펜딩엔 없는 것 찾기
  const missingOnes = [];
  for (const log of msgLogs) {
    // [복원] 로그는 수동 등록이므로 스킵
    if (log.text?.startsWith('◎ [복원]')) continue;

    // 로그 텍스트 예: `◎ "네 첫 기억이 뭐야?" 남김`
    const m = log.text?.match(/"([^"]+)"/);
    if (!m) continue;
    const logText = m[1];  // 30자 잘린 상태
    const user = log.user;

    // 세션 무시 필터
    const ignoreKey = `${user}_${log.atMs}`;
    if (msgAuditIgnoredKeys.has(ignoreKey)) continue;

    // 펜딩에 같은 user + text 시작이 같은 것 있는지
    const found = pending.some(q =>
      q.user === user && q.text.startsWith(logText.replace(/\.\.\.$/, ''))
    );
    if (!found) {
      missingOnes.push({ ...log, logText });
    }
  }

  const modal = document.createElement('div');
  modal.id = 'msg-audit-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = `
    <div class="talk-modal-head" style="background:#3a2a05;">
      <span>MSG 로그 감사 (최근 ${msgLogs.length}건)</span>
      <span class="talk-close" id="msg-audit-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:14px;">
      <div style="color:#8fb39a;font-size:11px;margin-bottom:12px;line-height:1.6;">
        로그에 남아있는 MSG 기록과 현재 펜딩 목록을 비교합니다.
        로그엔 있는데 펜딩에 없는 항목 = <span style="color:#e8a853;">누락된 질문</span>
      </div>

      ${missingOnes.length > 0 ? `
        <div style="border:1px solid #e8a853;background:#1a1505;padding:10px;margin-bottom:14px;">
          <div style="color:#e8a853;font-size:12px;font-weight:bold;margin-bottom:8px;">
            ⚠ 누락된 질문 ${missingOnes.length}개
          </div>
          ${missingOnes.map((log, i) => {
            const time = new Date(log.atMs).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
            return `
              <div style="padding:8px 10px;margin-bottom:6px;background:#0a0a05;border:1px dotted #c9a06b;font-size:11px;line-height:1.6;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="color:#e8a853;font-weight:bold;">${log.user}</span>
                  <span style="color:#666;font-size:10px;">${time}</span>
                </div>
                <div style="color:#c9c9c9;">"${(log.logText || '').replace(/</g, '&lt;')}"</div>
                <div style="color:#c97d5f;font-size:10px;margin-top:4px;margin-bottom:6px;">
                  → 펜딩 목록에 없음 (저장 실패 또는 삭제됨)
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button class="msg-audit-restore" data-idx="${i}"
                    style="flex:1;background:#0a3818;border:1px solid #03B352;color:#03B352;
                    padding:6px;font-family:inherit;font-size:11px;cursor:pointer;min-width:140px;">
                    + 펜딩에 수동 추가
                  </button>
                  <button class="msg-audit-ignore" data-idx="${i}"
                    style="background:transparent;border:1px solid #666;color:#888;
                    padding:6px 10px;font-family:inherit;font-size:11px;cursor:pointer;"
                    title="이번 세션에서만 목록에서 숨김">
                    무시
                  </button>
                </div>
              </div>
            `;
          }).join('')}
          <div style="color:#c9a06b;font-size:10px;margin-top:8px;line-height:1.5;">
            '+ 펜딩에 수동 추가'로 질문을 복원할 수 있습니다.<br>
            전체 텍스트 입력 가능 (로그는 30자까지만 표시됨).
          </div>
        </div>
      ` : `
        <div style="color:#03B352;font-size:12px;text-align:center;padding:16px 0;border:1px solid #03B352;background:#0a1410;margin-bottom:14px;">
          ✓ 누락된 질문 없음 · 로그와 펜딩이 일치합니다
        </div>
      `}

      <div style="color:#8fb39a;font-size:11px;font-weight:bold;margin-bottom:6px;">
        ◢ 전체 MSG 로그 (${msgLogs.length}건)
      </div>
      ${msgLogs.length === 0 ? `
        <div style="color:#666;font-size:11px;text-align:center;padding:12px 0;">
          로그가 없습니다 (최근 100개만 조회됨)
        </div>
      ` : msgLogs.slice().reverse().map(log => {
        const time = new Date(log.atMs).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
        return `
          <div style="padding:6px 10px;margin-bottom:4px;background:#050a07;border:1px dotted #2d5a3e;font-size:11px;line-height:1.5;">
            <span style="color:#8fb39a;">${time}</span> ·
            <span style="color:#5fb37a;font-weight:bold;">${log.user}</span> ·
            <span style="color:#c9c9c9;">${(log.text || '').replace(/</g, '&lt;')}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('msg-audit-close').addEventListener('click', () => modal.remove());

  // 복원: 누락 항목을 pendingQuestions에 수동 추가
  modal.querySelectorAll('.msg-audit-restore').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      const log = missingOnes[idx];
      if (!log) return;

      // 로그 원문에서 "..."로 잘린 경우 있으니 전체 텍스트 입력받음
      const logTextClean = (log.logText || '').replace(/\.\.\.$/, '');
      const fullText = prompt(
        `${log.user}의 질문을 펜딩에 수동 추가합니다.\n\n` +
        `원본 텍스트 (로그 기록):\n"${logTextClean}"\n\n` +
        `전체 질문 텍스트를 입력해주세요 (120자 이내):`,
        logTextClean
      );
      if (!fullText || !fullText.trim()) return;
      const text = fullText.trim().slice(0, 120);

      try {
        await Backend.appendPendingQuestion({
          user: log.user,
          text,
          at: log.atMs || Date.now(),  // 원본 시각 사용
          answered: false,
          answer: '',
          answerBy: '',
          answerAt: 0,
        });
        await Backend.addLog({
          user: currentUser.name, action: 'MSG',
          text: `◎ [복원] ${log.user}의 "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}" 수동 등록`,
          type: 'system',
        });
        showToast(`${log.user}의 질문 복원 완료`, 'personality');
        // 감사 다시 실행 (목록 갱신)
        modal.remove();
        setTimeout(showMsgLogAudit, 200);
      } catch (err) {
        console.error('[msg-audit] 복원 실패:', err);
        showToast(`⚠ 복원 실패 · 다시 시도해주세요`, 'warn');
      }
    });
  });

  // 무시: 세션 내에서만 숨김 (새로고침하면 다시 보임)
  modal.querySelectorAll('.msg-audit-ignore').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const log = missingOnes[idx];
      if (!log) return;
      msgAuditIgnoredKeys.add(`${log.user}_${log.atMs}`);
      modal.remove();
      setTimeout(showMsgLogAudit, 100);
    });
  });
}

/**
 * 답한 말 상세 보기 모달
 */
function showAnsweredDetail(q) {
  const existing = document.getElementById('answered-detail-modal');
  if (existing) existing.remove();

  const askTime = new Date(q.at).toLocaleString('ko-KR');
  const answerTime = q.answerAt ? new Date(q.answerAt).toLocaleString('ko-KR') : '';

  const modal = document.createElement('div');
  modal.id = 'answered-detail-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = `
    <div class="talk-modal-head" style="background:#2d4a2d;">
      <span>답이 전해진 말</span>
      <span class="talk-close" id="answered-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:16px;">
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="color:#5fb37a;font-size:11px;font-weight:bold;">${q.user}의 말</span>
          <span style="color:#666;font-size:10px;">${askTime}</span>
        </div>
        <div style="background:#0a1410;border:1px dotted #5fb37a;padding:10px 12px;font-size:13px;color:#c9c9c9;line-height:1.7;">
          "${q.text.replace(/</g, '&lt;')}"
        </div>
      </div>

      <div style="text-align:center;color:#2d5a3e;font-size:18px;margin:4px 0;">↓</div>

      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="color:#e8a853;font-size:11px;font-weight:bold;">${q.answerBy}가 전한 답</span>
          <span style="color:#666;font-size:10px;">${answerTime}</span>
        </div>
        <div style="background:#1a1505;border:1px solid #e8a853;padding:10px 12px;font-size:13px;color:#e8a853;line-height:1.7;">
          "${(q.answer || '').replace(/</g, '&lt;')}"
        </div>
      </div>
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('answered-close').addEventListener('click', () => modal.remove());
}

// ════════════════════════════════════════════════════════════
// 미니게임: 숫자 맞추기 (Up/Down)
// ════════════════════════════════════════════════════════════

/**
 * 오늘 보상 가능 횟수 체크 (제한 없음 · 항상 보상)
 */
function checkMinigameRewardEligibility() {
  return { eligible: true, count: 0, limit: 999, testMode: isMinigameTestMode() };
}

/**
 * 미니게임 완료 시 보상 카운트 증가
 */
async function incrementMinigameCount() {
  if (isMinigameTestMode()) return;  // 테스트 모드: 카운트 증가 안 함
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  const mg = currentPet.minigameToday;
  if (!mg || mg.dayKey !== dayKey) {
    currentPet.minigameToday = { dayKey, count: 1 };
  } else {
    currentPet.minigameToday = { dayKey, count: mg.count + 1 };
  }
}

// ════════════════════════════════════════════════════════════
// 라디오 이벤트 시스템
// ════════════════════════════════════════════════════════════

/**
 * OBJECT 테스트 모드 - 라디오용
 * minigameTestMode와 별도 (게임과 구분)
 */
let radioTestMode = false;
/**
 * 테스트 모드에서 현재 활성 이벤트 (pet.radioSchedule과 별개)
 * 팝업 닫아도 유지되어 아이콘 재오픈 테스트 가능
 */
let radioTestActiveEvent = null;
/**
 * 일반 모드의 로컬 라디오 이벤트 (크루별 1시간 1번)
 * pet.radioSchedule 사용 안 함 - localStorage 쿨다운 + 화면 메모리만
 */
let radioLocalEvent = null;

function isRadioTestMode() {
  return currentUser?.isAdmin && radioTestMode;
}

/**
 * 오늘의 라디오 스케줄이 필요한지 체크하고 생성
 * - 하루 1번 (24h 경과 후) 3개 스케줄 만듦
 * - 현재 시각 +1h 후부터 남은 하루 내 4h 이상 간격으로 랜덤 배치
 */
async function ensureRadioSchedule() {
  if (!currentPet || currentPet.isDead) return;
  // 라디오는 TEEN부터만 발생
  if (currentPet.stage !== 'TEEN' && currentPet.stage !== 'ADULT') return;
  if (isRadioTestMode()) return;  // 테스트 모드는 스케줄 건드리지 않음

  const now = Date.now();
  const lastGen = currentPet.radioLastGeneratedAt || 0;
  const DAY_MS = 24 * 3600 * 1000;

  // 하루 지났거나 스케줄 없으면 새로 생성
  if (now - lastGen < DAY_MS) return;

  // 기존 미처리 이벤트 정리 (window 넘긴 것은 missed 처리 안 함, 그냥 새 걸로 덮어씀)
  const cfg = CONFIG.RADIO_CONFIG;
  const schedule = [];
  const hourMs = 3600 * 1000;
  const minGapMs = cfg.MIN_GAP_HOURS * hourMs;

  // 앞으로 18시간 내 (남은 하루) 3번 분포
  const baseStart = now + 30 * 60 * 1000;  // 지금부터 30분 뒤부터
  const baseEnd = now + 18 * hourMs;       // 최대 18h 뒤까지
  const slots = 3;
  let cursor = baseStart;
  for (let i = 0; i < slots; i++) {
    // 각 슬롯은 이전 + 4h 이상, 최대 (18-i*4)h 지점까지
    const slotMin = cursor;
    const slotMax = Math.max(cursor + hourMs, baseEnd - (slots - 1 - i) * minGapMs);
    const at = slotMin + Math.floor(Math.random() * Math.max(1, slotMax - slotMin));

    // 랜덤 채널 선택
    const channel = cfg.CHANNELS[Math.floor(Math.random() * cfg.CHANNELS.length)];
    // 랜덤 정답 주파수 (10~90 범위, 너무 가장자리 피함)
    const freq = 10 + Math.floor(Math.random() * 80);

    schedule.push({
      scheduledAt: at,
      windowEnd: at + cfg.WINDOW_HOURS * hourMs,
      channelId: channel.id,
      freq,
      popped: false,
      matched: false,
      missed: false,
    });
    cursor = at + minGapMs;
  }

  try {
    await Backend.updateRadioSchedule(schedule, now);
    console.log('[radio] 스케줄 생성 완료', schedule.map(s => new Date(s.scheduledAt).toLocaleTimeString()));
  } catch (err) {
    console.error('[radio] 스케줄 저장 실패:', err);
  }
}

/**
 * 활성 라디오 이벤트 찾기
 * - scheduledAt 이 지났고 windowEnd 이전이며 popped=false 인 것
 */
function findActiveRadioEvent() {
  if (!currentPet) return null;
  const now = Date.now();
  const list = currentPet.radioSchedule || [];
  return list.find(e => !e.popped && e.scheduledAt <= now && now < e.windowEnd);
}

/**
 * 미처리 missed 이벤트 찾기 (windowEnd 지났는데 popped=false)
 * 백그라운드에서 자동 missed 처리
 */
async function processExpiredRadioEvents() {
  if (!currentPet) return;
  if (isRadioTestMode()) return;
  const now = Date.now();
  const list = currentPet.radioSchedule || [];
  for (const e of list) {
    if (!e.popped && e.windowEnd < now) {
      // 놓침 처리
      const penalty = CONFIG.RADIO_CONFIG.MISSED_PENALTY;
      try {
        await Backend.resolveRadioEvent(e.scheduledAt, 'missed', penalty);
        await Backend.addLog({
          user: null, action: 'RADIO',
          text: `◇ 주파수 신호를 놓쳤다. 흩어진 채 사라졌다.`,
          type: 'warn',
        });
      } catch (err) {
        console.warn('[radio] missed 처리 실패:', err);
      }
    }
  }
}

// 현재 열린 팝업 식별자 (중복 방지)
let currentRadioPopup = null;
// AudioContext & noise 노드 (전역 유지)
let radioAudioCtx = null;
let radioNoiseSource = null;
let radioNoiseGain = null;

/**
 * 화이트노이즈 생성/재생 (Web Audio API)
 * volume: 0.0 ~ 0.2 (20% 상한)
 */
function startRadioNoise() {
  try {
    if (!radioAudioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      radioAudioCtx = new AC();
    }
    if (radioAudioCtx.state === 'suspended') {
      radioAudioCtx.resume();
    }
    if (radioNoiseSource) return;  // 이미 재생 중

    // 1초 길이 노이즈 버퍼, 반복 재생
    const bufferSize = radioAudioCtx.sampleRate * 1;
    const buffer = radioAudioCtx.createBuffer(1, bufferSize, radioAudioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    radioNoiseSource = radioAudioCtx.createBufferSource();
    radioNoiseSource.buffer = buffer;
    radioNoiseSource.loop = true;

    radioNoiseGain = radioAudioCtx.createGain();
    radioNoiseGain.gain.value = 0.2;  // 초기 20%

    radioNoiseSource.connect(radioNoiseGain);
    radioNoiseGain.connect(radioAudioCtx.destination);
    radioNoiseSource.start(0);
  } catch (err) {
    console.warn('[radio] 오디오 초기화 실패:', err);
  }
}

function setRadioNoiseVolume(vol) {
  if (radioNoiseGain) {
    radioNoiseGain.gain.value = Math.max(0, Math.min(0.2, vol));
  }
}

function stopRadioNoise() {
  try {
    if (radioNoiseSource) {
      radioNoiseSource.stop(0);
      radioNoiseSource.disconnect();
      radioNoiseSource = null;
    }
    if (radioNoiseGain) {
      radioNoiseGain.disconnect();
      radioNoiseGain = null;
    }
  } catch (err) { /* ignore */ }
}

/**
 * 라디오 팝업 열기 (실수로 닫아도 ASCII 옆 신호 아이콘으로 복귀 가능)
 */
function openRadioPopup(event, opts = {}) {
  if (!event) return;
  const existing = document.getElementById('radio-popup');
  if (existing) { existing.remove(); return; }

  const cfg = CONFIG.RADIO_CONFIG;
  const channel = cfg.CHANNELS.find(c => c.id === event.channelId);
  if (!channel) return;

  currentRadioPopup = event.scheduledAt;

  const state = {
    currentFreq: 50,  // 레버 시작 위치
    targetFreq: event.freq,
    tolerance: cfg.TOLERANCE,
    matched: false,
    dragging: false,
  };

  const modal = document.createElement('div');
  modal.id = 'radio-popup';
  modal.className = 'radio-popup';
  modal.innerHTML = renderRadioPopupHTML(state, event, channel);

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  attachRadioHandlers(modal, state, event, channel);

  // 노이즈 시작 (브라우저 정책: 사용자 인터랙션 필요)
  // 팝업 띄운 상태에서 첫 클릭/드래그 시 시작하도록 함
}

function renderRadioPopupHTML(state, event, channel) {
  const dist = Math.abs(state.currentFreq - state.targetFreq);
  const proximity = Math.max(0, 1 - dist / 40);  // 0 (먼) ~ 1 (가까움)
  const signalBars = Math.min(4, Math.floor(proximity * 5));
  const remainMs = event.windowEnd - Date.now();
  const remainMin = Math.max(0, Math.floor(remainMs / 60000));
  const remainH = Math.floor(remainMin / 60);
  const remainLabel = remainH > 0 ? `${remainH}시간 ${remainMin % 60}분` : `${remainMin}분`;

  const isTest = isRadioTestMode();

  return `
    <div class="radio-popup-head">
      <span>> RADIO.EXE ${isTest ? '· <span style="color:#e8a853;">[TEST]</span>' : ''}</span>
      <span class="radio-close" id="radio-close" title="닫기 (아이콘으로 최소화됨)">─ _ ✕</span>
    </div>
    <div class="radio-popup-body">
      <div class="radio-terminal-line">&gt; 알 수 없는 신호 감지. 주파수 조정 중...</div>
      <div class="radio-terminal-line dim">&gt; 남은 시간: ${remainLabel}</div>
      <div class="radio-terminal-line dim">&gt; ${channel.desc.slice(0, 3)}...</div>

      <!-- 신호 강도 바 -->
      <div class="radio-signal-row">
        <span class="radio-signal-label">SIGNAL</span>
        <div class="radio-signal-bars">
          ${[0,1,2,3].map(i =>
            `<span class="radio-bar ${i < signalBars ? 'on' : ''}"></span>`
          ).join('')}
        </div>
        <span class="radio-freq-label">${state.currentFreq.toFixed(1)} MHz</span>
      </div>

      <!-- 레버 드래그 영역 -->
      <div class="radio-slider-track" id="radio-slider-track">
        <div class="radio-slider-marks"></div>
        <div class="radio-slider-knob" id="radio-slider-knob"
          style="left: ${state.currentFreq}%;"></div>
      </div>
      <div class="radio-slider-axis">
        <span>0</span><span>50</span><span>100</span>
      </div>

      <!-- 확인 버튼 -->
      <div class="radio-actions">
        <button id="radio-confirm" class="radio-btn" ${state.matched ? 'disabled' : ''}>[!] 이 주파수로 맞춤</button>
      </div>

      <div class="radio-terminal-line dim">
        &gt; 드래그하여 주파수 조정. [!] 버튼으로 확인.
      </div>
    </div>
  `;
}

function attachRadioHandlers(modal, state, event, channel) {
  const track = modal.querySelector('#radio-slider-track');
  const knob = modal.querySelector('#radio-slider-knob');
  const closeBtn = modal.querySelector('#radio-close');
  const confirmBtn = modal.querySelector('#radio-confirm');

  // 닫기 = 최소화 (저장 안 됨, 아이콘만 남김)
  // 테스트 모드에서도 radioTestMode 유지 → 아이콘 표시 → 클릭 재오픈 가능
  closeBtn?.addEventListener('click', () => {
    modal.remove();
    currentRadioPopup = null;
    stopRadioNoise();
    // 아이콘은 render()에서 자동 표시
    render();
  });

  // 드래그 로직
  function freqFromClientX(clientX) {
    const rect = track.getBoundingClientRect();
    const rel = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(100, rel * 100));
  }

  function updateKnob(freq) {
    state.currentFreq = freq;
    knob.style.left = freq + '%';
    // 신호 강도 표시 업데이트 (부분 렌더)
    const dist = Math.abs(freq - state.targetFreq);
    const proximity = Math.max(0, 1 - dist / 40);
    const signalBars = Math.min(4, Math.floor(proximity * 5));
    const bars = modal.querySelectorAll('.radio-bar');
    bars.forEach((b, i) => {
      if (i < signalBars) b.classList.add('on');
      else b.classList.remove('on');
    });
    const freqLabel = modal.querySelector('.radio-freq-label');
    if (freqLabel) freqLabel.textContent = freq.toFixed(1) + ' MHz';

    // 노이즈 볼륨 조정 (정답 가까울수록 낮아짐)
    // 거리 0 = 0볼륨(깨끗), 거리 40+ = 0.2볼륨
    const vol = Math.min(0.2, dist / 40 * 0.2);
    setRadioNoiseVolume(vol);
  }

  function startDrag(clientX) {
    state.dragging = true;
    // 첫 인터랙션에서 노이즈 시작
    startRadioNoise();
    updateKnob(freqFromClientX(clientX));
  }

  function onMove(e) {
    if (!state.dragging) return;
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    updateKnob(freqFromClientX(clientX));
    e.preventDefault();
  }

  function endDrag() {
    state.dragging = false;
  }

  track.addEventListener('mousedown', e => startDrag(e.clientX));
  track.addEventListener('touchstart', e => startDrag(e.touches[0].clientX), { passive: true });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);

  // 확인 버튼
  confirmBtn?.addEventListener('click', async () => {
    if (state.matched) return;
    const dist = Math.abs(state.currentFreq - state.targetFreq);
    if (dist <= state.tolerance) {
      state.matched = true;
      await onRadioMatched(state, event, channel, modal);
    } else {
      // 실패 피드백
      const hint = state.currentFreq < state.targetFreq ? '↑ 주파수를 높여봐' : '↓ 주파수를 낮춰봐';
      const terminal = modal.querySelector('.radio-popup-body');
      if (terminal) {
        const line = document.createElement('div');
        line.className = 'radio-terminal-line warn';
        line.textContent = `> 치직... 아직 맞지 않아. ${hint}`;
        terminal.insertBefore(line, terminal.firstChild);
      }
    }
  });
}

async function onRadioMatched(state, event, channel, modal) {
  stopRadioNoise();
  currentRadioPopup = null;

  // 채널 공개 UI
  const body = modal.querySelector('.radio-popup-body');
  if (body) {
    body.innerHTML = `
      <div class="radio-terminal-line good">&gt; 신호 포착! ${channel.label}</div>
      <div class="radio-terminal-line">&gt; ${channel.desc}</div>
      <div class="radio-terminal-line dim">&gt; ${channel.story}</div>
      ${isRadioTestMode()
        ? `<div class="radio-terminal-line warn">&gt; [TEST] 저장 안 됨</div>`
        : ''}
      <div class="radio-actions">
        <button id="radio-close-after" class="radio-btn">[닫기]</button>
      </div>
    `;
    modal.querySelector('#radio-close-after')?.addEventListener('click', () => {
      modal.remove();
      // 매칭 성공 후 닫기 = 테스트 종료 (이벤트도 지움, 아이콘 안 남음)
      if (radioTestMode) {
        radioTestMode = false;
        radioTestActiveEvent = null;
      }
      // 로컬 이벤트 매칭 완료 → 지움
      if (event.isLocal) {
        radioLocalEvent = null;
      }
      render();
    });
  }

  // 테스트 모드: 저장 안 함
  if (isRadioTestMode()) return;

  // 로컬 이벤트: pet에 보상 직접 적용 (resolveRadioEvent는 글로벌 스케줄용이라 not found 됨)
  if (event.isLocal) {
    radioLocalEvent.matched = true;
    try {
      // 보상 적용 (savePet 트랜잭션 내에서 처리하기 위해 임시 함수 호출)
      await applyRadioRewardLocal(channel.reward, channel.story);
      await Backend.addLog({
        user: currentUser.name, action: 'RADIO',
        text: `◆ 주파수 포착: ${channel.label}`,
        type: 'epic',
      });
    } catch (err) {
      console.error('[radio] 로컬 보상 적용 실패:', err);
    }
    return;
  }

  // 글로벌 스케줄 이벤트 (legacy, 사용 안 됨)
  try {
    await Backend.resolveRadioEvent(event.scheduledAt, 'matched', channel.reward);
    // 아이 대사 공용으로
    saveBroadcastSpeech(currentPet, {
      text: channel.story, at: Date.now(), to: '__sys__',
    });
    await Backend.addLog({
      user: currentUser.name, action: 'RADIO',
      text: `◆ 주파수 포착: ${channel.label}`,
      type: 'epic',
    });
  } catch (err) {
    console.error('[radio] 보상 저장 실패:', err);
  }
}

/**
 * 로컬 라디오 보상 - pet에 직접 적용 (트랜잭션)
 */
async function applyRadioRewardLocal(reward, storyText) {
  // 트랜잭션 사용해서 안전하게 보상 적용 + 공용 대사 저장
  // resolveRadioEvent의 보상 적용 로직 재사용 (scheduledAt 매칭 실패해도 보상은 안전)
  // 직접 pet 저장은 race condition 위험 → savePet 호출 X, 대신 새 트랜잭션 함수 사용
  if (!reward) return;
  try {
    // pet의 personality 등 안전하게 머지하는 트랜잭션
    await Backend.applyRadioReward(reward, storyText);
  } catch (err) {
    console.error('[radio] applyRadioReward 실패:', err);
    throw err;
  }
}

/**
 * ASCII 옆 라디오 신호 아이콘 (실수로 닫았거나 미처리 시)
 * render()에서 호출됨
 */
function renderRadioIcon() {
  const container = document.getElementById('radio-icon-slot');
  if (!container) return;

  // 우선순위: 테스트 모드 > 로컬 이벤트
  let ev;
  if (isRadioTestMode() && radioTestActiveEvent) {
    ev = radioTestActiveEvent;
  } else if (!isRadioTestMode() && radioLocalEvent) {
    // 로컬 이벤트 만료 체크
    if (radioLocalEvent.windowEnd < Date.now() || radioLocalEvent.matched) {
      radioLocalEvent = null;
      ev = null;
    } else {
      ev = radioLocalEvent;
    }
  }

  if (!ev || currentRadioPopup === ev.scheduledAt) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <div class="radio-icon-wrapper" id="radio-icon-wrapper"
      title="주파수 신호 감지됨 (클릭)${isRadioTestMode() ? ' · 우클릭으로 테스트 종료' : ''}">
      <div class="radio-wave r1"></div>
      <div class="radio-wave r2"></div>
      <div class="radio-wave r3"></div>
      <div class="radio-core"></div>
    </div>
  `;
  const iconEl = document.getElementById('radio-icon-wrapper');
  iconEl?.addEventListener('click', () => {
    let activeEv;
    if (isRadioTestMode() && radioTestActiveEvent) activeEv = radioTestActiveEvent;
    else if (radioLocalEvent) activeEv = radioLocalEvent;
    if (activeEv) openRadioPopup(activeEv);
  });
  // 테스트 모드: 우클릭으로 테스트 종료
  if (isRadioTestMode()) {
    iconEl?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      radioTestMode = false;
      radioTestActiveEvent = null;
      render();
      showToast('테스트 모드 종료', 'system');
    });
  }
}

/**
 * 라디오 틱 - 주기적 호출 (1분마다)
 * - 크루별로 1시간에 1번 라디오 이벤트 발생
 * - localStorage에 크루별 마지막 발사 시각 저장 (다른 크루 영향 없음)
 * - pet.radioSchedule (글로벌 스케줄) 무시 - 더 이상 사용 안 함
 */
async function radioTick() {
  if (!currentPet || currentPet.isDead) return;
  // 라디오는 TEEN부터만 발생
  if (currentPet.stage !== 'TEEN' && currentPet.stage !== 'ADULT') return;

  // 테스트 모드는 자동 틱 건너뜀 (수동 호출만)
  if (isRadioTestMode()) return;

  // 이미 팝업 열려있으면 새로 발사 안 함
  const isPopupOpen = document.getElementById('radio-popup');
  if (isPopupOpen) {
    renderRadioIcon();
    return;
  }

  // 1) OBJECT 브로드캐스트 체크 (1시간 쿨다운 무시)
  const bcast = currentPet.adminRadioBroadcast;
  if (bcast && bcast.id && bcast.windowEnd > Date.now()) {
    const seenKey = `radioBcastSeen_${currentUser.name}`;
    const lastSeenId = localStorage.getItem(seenKey) || '';
    if (lastSeenId !== bcast.id) {
      // 이 크루가 아직 안 받은 브로드캐스트
      localStorage.setItem(seenKey, bcast.id);
      const event = {
        scheduledAt: bcast.sentAt,
        windowEnd: bcast.windowEnd,
        channelId: bcast.channelId,
        freq: bcast.freq,
        popped: false,
        matched: false,
        missed: false,
        isLocal: true,
        isBroadcast: true,
      };
      radioLocalEvent = event;
      openRadioPopup(event);
      console.log('[radio] 브로드캐스트 수신 - 주파수:', bcast.freq);
      return;  // 이번 틱은 종료
    }
  }

  // 2) 일반 1시간 쿨다운 라디오
  const RADIO_INTERVAL_MS = 60 * 60 * 1000;
  const storageKey = `radioLastFiredAt_${currentUser.name}`;
  const lastFired = parseInt(localStorage.getItem(storageKey) || '0');
  const now = Date.now();

  if (lastFired === 0) {
    localStorage.setItem(storageKey, String(now - RADIO_INTERVAL_MS / 2));
    return;
  }

  if (now - lastFired < RADIO_INTERVAL_MS) {
    renderRadioIcon();
    return;
  }

  fireLocalRadioEvent();
  localStorage.setItem(storageKey, String(now));
}

/**
 * 크루 로컬 라디오 이벤트 생성 + 팝업 표시
 * (pet.radioSchedule에 저장하지 않음, 본인 화면에만 표시)
 */
function fireLocalRadioEvent() {
  const cfg = CONFIG.RADIO_CONFIG;
  const channel = cfg.CHANNELS[Math.floor(Math.random() * cfg.CHANNELS.length)];
  const freq = 10 + Math.floor(Math.random() * 80);
  const now = Date.now();
  const event = {
    scheduledAt: now,
    windowEnd: now + cfg.WINDOW_HOURS * 3600 * 1000,
    channelId: channel.id,
    freq,
    popped: false,
    matched: false,
    missed: false,
    isLocal: true,  // 글로벌 스케줄이 아님 표시
  };
  // 전역에 저장 (아이콘 클릭 시 재오픈용)
  radioLocalEvent = event;
  openRadioPopup(event);
  console.log('[radio] 로컬 이벤트 발사 - 정답 주파수:', freq, '/ 채널:', channel.label);
}

/**
 * OBJECT 테스트: 즉석 라디오 팝업 (스케줄 무시)
 */
function testRadioPopup() {
  if (!currentUser?.isAdmin) return;
  radioTestMode = true;
  const cfg = CONFIG.RADIO_CONFIG;
  const channel = cfg.CHANNELS[Math.floor(Math.random() * cfg.CHANNELS.length)];
  const freq = 10 + Math.floor(Math.random() * 80);
  const now = Date.now();
  const fakeEvent = {
    scheduledAt: now,
    windowEnd: now + 4 * 3600 * 1000,
    channelId: channel.id,
    freq,
    popped: false,
    matched: false,
    missed: false,
  };
  radioTestActiveEvent = fakeEvent;  // 전역 보관 (아이콘에서 참조)
  openRadioPopup(fakeEvent);
  console.log('[radio] 테스트 팝업 - 정답 주파수:', freq, '/ 채널:', channel.label);
}

/**
 * OBJECT가 모든 크루에게 라디오 신호 일괄 발송
 * - pet.adminRadioBroadcast 필드에 이벤트 정보 저장
 * - 각 크루가 onPetChange 받을 때 처리 (한 번만)
 */
async function broadcastRadioToAllCrew() {
  if (!currentUser?.isAdmin) return;
  if (!confirm('📡 모든 크루(TEEN/ADULT)에게 라디오 신호를 즉시 발사합니다.\n\n각 크루의 1시간 쿨다운을 무시하고 본인 화면에 라디오 팝업이 뜹니다. 계속할까요?')) return;

  const cfg = CONFIG.RADIO_CONFIG;
  const channel = cfg.CHANNELS[Math.floor(Math.random() * cfg.CHANNELS.length)];
  const freq = 10 + Math.floor(Math.random() * 80);
  const now = Date.now();
  const broadcastId = `bcast_${now}`;

  // pet에 broadcast 트리거 저장
  currentPet.adminRadioBroadcast = {
    id: broadcastId,
    sentAt: now,
    channelId: channel.id,
    freq,
    windowEnd: now + cfg.WINDOW_HOURS * 3600 * 1000,
  };

  try {
    await Backend.savePet(currentPet);
    await Backend.addLog({
      user: currentUser.name, action: 'RADIO',
      text: `📡 [관리자] 모든 크루에게 라디오 신호 발사: ${channel.label} (주파수 ${freq})`,
      type: 'admin',
      viewer: currentUser.name,
    });
    showToast(`📡 라디오 발사 완료 (주파수: ${freq})`, 'personality');
    console.log('[radio] 브로드캐스트 - 정답:', freq, '/ 채널:', channel.label);
  } catch (err) {
    console.error('[radio] 브로드캐스트 실패:', err);
    showToast('⚠ 발사 실패', 'warn');
  }
}

// ════════════════════════════════════════════════════════════
// 미니게임 허브 — 단계별 게임 해금
// ════════════════════════════════════════════════════════════

/**
 * 미니게임 메뉴 허브
 * - BABY까지: Up/Down만 (바로 실행)
 * - CHILD 이상: 선택 메뉴 (Up/Down + 블랙잭 + 틱택토)
 * - OBJECT: 테스트 모드 토글 버튼
 */
function showMinigameHub() {
  if (!currentPet || currentPet.isDead) return;
  const existing = document.getElementById('minigame-hub-modal');
  if (existing) { existing.remove(); return; }

  const stage = currentPet.stage;
  const stageUnlocked = (stage === 'CHILD' || stage === 'TEEN' || stage === 'ADULT');
  // 관리자 + 테스트 모드: 단계 무시하고 모두 언락
  const unlocked = stageUnlocked || (currentUser.isAdmin && minigameTestMode);

  // BABY는 바로 Up/Down 실행 (기존 동작 유지)
  if (!stageUnlocked && !currentUser.isAdmin) {
    showUpDownGame();
    return;
  }

  const reward = checkMinigameRewardEligibility();
  const isAdmin = currentUser.isAdmin;

  const modal = document.createElement('div');
  modal.id = 'minigame-hub-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = `
    <div class="talk-modal-head" style="background:#1a3d28;">
      <span>MINIGAME · 무엇을 할까?</span>
      <span class="talk-close" id="mghub-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:16px;">
      ${isAdmin ? `
        <div style="padding:8px 10px;margin-bottom:14px;border:1px dotted #e8a853;background:#1a1505;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:11px;color:#e8a853;">
            <input type="checkbox" id="mghub-testmode" ${minigameTestMode ? 'checked' : ''}>
            <span>OBJECT 테스트 모드 · ${minigameTestMode ? '<strong>켜짐</strong>' : '꺼짐'}</span>
          </label>
          <div style="color:#c9a06b;font-size:10px;margin-top:4px;line-height:1.5;">
            테스트 모드일 때는 스탯 변화, 로그 기록, 하루 카운트 모두 저장되지 않습니다.
          </div>
        </div>
      ` : ''}

      <div style="color:#8fb39a;font-size:11px;margin-bottom:12px;">
        MARS II가 함께 놀고 싶어해. 어떤 놀이?
        ${isAdmin && !stageUnlocked ? (minigameTestMode
          ? '<br><span style="color:#e8a853;font-size:10px;">(현재 ' + stage + ' 단계지만 테스트 모드로 전체 게임 열림)</span>'
          : '<br><span style="color:#666;font-size:10px;">(현재 ' + stage + ' 단계 · 테스트 모드를 켜면 블랙잭/틱택토도 열림)</span>'
        ) : ''}
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="mg-option" data-game="updown"
          style="padding:14px;background:#0a1410;border:1px solid #03B352;color:#03B352;
          font-family:inherit;font-size:13px;cursor:pointer;text-align:left;">
          <div style="font-weight:bold;">UP/DOWN · 숫자 맞추기</div>
          <div style="font-size:11px;color:#8fb39a;margin-top:4px;">
            1~30 사이 숫자를 7번 안에 맞추기
          </div>
        </button>

        <button class="mg-option ${!unlocked ? 'mg-locked' : ''}" data-game="blackjack"
          ${!unlocked ? 'disabled' : ''}
          style="padding:14px;background:${unlocked?'#0a1410':'#050505'};
          border:1px solid ${unlocked?'#5fb37a':'#333'};color:${unlocked?'#5fb37a':'#555'};
          font-family:inherit;font-size:13px;cursor:${unlocked?'pointer':'not-allowed'};text-align:left;">
          <div style="font-weight:bold;">
            BLACKJACK · 카드 놀이
            ${!unlocked ? ' <span style="float:right;font-size:10px;">🔒 CHILD부터</span>' : ''}
          </div>
          <div style="font-size:11px;color:${unlocked?'#8fb39a':'#444'};margin-top:4px;">
            21을 넘지 않게 카드를 뽑는다
          </div>
        </button>

        <button class="mg-option ${!unlocked ? 'mg-locked' : ''}" data-game="tictactoe"
          ${!unlocked ? 'disabled' : ''}
          style="padding:14px;background:${unlocked?'#0a1410':'#050505'};
          border:1px solid ${unlocked?'#e8a853':'#333'};color:${unlocked?'#e8a853':'#555'};
          font-family:inherit;font-size:13px;cursor:${unlocked?'pointer':'not-allowed'};text-align:left;">
          <div style="font-weight:bold;">
            TIC-TAC-TOE · 돌 놀이
            ${!unlocked ? ' <span style="float:right;font-size:10px;">🔒 CHILD부터</span>' : ''}
          </div>
          <div style="font-size:11px;color:${unlocked?'#c9a06b':'#444'};margin-top:4px;">
            3x3 격자에 먼저 줄을 긋는다
          </div>
        </button>

        <button class="mg-option ${!unlocked ? 'mg-locked' : ''}" data-game="maze"
          ${!unlocked ? 'disabled' : ''}
          style="padding:14px;background:${unlocked?'#0a1018':'#050505'};
          border:1px solid ${unlocked?'#7d9cb3':'#333'};color:${unlocked?'#7d9cb3':'#555'};
          font-family:inherit;font-size:13px;cursor:${unlocked?'pointer':'not-allowed'};text-align:left;">
          <div style="font-weight:bold;">
            MAZE · 미로 탐험 🌫
            ${!unlocked ? ' <span style="float:right;font-size:10px;">🔒 CHILD부터</span>' : ''}
          </div>
          <div style="font-size:11px;color:${unlocked?'#9ab3c9':'#444'};margin-top:4px;">
            안개 속 미로에서 출구를 찾는다 · 보물과 함정
          </div>
        </button>

        <button class="mg-option ${!unlocked ? 'mg-locked' : ''}" data-game="battle"
          ${!unlocked ? 'disabled' : ''}
          style="padding:14px;background:${unlocked?'#1a0a0e':'#050505'};
          border:1px solid ${unlocked?'#c97d5f':'#333'};color:${unlocked?'#c97d5f':'#555'};
          font-family:inherit;font-size:13px;cursor:${unlocked?'pointer':'not-allowed'};text-align:left;">
          <div style="font-weight:bold;">
            BATTLE · 다이스 결투 ⚔
            ${!unlocked ? ' <span style="float:right;font-size:10px;">🔒 CHILD부터</span>' : ''}
          </div>
          <div style="font-size:11px;color:${unlocked?'#c9a06b':'#444'};margin-top:4px;">
            MARS II와 1D10 다이스 결투 · 공격/방어/회피
          </div>
        </button>

        <button class="mg-option ${!unlocked ? 'mg-locked' : ''}" data-game="pvp"
          ${!unlocked ? 'disabled' : ''}
          style="padding:14px;background:${unlocked?'#0e0a18':'#050505'};
          border:1px solid ${unlocked?'#a87dc9':'#333'};color:${unlocked?'#a87dc9':'#555'};
          font-family:inherit;font-size:13px;cursor:${unlocked?'pointer':'not-allowed'};text-align:left;">
          <div style="font-weight:bold;">
            PvP BATTLE · 크루 결투 ⚔⚔
            ${!unlocked ? ' <span style="float:right;font-size:10px;">🔒 CHILD부터</span>' : ''}
          </div>
          <div style="font-size:11px;color:${unlocked?'#c9a8e0':'#444'};margin-top:4px;">
            다른 크루와 실시간 결투 · 로비/도전장
          </div>
        </button>
      </div>

      <div style="margin-top:14px;font-size:10px;color:#666;text-align:center;">
        ${reward.testMode
          ? '◆ 테스트 모드 (저장 안 됨)'
          : '◆ 보상 제한 없음'}
      </div>
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('mghub-close').addEventListener('click', () => modal.remove());

  // 테스트 모드 토글
  document.getElementById('mghub-testmode')?.addEventListener('change', (e) => {
    minigameTestMode = e.target.checked;
    modal.remove();
    setTimeout(showMinigameHub, 100);
  });

  // 게임 선택
  modal.querySelectorAll('.mg-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('mg-locked')) return;
      const game = btn.dataset.game;
      modal.remove();
      if (game === 'updown') showUpDownGame();
      else if (game === 'blackjack') showBlackjackGame();
      else if (game === 'tictactoe') showTicTacToeGame();
      else if (game === 'maze') showMazeGame();
      else if (game === 'battle') showBattleGame();
      else if (game === 'pvp') showPvpLobby();
    });
  });
}

// ════════════════════════════════════════════════════════════
// 블랙잭 (BLACKJACK)
// ════════════════════════════════════════════════════════════

// ── 블러핑 시스템 ─────────────────────────────────────
// 매 턴마다 표정/대사로 어필하되 때때로 거짓말
const BJ_BLUFF_MODES = ['honest', 'bluff', 'neutral'];
const BJ_BLUFF_WEIGHTS = [50, 35, 15];  // 정직 50%, 블러프 35%, 무표정 15%

// 표정 + 대사 풀 (어필 종류별)
const BJ_TELLS = {
  confident: {
    faces: ['( ̄ω ̄)', '(◔◡◔)', '(¬‿¬)'],
    lines: [
      '오, 괜찮은데?',
      '이번엔 자신 있어.',
      '히트?',
      '받아도 될까.',
      '후훗.',
      '나쁘지 않아.',
      '느낌이 와.',
    ],
  },
  worried: {
    faces: ['(>_<)', '( ;∀;)', '(；´д｀)'],
    lines: [
      '음... 어쩌지.',
      '별로야.',
      '이번엔 망했어.',
      '스탠드 할까.',
      '어떡해.',
      '안 좋아.',
      '못 받겠어.',
    ],
  },
  neutral: {
    faces: ['(-_-)', '(•_•)', '(´-ω-`)'],
    lines: [
      '...',
      '흠.',
      '글쎄.',
      '그냥.',
      '그러게.',
      '음.',
    ],
  },
};

/**
 * 점수 + 모드 → 어필 종류 결정
 *  - 정직(honest): 17+ confident, 12-16 neutral, ≤11 worried
 *  - 블러프(bluff): 17+ worried, 12-16 confident, ≤11 confident
 *  - 무표정(neutral): 항상 neutral
 */
function bjPickTell(dealerScore, mode) {
  if (mode === 'neutral') return 'neutral';
  if (mode === 'honest') {
    if (dealerScore >= 17) return 'confident';
    if (dealerScore >= 12) return 'neutral';
    return 'worried';
  }
  // bluff
  if (dealerScore >= 17) return 'worried';
  return 'confident';
}

function bjPickBluffMode() {
  const total = BJ_BLUFF_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < BJ_BLUFF_MODES.length; i++) {
    if (r < BJ_BLUFF_WEIGHTS[i]) return BJ_BLUFF_MODES[i];
    r -= BJ_BLUFF_WEIGHTS[i];
  }
  return 'honest';
}

function bjPickFromPool(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 블러프 모드 시 행동 확인 팝업
 * @param {string} action - '히트' or '스탠드'
 * @param {string} marsLine - MARS II의 현재 어필 대사
 * @returns {Promise<boolean>}
 */
function bjConfirmAction(action, marsLine) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.id = 'bj-confirm-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10001;
      display: flex; align-items: center; justify-content: center;
    `;
    overlay.innerHTML = `
      <div style="background: #050a07; border: 1px solid #5fb37a;
        box-shadow: 0 0 24px rgba(3,179,82,0.3); padding: 18px;
        max-width: 360px; width: 92vw; font-family: 'Courier New', monospace; color: #c9c9c9;">
        <div style="color: #e8a853; font-size: 12px; margin-bottom: 10px; letter-spacing: 1px;">
          &gt; ${action.toUpperCase()} 확정?
        </div>
        <div style="color: #8fb39a; font-size: 11px; margin-bottom: 14px; line-height: 1.6;">
          MARS II가 말했습니다:<br>
          <span style="color: #c9c9c9; font-style: italic;">"${marsLine || '...'}"</span>
        </div>
        <div style="color: #6b8f76; font-size: 10px; margin-bottom: 14px;">
          정말 ${action} 하시겠습니까?
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="bj-confirm-no" style="
            background: transparent; border: 1px solid #666; color: #888;
            padding: 6px 16px; font-family: inherit; font-size: 11px; cursor: pointer;">
            아니, 잠깐
          </button>
          <button id="bj-confirm-yes" style="
            background: #0a3818; border: 1px solid #03B352; color: #03B352;
            padding: 6px 16px; font-family: inherit; font-size: 11px; cursor: pointer;
            font-weight: bold;">
            ${action} 한다
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = (ok) => {
      overlay.remove();
      resolve(ok);
    };
    overlay.querySelector('#bj-confirm-yes').addEventListener('click', () => close(true));
    overlay.querySelector('#bj-confirm-no').addEventListener('click', () => close(false));
    // 바깥 클릭 시 취소
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
  });
}

/**
 * 현재 보이는 dealer 점수 + bluffMode 기준으로 어필 갱신
 * 플레이어가 카드 받을 때마다 다시 호출 → 자연스럽게 변화
 */
function bjUpdateTell(state) {
  // dealer 보이는 카드 1장 기준 점수 (실제 합과 다를 수 있음 - 블러프 강화)
  const visibleScore = bjHandValue(state.dealer);  // 모드 따라 어필 결정
  const tell = bjPickTell(visibleScore, state.bluffMode);
  state.currentTell = tell;
  state.currentFace = bjPickFromPool(BJ_TELLS[tell].faces);
  state.currentLine = bjPickFromPool(BJ_TELLS[tell].lines);
}

const BJ_SUITS = ['♠', '♥', '♦', '♣'];
const BJ_RANKS = [
  { r: 'A', v: 11 }, { r: '2', v: 2 }, { r: '3', v: 3 }, { r: '4', v: 4 },
  { r: '5', v: 5 }, { r: '6', v: 6 }, { r: '7', v: 7 }, { r: '8', v: 8 },
  { r: '9', v: 9 }, { r: '10', v: 10 }, { r: 'J', v: 10 }, { r: 'Q', v: 10 },
  { r: 'K', v: 10 },
];

function bjMakeDeck() {
  const deck = [];
  for (const s of BJ_SUITS) {
    for (const rk of BJ_RANKS) {
      deck.push({ suit: s, rank: rk.r, val: rk.v });
    }
  }
  // 셔플
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function bjHandValue(hand) {
  let sum = hand.reduce((s, c) => s + c.val, 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  // 에이스 값 조정 (11 → 1)
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

function showBlackjackGame() {
  if (!currentPet || currentPet.isDead) return;
  const existing = document.getElementById('minigame-modal');
  if (existing) existing.remove();

  const state = {
    deck: bjMakeDeck(),
    player: [],
    dealer: [],
    phase: 'player',  // 'player' | 'dealer' | 'done'
    result: null,     // 'blackjack' | 'win' | 'push' | 'lose' | 'bust'
    hideDealer: true,
    animating: false,
    reward: checkMinigameRewardEligibility(),
    // 블러핑
    bluffMode: bjPickBluffMode(),  // 'honest' | 'bluff' | 'neutral'
    currentTell: null,              // 'confident' | 'worried' | 'neutral'
    currentFace: '',
    currentLine: '',
    bluffRevealed: false,           // 결과 공개 시 블러프 폭로 여부
  };

  // 초기 2장씩 배분
  state.player.push(state.deck.pop(), state.deck.pop());
  state.dealer.push(state.deck.pop(), state.deck.pop());

  // 초기 어필 갱신 (보이는 카드 1장 기준)
  bjUpdateTell(state);

  // 블랙잭 즉시 판정
  const pv = bjHandValue(state.player);
  const dv = bjHandValue(state.dealer);
  if (pv === 21 && dv === 21) {
    state.phase = 'done';
    state.result = 'push';
    state.hideDealer = false;
  } else if (pv === 21) {
    state.phase = 'done';
    state.result = 'blackjack';
    state.hideDealer = false;
  } else if (dv === 21) {
    state.phase = 'done';
    state.result = 'lose';
    state.hideDealer = false;
  }

  const modal = document.createElement('div');
  modal.id = 'minigame-modal';
  modal.className = 'talk-modal';
  renderBlackjack(modal, state);

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  attachBlackjackHandlers(modal, state);

  // 시작 즉시 블랙잭이면 보상 처리
  if (state.phase === 'done') {
    setTimeout(() => onBlackjackFinish(state), 400);
  }
}

function renderBlackjack(modal, state) {
  const pv = bjHandValue(state.player);
  const dv = state.hideDealer
    ? state.dealer[0].val + (state.dealer[0].rank === 'A' ? 0 : 0) // 노출된 카드만
    : bjHandValue(state.dealer);

  const isTest = isMinigameTestMode();

  modal.innerHTML = `
    <div class="talk-modal-head" style="background:#1a3d28;">
      <span>BLACKJACK ${isTest ? '· <span style="color:#e8a853;">[TEST]</span>' : ''}</span>
      <span class="talk-close" id="bj-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:14px;">

      <!-- 딜러 -->
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="color:#8fb39a;font-size:11px;">
            MARS II · ${state.hideDealer ? '?' : dv}
          </span>
          ${!state.hideDealer && state.bluffRevealed && state.bluffMode === 'bluff' ? `
            <span style="color:#e8a853;font-size:10px;font-weight:bold;letter-spacing:1px;">⚡ BLUFF!</span>
          ` : ''}
        </div>
        <div class="bj-hand" id="bj-dealer-hand" style="display:flex;gap:8px;flex-wrap:wrap;">
          ${state.dealer.map((c, i) => bjCardHTML(c, i === 1 && state.hideDealer)).join('')}
        </div>

        <!-- 블러핑 어필 (player 페이즈에만 보임) -->
        ${state.phase === 'player' && state.currentFace ? `
          <div style="margin-top:10px;padding:8px 12px;background:#0a1410;border-left:2px solid #5fb37a;display:flex;align-items:center;gap:12px;">
            <span style="font-family:monospace;font-size:18px;color:#03B352;min-width:80px;text-align:center;">${state.currentFace}</span>
            <span style="color:#c9c9c9;font-size:11px;font-style:italic;">"${state.currentLine}"</span>
          </div>
        ` : ''}
      </div>

      <!-- 구분선 -->
      <div style="border-top:1px dotted #2d5a3e;margin:14px 0;"></div>

      <!-- 플레이어 -->
      <div style="margin-bottom:14px;">
        <div style="color:#03B352;font-size:11px;margin-bottom:6px;">
          ${currentUser.name} · <strong>${pv}</strong>
          ${pv > 21 ? '<span style="color:#ff6b6b;"> · BUST</span>' : ''}
          ${pv === 21 && state.player.length === 2 ? '<span style="color:#e8a853;"> · BLACKJACK!</span>' : ''}
        </div>
        <div class="bj-hand" id="bj-player-hand" style="display:flex;gap:8px;flex-wrap:wrap;">
          ${state.player.map(c => bjCardHTML(c)).join('')}
        </div>
      </div>

      ${state.phase === 'done' ? bjResultBlock(state) : `
        <div style="display:flex;gap:6px;margin-top:14px;">
          <button id="bj-hit"
            style="flex:1;background:#0a3818;border:1px solid #03B352;color:#03B352;
            padding:12px;font-family:inherit;font-size:12px;cursor:pointer;">
            [H] 히트
          </button>
          <button id="bj-stand"
            style="flex:1;background:transparent;border:1px solid #e8a853;color:#e8a853;
            padding:12px;font-family:inherit;font-size:12px;cursor:pointer;">
            [S] 스탠드
          </button>
        </div>
      `}
    </div>
  `;
}

function bjCardHTML(card, hidden = false) {
  if (hidden) {
    return `<div class="bj-card bj-card-back" style="width:56px;height:78px;border:1px solid #5fb37a;background:#050a07;display:flex;align-items:center;justify-content:center;font-family:monospace;color:#2d5a3e;font-size:20px;">?</div>`;
  }
  const red = card.suit === '♥' || card.suit === '♦';
  return `<div class="bj-card" style="width:56px;height:78px;border:1px solid #5fb37a;background:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:4px;font-family:monospace;color:${red?'#c93030':'#000'};">
    <div style="font-size:14px;font-weight:bold;">${card.rank}</div>
    <div style="font-size:22px;text-align:center;">${card.suit}</div>
    <div style="font-size:11px;text-align:right;transform:rotate(180deg);">${card.rank}</div>
  </div>`;
}

function bjResultBlock(state) {
  const pv = bjHandValue(state.player);
  const dv = bjHandValue(state.dealer);
  const resultMeta = {
    blackjack: { label: '◆ BLACKJACK!', color: '#e8a853', bg: '#1a1505', story: 'MARS II가 입을 벌리며 환호한다.' },
    win:       { label: '◆ 승리!',       color: '#03B352', bg: '#0a1410', story: 'MARS II가 손뼉을 친다.' },
    push:      { label: '◇ 무승부',      color: '#8fb39a', bg: '#0a1410', story: '둘 다 고개를 끄덕인다.' },
    lose:      { label: '◇ 패배',        color: '#8fb39a', bg: '#0a1410', story: 'MARS II가 슬쩍 미소짓는다.' },
    bust:      { label: '✕ 버스트',      color: '#ff6b6b', bg: '#1a0505', story: '"21을 넘어갔네." MARS II가 다독인다.' },
  };
  const m = resultMeta[state.result] || resultMeta.push;

  // 블러프 폭로 메시지
  let bluffReveal = '';
  if (state.bluffMode === 'bluff') {
    state.bluffRevealed = true;
    if (state.currentTell === 'worried') {
      bluffReveal = '"사실은 자신 있었어. 들켰니?"';
    } else if (state.currentTell === 'confident') {
      bluffReveal = '"엄청 떨고 있었거든. 못 알아챘구나."';
    }
  } else if (state.bluffMode === 'honest' && state.bluffIntuited) {
    bluffReveal = '"내 표정이 그렇게 솔직했어?"';
  }

  return `
    <div style="padding:12px;border:1px solid ${m.color};background:${m.bg};margin-top:14px;text-align:center;">
      <div style="color:${m.color};font-size:14px;font-weight:bold;margin-bottom:4px;">${m.label}</div>
      <div style="color:#c9c9c9;font-size:11px;">${m.story}</div>
      <div style="color:#666;font-size:10px;margin-top:6px;">당신 ${pv} · MARS II ${dv}</div>
      ${bluffReveal ? `<div style="color:#e8a853;font-size:11px;margin-top:8px;font-style:italic;">${bluffReveal}</div>` : ''}
      ${state.bluffBonusApplied ? `<div style="color:#5fb37a;font-size:10px;margin-top:4px;">+ 블러프 간파 보너스: intel +2</div>` : ''}
      ${state.rewardText ? `<div style="color:#c9a06b;font-size:11px;margin-top:6px;">${state.rewardText}</div>` : ''}
      ${isMinigameTestMode() ? `<div style="color:#e8a853;font-size:10px;margin-top:4px;">[TEST · 저장 안 됨]</div>` : ''}
    </div>
    <div style="display:flex;gap:6px;margin-top:10px;">
      <button id="bj-again"
        style="flex:1;background:#0a3818;border:1px solid #03B352;color:#03B352;padding:10px;cursor:pointer;font-family:inherit;font-size:12px;">
        다시 하기
      </button>
      <button id="bj-back"
        style="flex:1;background:transparent;border:1px solid #2d5a3e;color:#8fb39a;padding:10px;cursor:pointer;font-family:inherit;font-size:12px;">
        메뉴로
      </button>
    </div>
  `;
}

function attachBlackjackHandlers(modal, state) {
  document.getElementById('bj-close')?.addEventListener('click', () => modal.remove());

  document.getElementById('bj-hit')?.addEventListener('click', async () => {
    if (state.animating || state.phase !== 'player') return;
    // 블러프 모드일 때 확인 팝업 (긴장 추가용)
    if (state.bluffMode === 'bluff') {
      const ok = await bjConfirmAction('히트', state.currentLine);
      if (!ok) return;
    }
    state.animating = true;
    state.player.push(state.deck.pop());
    const pv = bjHandValue(state.player);
    if (pv > 21) {
      state.phase = 'done';
      state.result = 'bust';
      state.hideDealer = false;
      await onBlackjackFinish(state);
    } else if (pv === 21) {
      // 자동 스탠드
      state.phase = 'dealer';
      await bjDealerTurn(state);
    } else {
      // 히트 후 다음 턴: 새 블러핑 모드 + 어필 갱신 (자연스러운 변동)
      state.bluffMode = bjPickBluffMode();
      bjUpdateTell(state);
    }
    state.animating = false;
    renderBlackjack(modal, state);
    attachBlackjackHandlers(modal, state);
  });

  document.getElementById('bj-stand')?.addEventListener('click', async () => {
    if (state.animating || state.phase !== 'player') return;
    // 블러프 모드일 때 확인 팝업
    if (state.bluffMode === 'bluff') {
      const ok = await bjConfirmAction('스탠드', state.currentLine);
      if (!ok) return;
    }
    state.animating = true;
    state.phase = 'dealer';
    state.hideDealer = false;
    await bjDealerTurn(state);
    state.animating = false;
    renderBlackjack(modal, state);
    attachBlackjackHandlers(modal, state);
  });

  document.getElementById('bj-again')?.addEventListener('click', () => {
    modal.remove();
    showBlackjackGame();
  });

  document.getElementById('bj-back')?.addEventListener('click', () => {
    modal.remove();
    showMinigameHub();
  });
}

async function bjDealerTurn(state) {
  // 결과 페이즈 진입 - 딜러 카드 공개 보장
  state.hideDealer = false;

  // 딜러는 17 이상까지 히트
  while (bjHandValue(state.dealer) < 17) {
    await new Promise(r => setTimeout(r, 400));
    state.dealer.push(state.deck.pop());
  }
  const pv = bjHandValue(state.player);
  const dv = bjHandValue(state.dealer);

  state.phase = 'done';
  if (dv > 21 || pv > dv) state.result = 'win';
  else if (pv === dv) state.result = 'push';
  else state.result = 'lose';

  await onBlackjackFinish(state);
}

async function onBlackjackFinish(state) {
  const rewards = CONFIG.MINIGAME_CONFIG.BLACKJACK.REWARDS;
  const reward = rewards[state.result];
  if (!reward) return;

  // 블러프 간파 보너스 판정
  // - 블러프 모드였고, 플레이어가 이김 = 간파 성공
  // - 블러프 모드였고 졌어도 dealer가 망한 경우(고득점인 척 했는데 사실 약했음) 등 일부 인정
  state.bluffBonusApplied = false;
  if (state.bluffMode === 'bluff' && (state.result === 'win' || state.result === 'blackjack')) {
    state.bluffBonusApplied = true;
  }

  // 테스트 모드: 저장 스킵
  if (isMinigameTestMode()) {
    state.rewardText = '(테스트 모드 · 저장 안 됨)';
    return;
  }

  // 일반 모드: 보상 한도 체크
  if (!state.reward.eligible) {
    state.rewardText = '(오늘 보상 한도 초과)';
    await Backend.addLog({
      user: currentUser.name, action: 'MINIGAME',
      text: `블랙잭 ${state.result} (보상 없음)`,
      type: 'system',
    });
    return;
  }

  // 보상 적용
  const parts = [];
  for (const [key, val] of Object.entries(reward)) {
    if (key === 'personality') continue;
    if (currentPet[key] !== undefined) {
      currentPet[key] = Math.max(0, Math.min(100, currentPet[key] + val));
      parts.push(`${key} ${val > 0 ? '+' : ''}${val}`);
    }
  }
  if (reward.personality) {
    currentPet.personality = currentPet.personality || {};
    for (const [axis, d] of Object.entries(reward.personality)) {
      currentPet.personality[axis] = Math.max(-100, Math.min(100, (currentPet.personality[axis] || 0) + d));
      const label = { activeVsCalm:d<0?'차분':'활발', socialVsIntro:d<0?'내향':'사교', greedVsTemperance:d<0?'절제':'탐욕', diligentVsFree:d<0?'자유':'성실' }[axis];
      if (label) parts.push(`${label} ${d > 0 ? '+' : ''}${d}`);
    }
  }

  // 블러프 간파 보너스: intel +2
  if (state.bluffBonusApplied) {
    currentPet.intel = Math.min(100, (currentPet.intel || 0) + 2);
    parts.push('intel +2 (간파)');
  }

  state.rewardText = parts.join(', ');
  await incrementMinigameCount();
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'MINIGAME',
    text: `블랙잭 ${state.result} → ${state.rewardText}`,
    type: 'system',
  });
}

// ════════════════════════════════════════════════════════════
// 틱택토 (TIC-TAC-TOE)
// ════════════════════════════════════════════════════════════

function showTicTacToeGame() {
  if (!currentPet || currentPet.isDead) return;
  const existing = document.getElementById('minigame-modal');
  if (existing) existing.remove();

  const state = {
    board: [null, null, null, null, null, null, null, null, null],
    turn: 'player',  // 'player' | 'ai' | 'done'
    result: null,    // 'win' | 'draw' | 'lose'
    winLine: null,
    reward: checkMinigameRewardEligibility(),
  };

  const modal = document.createElement('div');
  modal.id = 'minigame-modal';
  modal.className = 'talk-modal';
  renderTicTacToe(modal, state);

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  attachTicTacToeHandlers(modal, state);
}

function ttCheckWinner(board) {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6],
  ];
  for (const line of lines) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(v => v !== null)) return { winner: 'draw', line: null };
  return null;
}

// 간단한 minimax (완벽)
function ttMinimax(board, aiMark, playerMark, maximizing) {
  const res = ttCheckWinner(board);
  if (res) {
    if (res.winner === aiMark) return 10;
    if (res.winner === playerMark) return -10;
    return 0;
  }
  const best = maximizing ? -Infinity : Infinity;
  let bestScore = best;
  const mark = maximizing ? aiMark : playerMark;
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = mark;
      const s = ttMinimax(board, aiMark, playerMark, !maximizing);
      board[i] = null;
      bestScore = maximizing ? Math.max(bestScore, s) : Math.min(bestScore, s);
    }
  }
  return bestScore;
}

function ttChooseMove(board, aiMark, playerMark) {
  const cfg = CONFIG.MINIGAME_CONFIG.TICTACTOE;
  const empties = [];
  for (let i = 0; i < 9; i++) if (board[i] === null) empties.push(i);
  if (empties.length === 0) return -1;

  // 확률적으로 랜덤/최적
  if (Math.random() > cfg.AI_OPTIMAL_RATE) {
    return empties[Math.floor(Math.random() * empties.length)];
  }

  // 최적수 탐색
  let bestScore = -Infinity;
  let bestMove = empties[0];
  for (const i of empties) {
    board[i] = aiMark;
    const s = ttMinimax(board, aiMark, playerMark, false);
    board[i] = null;
    if (s > bestScore) {
      bestScore = s;
      bestMove = i;
    }
  }
  return bestMove;
}

function renderTicTacToe(modal, state) {
  const isTest = isMinigameTestMode();
  const done = state.turn === 'done';

  // 셀 렌더
  const cellsHtml = state.board.map((cell, i) => {
    const inWinLine = state.winLine && state.winLine.includes(i);
    const color = inWinLine ? '#e8a853' : cell === 'O' ? '#03B352' : cell === 'X' ? '#5fb37a' : '#2d5a3e';
    const bg = inWinLine ? '#1a1505' : '#050a07';
    const clickable = !done && state.turn === 'player' && cell === null;
    return `
      <div class="tt-cell" data-idx="${i}"
        style="width:60px;height:60px;border:1px solid #2d5a3e;background:${bg};
        display:flex;align-items:center;justify-content:center;
        font-family:monospace;font-size:28px;font-weight:bold;color:${color};
        cursor:${clickable?'pointer':'default'};">
        ${cell || (clickable ? `<span style="color:#333;font-size:12px;">${i+1}</span>` : '')}
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="talk-modal-head" style="background:#3a2a05;">
      <span>TIC-TAC-TOE ${isTest ? '· <span style="color:#e8a853;">[TEST]</span>' : ''}</span>
      <span class="talk-close" id="tt-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:14px;">
      <div style="color:#8fb39a;font-size:11px;margin-bottom:8px;text-align:center;">
        당신: <span style="color:#03B352;">O</span>   ·   MARS II: <span style="color:#5fb37a;">X</span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3, 60px);gap:2px;justify-content:center;margin:14px 0;">
        ${cellsHtml}
      </div>

      <div style="text-align:center;font-size:11px;color:${done?'#e8a853':'#8fb39a'};min-height:20px;">
        ${done
          ? (state.result === 'win' ? '◆ 당신이 이겼다! MARS II가 웃는다.'
            : state.result === 'draw' ? '◇ 비겼다. 둘 다 고개를 끄덕인다.'
            : '◇ MARS II가 이겼다. "한 번 더 할까?"')
          : (state.turn === 'player' ? '▶ 당신의 차례' : '… MARS II가 생각 중')}
      </div>

      ${done ? `
        ${state.rewardText ? `<div style="color:#c9a06b;font-size:11px;margin-top:10px;text-align:center;">${state.rewardText}</div>` : ''}
        ${isTest ? `<div style="color:#e8a853;font-size:10px;text-align:center;margin-top:4px;">[TEST · 저장 안 됨]</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:14px;">
          <button id="tt-again"
            style="flex:1;background:#3a2a05;border:1px solid #e8a853;color:#e8a853;padding:10px;cursor:pointer;font-family:inherit;font-size:12px;">
            다시 하기
          </button>
          <button id="tt-back"
            style="flex:1;background:transparent;border:1px solid #2d5a3e;color:#8fb39a;padding:10px;cursor:pointer;font-family:inherit;font-size:12px;">
            메뉴로
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function attachTicTacToeHandlers(modal, state) {
  document.getElementById('tt-close')?.addEventListener('click', () => modal.remove());

  if (state.turn === 'player') {
    modal.querySelectorAll('.tt-cell').forEach(cell => {
      cell.addEventListener('click', async () => {
        const idx = parseInt(cell.dataset.idx);
        if (state.board[idx] !== null || state.turn !== 'player') return;
        state.board[idx] = 'O';

        // 플레이어 수로 판정
        const r = ttCheckWinner(state.board);
        if (r) {
          state.turn = 'done';
          state.winLine = r.line;
          state.result = r.winner === 'O' ? 'win' : 'draw';
          await onTicTacToeFinish(state);
          renderTicTacToe(modal, state);
          attachTicTacToeHandlers(modal, state);
          return;
        }

        // AI 턴
        state.turn = 'ai';
        renderTicTacToe(modal, state);
        attachTicTacToeHandlers(modal, state);

        await new Promise(r2 => setTimeout(r2, 700));
        const aiMove = ttChooseMove(state.board.slice(), 'X', 'O');
        if (aiMove >= 0) {
          state.board[aiMove] = 'X';
        }
        const r3 = ttCheckWinner(state.board);
        if (r3) {
          state.turn = 'done';
          state.winLine = r3.line;
          state.result = r3.winner === 'X' ? 'lose' : 'draw';
          await onTicTacToeFinish(state);
        } else {
          state.turn = 'player';
        }
        renderTicTacToe(modal, state);
        attachTicTacToeHandlers(modal, state);
      });
    });
  }

  document.getElementById('tt-again')?.addEventListener('click', () => {
    modal.remove();
    showTicTacToeGame();
  });

  document.getElementById('tt-back')?.addEventListener('click', () => {
    modal.remove();
    showMinigameHub();
  });
}

async function onTicTacToeFinish(state) {
  const rewards = CONFIG.MINIGAME_CONFIG.TICTACTOE.REWARDS;
  const reward = rewards[state.result];
  if (!reward) return;

  if (isMinigameTestMode()) {
    state.rewardText = '(테스트 모드 · 저장 안 됨)';
    return;
  }

  if (!state.reward.eligible) {
    state.rewardText = '(오늘 보상 한도 초과)';
    await Backend.addLog({
      user: currentUser.name, action: 'MINIGAME',
      text: `틱택토 ${state.result} (보상 없음)`,
      type: 'system',
    });
    return;
  }

  const parts = [];
  for (const [key, val] of Object.entries(reward)) {
    if (key === 'personality') continue;
    if (currentPet[key] !== undefined) {
      currentPet[key] = Math.max(0, Math.min(100, currentPet[key] + val));
      parts.push(`${key} ${val > 0 ? '+' : ''}${val}`);
    }
  }
  if (reward.personality) {
    currentPet.personality = currentPet.personality || {};
    for (const [axis, d] of Object.entries(reward.personality)) {
      currentPet.personality[axis] = Math.max(-100, Math.min(100, (currentPet.personality[axis] || 0) + d));
      const label = { activeVsCalm:d<0?'차분':'활발', socialVsIntro:d<0?'내향':'사교', greedVsTemperance:d<0?'절제':'탐욕', diligentVsFree:d<0?'자유':'성실' }[axis];
      if (label) parts.push(`${label} ${d > 0 ? '+' : ''}${d}`);
    }
  }

  state.rewardText = parts.join(', ');
  await incrementMinigameCount();
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'MINIGAME',
    text: `틱택토 ${state.result} → ${state.rewardText}`,
    type: 'system',
  });
}


// ════════════════════════════════════════════════════════════
// MAZE - 미로 탐험 (포그 오브 워 + 랜덤 생성)
// ════════════════════════════════════════════════════════════

/**
 * 단계별 미로 크기/난이도
 */
function getMazeConfig() {
  const stage = currentPet?.stage || 'CHILD';
  const map = {
    CHILD: { size: 8,  turns: 40, treasures: 2, traps: 2 },
    TEEN:  { size: 10, turns: 55, treasures: 3, traps: 3 },
    ADULT: { size: 12, turns: 75, treasures: 4, traps: 4 },
  };
  return map[stage] || map.CHILD;
}

/**
 * 랜덤 미로 생성 (DFS backtracking, odd-cell wall structure)
 * @param {number} N - 그리드 크기 (홀수 권장; 짝수 들어와도 동작)
 * @returns {string[][]} 2D 배열 ('█'=벽, '·'=길)
 */
function generateMaze(N) {
  // N을 홀수로 보정
  if (N % 2 === 0) N += 1;

  // 전부 벽으로 초기화
  const grid = Array.from({ length: N }, () => Array(N).fill('█'));

  // DFS 시작: (1,1)에서 출발
  const stack = [[1, 1]];
  grid[1][1] = '·';
  const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];

  while (stack.length > 0) {
    const [x, y] = stack[stack.length - 1];
    // 가능한 방향 (인접 2칸이 벽인 곳)
    const options = dirs
      .map(([dx, dy]) => [x + dx, y + dy, dx, dy])
      .filter(([nx, ny]) =>
        nx > 0 && nx < N - 1 && ny > 0 && ny < N - 1 && grid[ny][nx] === '█'
      );
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    // 랜덤 방향 선택
    const [nx, ny, dx, dy] = options[Math.floor(Math.random() * options.length)];
    // 사이 벽도 뚫기
    grid[y + dy / 2][x + dx / 2] = '·';
    grid[ny][nx] = '·';
    stack.push([nx, ny]);
  }

  return grid;
}

/**
 * BFS로 두 점 간 최단거리 (보물/함정/출구 배치 시 도달 가능 보장)
 */
function bfsDistance(grid, sx, sy, ex, ey) {
  const N = grid.length;
  const visited = Array.from({ length: N }, () => Array(N).fill(false));
  const queue = [[sx, sy, 0]];
  visited[sy][sx] = true;
  while (queue.length) {
    const [x, y, d] = queue.shift();
    if (x === ex && y === ey) return d;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < N && ny >= 0 && ny < N && !visited[ny][nx] && grid[ny][nx] !== '█') {
        visited[ny][nx] = true;
        queue.push([nx, ny, d + 1]);
      }
    }
  }
  return -1;
}

/**
 * 미로에 보물/함정/출구 배치
 */
function populateMaze(grid, treasures, traps) {
  const N = grid.length;
  // 빈 칸들 수집 (시작점 제외)
  const empties = [];
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      if (grid[y][x] === '·' && !(x === 1 && y === 1)) {
        empties.push([x, y]);
      }
    }
  }
  // 셔플
  empties.sort(() => Math.random() - 0.5);

  // 출구: 시작점에서 가장 먼 쪽 (오른쪽 아래 코너 근처 우선)
  let exit = null;
  let maxDist = -1;
  for (const [x, y] of empties) {
    const d = bfsDistance(grid, 1, 1, x, y);
    // 오른쪽 아래로 갈수록 가산점
    const score = d + (x + y) * 0.3;
    if (score > maxDist) {
      maxDist = score;
      exit = [x, y];
    }
  }
  if (!exit) exit = empties[0];

  const exitIdx = empties.findIndex(([x, y]) => x === exit[0] && y === exit[1]);
  if (exitIdx >= 0) empties.splice(exitIdx, 1);

  const treasureCells = empties.splice(0, treasures);
  const trapCells = empties.splice(0, traps);

  return { exit, treasures: treasureCells, traps: trapCells };
}

function showMazeGame() {
  if (!currentPet || currentPet.isDead) return;
  const existing = document.getElementById('minigame-modal');
  if (existing) { existing.remove(); return; }

  const cfg = getMazeConfig();
  const grid = generateMaze(cfg.size);
  const N = grid.length;  // 홀수 보정 후 실제 크기
  const placement = populateMaze(grid, cfg.treasures, cfg.traps);

  const state = {
    grid, N,
    px: 1, py: 1,
    exit: placement.exit,
    treasures: placement.treasures,  // [[x,y], ...]
    traps: placement.traps,
    visited: new Set(['1,1']),       // 방문한 칸 (포그 오브 워)
    collectedTreasures: 0,
    triggeredTraps: 0,
    turnsLeft: cfg.turns,
    maxTurns: cfg.turns,
    cleared: false,
    failed: false,
    rewardText: '',
    lastEvent: null,  // 'treasure' | 'trap' | null
  };

  const modal = document.createElement('div');
  modal.id = 'minigame-modal';
  modal.className = 'maze-popup';
  renderMazeGame(modal, state);

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }
  attachMazeHandlers(modal, state);
}

/**
 * 시야 안에 있는 칸인지 (체비셰프 거리 ≤ 2)
 */
function isInSight(state, x, y) {
  const dx = Math.abs(x - state.px);
  const dy = Math.abs(y - state.py);
  return Math.max(dx, dy) <= 2;
}

function isVisited(state, x, y) {
  return state.visited.has(`${x},${y}`);
}

function renderMazeGame(modal, state) {
  const isTest = isMinigameTestMode();
  const N = state.N;

  // 결과 영역 (CMD 터미널 라인)
  let resultHTML = '';
  if (state.cleared) {
    const turnsUsed = state.maxTurns - state.turnsLeft;
    const speed = state.turnsLeft / state.maxTurns;
    let label, color;
    if (speed > 0.5) { label = '◆ 완벽 클리어!'; color = '#03B352'; }
    else if (speed > 0) { label = '◆ 클리어'; color = '#5fb37a'; }
    else { label = '◇ 아슬한 탈출'; color = '#e8a853'; }
    resultHTML = `
      <div class="maze-terminal-line good" style="color:${color};font-weight:bold;">&gt; ${label}</div>
      <div class="maze-terminal-line">&gt; ${turnsUsed}턴 사용 · 보물 ${state.collectedTreasures}개 · 함정 ${state.triggeredTraps}회</div>
      <div class="maze-terminal-line dim">&gt; 보상: ${state.rewardText}</div>
    `;
  } else if (state.failed) {
    resultHTML = `
      <div class="maze-terminal-line warn">&gt; ✕ 길을 잃었다</div>
      <div class="maze-terminal-line dim">&gt; 턴 소진 · 보물 ${state.collectedTreasures}개만 회수</div>
      <div class="maze-terminal-line dim">&gt; 보상: ${state.rewardText}</div>
    `;
  } else {
    // 진행 중 안내
    resultHTML = `
      <div class="maze-terminal-line">&gt; 알 수 없는 미로. 출구를 찾아 이동.</div>
      <div class="maze-terminal-line dim">&gt; 남은 시간: ${state.turnsLeft}턴 / 시야 2칸</div>
    `;
    if (state.lastEvent === 'treasure') {
      resultHTML += `<div class="maze-terminal-line good">&gt; ✦ 보물 발견! 별 +1</div>`;
    } else if (state.lastEvent === 'trap') {
      resultHTML += `<div class="maze-terminal-line warn">&gt; ⚠ 함정 발동. 턴 -2</div>`;
    } else {
      resultHTML += `<div class="maze-terminal-line dim">&gt; 안개가 짙다...</div>`;
    }
  }

  // 그리드 생성 (CSS grid 기반)
  const showAll = state.cleared || state.failed;
  let gridHTML = `<div class="maze-grid" style="grid-template-columns:repeat(${N},1fr);">`;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const inSight = isInSight(state, x, y);
      const visited = isVisited(state, x, y);

      const isExit = state.exit[0] === x && state.exit[1] === y;
      const isTreasure = state.treasures.some(([tx, ty]) => tx === x && ty === y);
      const isTrap = state.traps.some(([tx, ty]) => tx === x && ty === y);
      const isPlayer = state.px === x && state.py === y;
      const isWall = state.grid[y][x] === '█';

      // 안개 (방문 안 했고 시야 밖)
      if (!visited && !inSight && !showAll) {
        gridHTML += `<div class="maze-cell maze-fog"></div>`;
        continue;
      }

      // 셀 종류 결정
      let cls = 'maze-cell';
      let inner = '';
      if (isPlayer) {
        cls += ' maze-player';
        inner = '@';
      } else if (isExit && (inSight || showAll || visited)) {
        cls += ' maze-exit';
        inner = 'E';
      } else if (isTreasure && (inSight || showAll)) {
        cls += ' maze-treasure';
        inner = '★';
      } else if (isTrap && (inSight || showAll)) {
        cls += ' maze-trap';
        inner = '▲';
      } else if (isWall) {
        cls += ' maze-wall';
      } else {
        // 빈 길 - 시야 안 vs 방문만
        cls += inSight ? ' maze-path' : ' maze-path-dim';
      }
      gridHTML += `<div class="${cls}">${inner}</div>`;
    }
  }
  gridHTML += `</div>`;

  const done = state.cleared || state.failed;

  modal.innerHTML = `
    <div class="maze-popup-head">
      <span>&gt; MAZE.EXE · ${N}x${N} ${isTest ? '· <span style="color:#e8a853;">[TEST]</span>' : ''}</span>
      <span class="maze-close" id="mz-close" title="닫기">─ _ ✕</span>
    </div>
    <div class="maze-popup-body">
      ${resultHTML}

      <!-- 상태 바 (라디오 SIGNAL 라인 흉내) -->
      <div class="maze-stat-row">
        <span class="maze-stat-label">TURN</span>
        <div class="maze-stat-bars">
          ${(() => {
            const segs = 10;
            const ratio = Math.max(0, state.turnsLeft / state.maxTurns);
            const filled = Math.ceil(ratio * segs);
            return Array.from({length: segs}, (_, i) =>
              `<span class="maze-bar ${i < filled ? 'on' : ''}"></span>`
            ).join('');
          })()}
        </div>
        <span class="maze-stat-value">${state.turnsLeft}/${state.maxTurns}</span>
      </div>

      <div class="maze-stat-row">
        <span class="maze-stat-label">★ ${state.collectedTreasures}</span>
        <span class="maze-stat-divider">·</span>
        <span class="maze-stat-label warn">▲ ${state.triggeredTraps}</span>
      </div>

      <!-- 그리드 -->
      ${gridHTML}

      ${!done ? `
        <!-- 이동 컨트롤 -->
        <div class="maze-controls">
          <div></div>
          <button class="maze-btn" data-dir="up">↑</button>
          <div></div>
          <button class="maze-btn" data-dir="left">←</button>
          <button class="maze-btn maze-btn-center" data-dir="" disabled>· · ·</button>
          <button class="maze-btn" data-dir="right">→</button>
          <div></div>
          <button class="maze-btn" data-dir="down">↓</button>
          <div></div>
        </div>
        <div class="maze-terminal-line dim" style="text-align:center;margin-top:6px;">
          &gt; @ MARS II · ★ 보물 · ▲ 함정 · E 출구
        </div>
      ` : `
        <div class="maze-actions">
          <button id="mz-again" class="maze-btn-action">다시 도전</button>
          <button id="mz-back" class="maze-btn-action secondary">메뉴로</button>
        </div>
      `}
    </div>
  `;
}

function attachMazeHandlers(modal, state) {
  document.getElementById('mz-close')?.addEventListener('click', () => modal.remove());

  modal.querySelectorAll('.maze-btn').forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => {
      if (state.cleared || state.failed) return;
      const dir = btn.dataset.dir;
      if (!dir) return;
      const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      handleMazeMove(modal, state, dx, dy);
    });
  });

  document.getElementById('mz-again')?.addEventListener('click', () => {
    modal.remove();
    setTimeout(showMazeGame, 100);
  });
  document.getElementById('mz-back')?.addEventListener('click', () => {
    modal.remove();
    showMinigameHub();
  });
}

async function handleMazeMove(modal, state, dx, dy) {
  const nx = state.px + dx;
  const ny = state.py + dy;
  // 범위 체크
  if (nx < 0 || nx >= state.N || ny < 0 || ny >= state.N) return;
  // 벽 체크
  if (state.grid[ny][nx] === '█') return;

  // 이동
  state.px = nx;
  state.py = ny;
  state.turnsLeft -= 1;
  state.lastEvent = null;

  // 시야 내 칸들을 visited에 추가
  for (let yy = ny - 2; yy <= ny + 2; yy++) {
    for (let xx = nx - 2; xx <= nx + 2; xx++) {
      if (xx >= 0 && xx < state.N && yy >= 0 && yy < state.N) {
        state.visited.add(`${xx},${yy}`);
      }
    }
  }

  // 출구 도달
  if (state.exit[0] === nx && state.exit[1] === ny) {
    state.cleared = true;
    await onMazeFinish(state);
    renderMazeGame(modal, state);
    attachMazeHandlers(modal, state);
    return;
  }

  // 보물 수집
  const tIdx = state.treasures.findIndex(([tx, ty]) => tx === nx && ty === ny);
  if (tIdx >= 0) {
    state.treasures.splice(tIdx, 1);
    state.collectedTreasures += 1;
    state.lastEvent = 'treasure';
    playSfx('happy');
  }

  // 함정 발동
  const trapIdx = state.traps.findIndex(([tx, ty]) => tx === nx && ty === ny);
  if (trapIdx >= 0) {
    state.traps.splice(trapIdx, 1);
    state.triggeredTraps += 1;
    state.turnsLeft = Math.max(0, state.turnsLeft - 2);
    state.lastEvent = 'trap';
    playSfx('angry');
  }

  // 턴 소진 체크
  if (state.turnsLeft <= 0) {
    state.failed = true;
    await onMazeFinish(state);
  }

  renderMazeGame(modal, state);
  attachMazeHandlers(modal, state);
}

async function onMazeFinish(state) {
  let reward = {};
  let label = '';

  if (state.cleared) {
    const speed = state.turnsLeft / state.maxTurns;
    if (speed > 0.5) {
      // 빠른 클리어
      reward = {
        intel: +5, happy: +5, bond: +2,
        personality: { diligentVsFree: +2, socialVsIntro: +1 },
      };
      label = '완벽';
    } else if (speed > 0) {
      reward = {
        intel: +3, happy: +3,
        personality: { diligentVsFree: +1 },
      };
      label = '클리어';
    } else {
      reward = {
        intel: +2, happy: +1,
        personality: { activeVsCalm: -2 },
      };
      label = '아슬';
    }
    // 보물 보너스 - 약화 (3 → 1)
    reward.intel += state.collectedTreasures * 1;
    reward.happy = (reward.happy || 0) + state.collectedTreasures * 2;
    // 함정 페널티 (강도 일부 감소)
    if (state.triggeredTraps > 0) {
      reward.strength = -state.triggeredTraps * 2;
    }
  } else if (state.failed) {
    // 실패: happy 감소, 차분/자유 강화. 보물 일부 회수
    reward = {
      happy: -5,
      intel: state.collectedTreasures * 1,  // 보물 정보 회수
      personality: { activeVsCalm: -3, diligentVsFree: -2 },
    };
    label = '실패';
  }

  // 보상 텍스트
  const parts = [];
  for (const [key, val] of Object.entries(reward)) {
    if (key === 'personality' || val === 0) continue;
    parts.push(`${key.toUpperCase()} ${val > 0 ? '+' : ''}${val}`);
  }
  if (reward.personality) {
    for (const [axis, d] of Object.entries(reward.personality)) {
      const lab = { activeVsCalm:d<0?'차분':'활발', socialVsIntro:d<0?'내향':'사교',
        greedVsTemperance:d<0?'절제':'탐욕', diligentVsFree:d<0?'자유':'성실' }[axis];
      if (lab) parts.push(`${lab} ${d > 0 ? '+' : ''}${d}`);
    }
  }
  state.rewardText = parts.join(' · ');

  // 테스트 모드: 저장 안 함
  if (isMinigameTestMode()) {
    state.rewardText = '(테스트 모드 · 저장 안 됨) ' + state.rewardText;
    return;
  }

  // 보상 적용
  for (const [key, val] of Object.entries(reward)) {
    if (key === 'personality') continue;
    if (currentPet[key] !== undefined) {
      currentPet[key] = Math.max(0, Math.min(100, (currentPet[key] || 0) + val));
    }
  }
  if (reward.personality) {
    currentPet.personality = currentPet.personality || {};
    for (const [axis, d] of Object.entries(reward.personality)) {
      currentPet.personality[axis] = Math.max(-100, Math.min(100,
        (currentPet.personality[axis] || 0) + d));
    }
  }

  await incrementMinigameCount();
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'MINIGAME',
    text: `미로 ${label} → ${state.rewardText}`,
    type: state.cleared ? 'epic' : 'warn',
  });

  // 캐릭터 대사
  const speech = state.cleared
    ? (state.collectedTreasures > 0
        ? `여길 빠져나오니… 어디로 가는 걸까. 이건 가져갈게.`
        : `안개 너머에 길이 있었어.`)
    : `너무 어두워. 길을 잃었어.`;
  saveBroadcastSpeech(currentPet, {
    text: speech, at: Date.now(), to: '__sys__',
  });
}


// ════════════════════════════════════════════════════════════
// BATTLE - MARS II와의 다이스 결투 (PvE)
// ════════════════════════════════════════════════════════════

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅', '⚀', '⚁', '⚂', '⚃'];  // 1-10 (6면체 반복)

function rollD10() {
  return Math.floor(Math.random() * 10) + 1;
}
function diceFace(n) {
  // 1~10 모두 표시 가능 (6면체 + 7~10은 숫자만)
  if (n >= 1 && n <= 6) return ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][n - 1];
  return n.toString();
}

/**
 * 승리/패배 사운드만 재생 (오버레이 없음)
 * 결과는 인라인 카드로 표시
 */
function playBattleFinishSound(isVictory = true) {
  playSfx(isVictory ? 'fanfare' : 'defeat');
}

/**
 * HP 바 위에 데미지 숫자 띄우기
 * @param {Element} modal - battle modal
 * @param {string} target - 'mars' | 'crew' (어느 HP 바 위에)
 * @param {number} damage - 데미지 양 (0이면 차단)
 */
function spawnDamagePopup(modal, target, damage) {
  // target에 해당하는 HP 바 행 찾기
  const rows = modal.querySelectorAll('.bt-hp-row');
  if (!rows || rows.length < 2) return;
  // rows[0] = MARS II, rows[1] = 크루 (renderBattle 순서)
  const row = target === 'mars' ? rows[0] : rows[1];

  const popup = document.createElement('div');
  popup.className = 'bt-damage-popup' + (damage === 0 ? ' zero' : '');
  popup.textContent = damage === 0 ? '✓ BLOCK' : `-${damage}`;
  row.appendChild(popup);
  setTimeout(() => popup.remove(), 1500);
}

/**
 * MARS II 응원 코멘트 풀
 */
/**
 * MARS II 응원/리액션 풀 (확장)
 * 매 다이스/페이즈에 30% 확률로 등장
 */
const MARS_CHEERS = {
  // 선턴 다이스 결과
  preroll_crew_win: [
    '{name}, 먼저 가!',
    '{name}이 운이 좋네.',
    '주사위가 {name}을 골랐어.',
    '{name}, 시작해!',
  ],
  preroll_mars_win: [
    '내가 먼저야!',
    '하하, 운이 좋네.',
    '내 차례부터.',
    '주사위가 날 골랐어.',
  ],
  preroll: [
    '두근두근... 누가 먼저?',
    '주사위가 결정한다.',
    '운명의 다이스.',
    '준비... 굴려!',
    '눈 감고 굴려도 돼.',
  ],

  // 크루가 공격 — 굴림 직전/직후
  crew_attack_high: [   // 크루 다이스 8+
    '와! {name} 굉장해!',
    '{name}, 그거야!',
    '대박이야 {name}!',
    '{name}이 진심이네.',
  ],
  crew_attack_mid: [    // 4-7
    '{name}, 좋아!',
    '나쁘지 않아.',
    '{name}, 계속해.',
    '괜찮아 {name}.',
  ],
  crew_attack_low: [    // 1-3
    '{name}... 괜찮아?',
    '음... {name}, 다음엔 더!',
    '{name}, 이번엔 운이 없어.',
    '아쉬워 {name}.',
  ],

  // MARS II 공격 — 자기 다이스
  mars_attack_high: [
    '받아라!',
    '내 차례야!',
    '{name}, 막아 봐!',
    '하앗!',
    '봤지? 이게 나야.',
  ],
  mars_attack_mid: [
    '간다.',
    '이 정도면 충분해.',
    '한 번 받아 봐.',
  ],
  mars_attack_low: [
    '음... 다음엔 잘 할게.',
    '에이, 별로네.',
    '연습이 필요해.',
  ],

  // 크루가 데미지 받음
  crew_hurt_big: [      // 5+
    '{name}!! 괜찮아?',
    '아... {name}, 미안.',
    '{name}, 정신 차려!',
    '내가 너무 셌나?',
  ],
  crew_hurt_small: [
    '버텨, {name}!',
    '{name}, 살짝만 아플 거야.',
    '괜찮아 {name}?',
  ],
  crew_block: [
    '{name}, 잘 막았어!',
    '오, {name} 단단해!',
    '{name}, 멋져!',
  ],
  crew_dodge: [
    '{name}, 빠르네!',
    '와, {name} 회피!',
    '{name}이 잘도 피했어.',
  ],

  // MARS II가 데미지 받음
  mars_hurt_big: [      // 5+
    '으아악! 아파!',
    '{name}, 살살 좀!',
    '아야야... 진심이야?',
    '으... 정말 아프네.',
  ],
  mars_hurt_small: [
    '쳇, 살짝.',
    '음, 그 정도는.',
    '뭐, 이 정도쯤이야.',
  ],
  mars_block: [
    '하! 안 통해.',
    '내 방어는 어때?',
    '막았어!',
  ],
  mars_dodge: [
    '에헤, 안 맞아!',
    '잡힐 줄 알았어?',
    '이 정도쯤은 피해.',
  ],
};

function pickMarsCheer(kind, name) {
  const pool = MARS_CHEERS[kind] || [];
  if (pool.length === 0) return null;
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  return tpl.replace(/\{name\}/g, name || '너');
}

/**
 * 크루별 개인화 대사 - 특정 크루가 자주 한 말 인용
 * pet.pendingQuestions에서 그 크루가 남긴 답변(answer)을 찾아서 인용
 * @returns {string|null} 인용 가능하면 텍스트, 아니면 null
 */
function tryCrewQuoteCheer(crewName) {
  if (!currentPet?.pendingQuestions) return null;
  // 답한 질문들 중 그 크루가 답한 것 (answeredBy === crewName)
  // 또는 그 크루가 한 질문 (user === crewName)
  const myQs = currentPet.pendingQuestions.filter(q =>
    q && (q.user === crewName || q.answeredBy === crewName) && q.text
  );
  if (myQs.length === 0) return null;
  // 30%만 사용
  if (Math.random() > 0.3) return null;
  const q = myQs[Math.floor(Math.random() * myQs.length)];
  // 너무 길면 자름
  let snippet = (q.text || '').replace(/['"`]/g, '').trim();
  if (snippet.length > 24) snippet = snippet.slice(0, 22) + '...';
  if (!snippet) return null;
  // MARS II 메타 발언 (크루의 과거 발언 회상)
  const templates = [
    `"${snippet}"... 그 말 기억나.`,
    `${crewName}, "${snippet}"라고 했었지?`,
    `"${snippet}"... 좋은 말이야.`,
    `${crewName}, 그때 "${snippet}"이라더니!`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * MARS II AI - HP 비율 따라 행동 결정
 */
function pickMarsAction(marsHp, maxHp) {
  const cfg = CONFIG.MINIGAME_CONFIG.BATTLE.AI_BEHAVIOR;
  const ratio = marsHp / maxHp;
  let dist;
  if (ratio > 0.75) dist = cfg.HIGH;
  else if (ratio > 0.5) dist = cfg.MID;
  else if (ratio > 0.25) dist = cfg.LOW;
  else dist = cfg.CRIT;

  const r = Math.random();
  if (r < dist.attack) return 'attack';
  if (r < dist.attack + dist.defend) return 'defend';
  return 'dodge';
}


/**
 * PvE BATTLE 턴제 진행
 * Phase 흐름: preroll → attack → defense → roundover → (다음 공격자) → ...
 */
function showBattleGame() {
  if (!currentPet || currentPet.isDead) return;
  const existing = document.getElementById('minigame-modal');
  if (existing) { existing.remove(); return; }

  const cfg = CONFIG.MINIGAME_CONFIG.BATTLE;
  const state = {
    maxHp: cfg.MAX_HP,
    crewHp: cfg.MAX_HP,
    marsHp: cfg.MAX_HP,
    round: 1,
    phase: 'preroll',  // 'preroll' | 'attack' | 'defense' | 'roundover' | 'done'
    firstAttacker: null,  // 'crew' | 'mars' (선턴)
    currentAttacker: null,  // 현재 공격자
    attackDice: null,
    defenseDice: null,
    defenseAction: null,  // 'defend' | 'dodge' (방어자가 선택)
    pendingDamage: 0,
    log: [],            // 최근 이벤트 (로그)
    cheer: null,        // MARS II 응원 (특수 케이스 - 직접 표시)
    crewPreroll: null,
    marsPreroll: null,
    result: null,       // 'win' | 'lose'
    rewardText: '',
    animating: false,
  };

  const modal = document.createElement('div');
  modal.id = 'minigame-modal';
  modal.className = 'maze-popup';
  renderBattle(modal, state);

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }
  attachBattleHandlers(modal, state);
}

function renderBattle(modal, state) {
  const isTest = isMinigameTestMode();
  const done = state.phase === 'done';

  // 헤더 텍스트
  let headerHTML = '';
  if (done) {
    const winnerName = state.result === 'win' ? currentUser.name : 'MARS II';
    const winnerColor = state.result === 'win' ? '#03B352' : '#c97d5f';
    const loserName = state.result === 'win' ? 'MARS II' : currentUser.name;
    const winnerHp = state.result === 'win' ? state.crewHp : state.marsHp;
    const loserHp = state.result === 'win' ? state.marsHp : state.crewHp;
    headerHTML = `
      <div class="battle-result-card ${state.result}">
        <div class="battle-result-title" style="color:${winnerColor};">
          ${state.result === 'win' ? '◆' : '✕'} ${winnerName} 승리!
        </div>
        <div class="battle-result-stats">
          <div class="battle-result-row">
            <span class="battle-result-name" style="color:${winnerColor};">${winnerName}</span>
            <span class="battle-result-hp">HP ${winnerHp}/${state.maxHp}</span>
          </div>
          <div class="battle-result-row">
            <span class="battle-result-name" style="color:#666;">${loserName}</span>
            <span class="battle-result-hp" style="color:#666;">HP ${loserHp}/${state.maxHp}</span>
          </div>
          <div class="battle-result-divider"></div>
          <div class="battle-result-meta">
            ${state.round - 1}라운드 만에 결판
          </div>
        </div>
        <div class="battle-result-reward">
          ${state.rewardText}
        </div>
      </div>
    `;
  } else if (state.phase === 'preroll') {
    headerHTML = `
      <div class="maze-terminal-line">&gt; ROUND ${state.round} · 선턴 다이스</div>
      <div class="maze-terminal-line dim">&gt; 양쪽 1D10 굴려 높은 쪽 선공!</div>
    `;
  } else {
    const attLabel = state.currentAttacker === 'crew' ? currentUser.name : 'MARS II';
    if (state.phase === 'attack') {
      headerHTML = `
        <div class="maze-terminal-line">&gt; ROUND ${state.round} · ${attLabel}의 공격!</div>
      `;
    } else if (state.phase === 'defense') {
      const isMyDef = state.currentAttacker === 'mars';
      headerHTML = `
        <div class="maze-terminal-line">&gt; ROUND ${state.round} · ${attLabel} 공격 ${state.attackDice}!</div>
        <div class="maze-terminal-line dim">&gt; ${isMyDef ? '너의 차례. 방어할까 회피할까?' : 'MARS II가 어떻게 받아낼까...'}</div>
      `;
    } else if (state.phase === 'roundover') {
      headerHTML = `
        <div class="maze-terminal-line dim">&gt; 다음 차례...</div>
      `;
    }
  }

  // 응원 표시
  let cheerHTML = '';
  if (state.cheer) {
    cheerHTML = `
      <div class="battle-cheer">
        <span class="battle-cheer-icon">♪</span>
        <span class="battle-cheer-text">"${state.cheer}"</span>
      </div>
    `;
  }

  // 최근 이벤트 로그 (3-4개)
  const logHTML = state.log.slice(-4).map(line => `
    <div class="maze-terminal-line ${line.cls || 'dim'}">&gt; ${line.text}</div>
  `).join('');

  // HP 바
  const crewBars = Math.ceil((state.crewHp / state.maxHp) * 12);
  const marsBars = Math.ceil((state.marsHp / state.maxHp) * 12);
  const crewBarsHTML = Array.from({length: 12}, (_, i) =>
    `<span class="bt-hp-bar ${i < crewBars ? 'on crew' : ''}"></span>`).join('');
  const marsBarsHTML = Array.from({length: 12}, (_, i) =>
    `<span class="bt-hp-bar ${i < marsBars ? 'on mars' : ''}"></span>`).join('');

  // 다이스 영역 (preroll/attack/defense 페이즈 시 표시)
  let diceHTML = '';
  if (state.phase === 'preroll' && (state.crewPreroll !== null || state.marsPreroll !== null)) {
    const crewWin = state.crewPreroll !== null && state.marsPreroll !== null && state.crewPreroll > state.marsPreroll;
    const marsWin = state.crewPreroll !== null && state.marsPreroll !== null && state.marsPreroll > state.crewPreroll;
    diceHTML = `
      <div class="bt-dice-row">
        <div class="bt-dice-side ${crewWin ? 'winner' : ''}">
          <div class="bt-dice-label">${currentUser.name}</div>
          <div class="bt-dice-face">${state.crewPreroll !== null ? diceFace(state.crewPreroll) : '·'}</div>
          <div class="bt-dice-num">${state.crewPreroll !== null ? state.crewPreroll : '-'}</div>
          <div class="bt-dice-action">선턴</div>
        </div>
        <div class="bt-dice-vs">VS</div>
        <div class="bt-dice-side ${marsWin ? 'winner' : ''}">
          <div class="bt-dice-label" style="color:#c97d5f;">MARS II</div>
          <div class="bt-dice-face">${state.marsPreroll !== null ? diceFace(state.marsPreroll) : '·'}</div>
          <div class="bt-dice-num">${state.marsPreroll !== null ? state.marsPreroll : '-'}</div>
          <div class="bt-dice-action">선턴</div>
        </div>
      </div>
    `;
  } else if ((state.phase === 'attack' || state.phase === 'defense') && state.attackDice !== null) {
    const attLabel = state.currentAttacker === 'crew' ? currentUser.name : 'MARS II';
    const defLabel = state.currentAttacker === 'crew' ? 'MARS II' : currentUser.name;
    const attColor = state.currentAttacker === 'crew' ? '#03B352' : '#c97d5f';
    const defColor = state.currentAttacker === 'crew' ? '#c97d5f' : '#03B352';
    const variantLabel = state.attackVariant === 'quick' ? '🗡 견제' : '⚔ 강타';

    // 데미지 시각화
    let damageHTML = '';
    if (state.defenseDice !== null && state.defenseAction !== null) {
      const isDodgeSuccess = state.defenseAction === 'dodge' && state.defenseDice >= 8;
      const isFullDodgeFail = state.defenseAction === 'dodge' && state.defenseDice < 8;

      if (isDodgeSuccess) {
        damageHTML = `
          <div class="bt-damage-card no-damage">
            <div class="bt-damage-headline">💨 완전 회피!</div>
            <div class="bt-damage-detail">
              회피 다이스 <strong>${state.defenseDice}</strong> (8+) → 데미지 <strong>0</strong>
            </div>
          </div>
        `;
      } else if (isFullDodgeFail) {
        damageHTML = `
          <div class="bt-damage-card big-damage">
            <div class="bt-damage-headline">⚠ 회피 실패!</div>
            <div class="bt-damage-detail">
              회피 ${state.defenseDice} (8 미만) → <strong class="bt-damage-num">${state.attackDice}</strong> 피해
            </div>
          </div>
        `;
      } else if (state.defenseAction === 'defend') {
        const blocked = Math.min(state.attackDice, state.defenseDice);
        const dmg = Math.max(0, state.attackDice - state.defenseDice);
        if (dmg === 0) {
          damageHTML = `
            <div class="bt-damage-card no-damage">
              <div class="bt-damage-headline">🛡 완전 차단!</div>
              <div class="bt-damage-detail">
                공격 ${state.attackDice} − 방어 ${state.defenseDice} = <strong>0</strong> 피해
              </div>
            </div>
          `;
        } else {
          damageHTML = `
            <div class="bt-damage-card damage">
              <div class="bt-damage-headline">⚔ ${dmg} 피해 적중</div>
              <div class="bt-damage-detail">
                공격 ${state.attackDice} − 방어 ${state.defenseDice} = <strong class="bt-damage-num">${dmg}</strong>
              </div>
            </div>
          `;
        }
      }
    }

    diceHTML = `
      <div class="bt-dice-row attack">
        <div class="bt-dice-side attacker">
          <div class="bt-dice-label" style="color:${attColor};">⚔ ${attLabel}</div>
          <div class="bt-dice-face attack">${diceFace(state.attackDice)}</div>
          <div class="bt-dice-num huge">${state.attackDice}</div>
          <div class="bt-dice-action">${state.currentAttacker === 'crew' ? variantLabel : '⚔ 공격'}</div>
        </div>
        <div class="bt-dice-vs">→</div>
        <div class="bt-dice-side defender">
          <div class="bt-dice-label" style="color:${defColor};">${defLabel}</div>
          <div class="bt-dice-face">${state.defenseDice !== null ? diceFace(state.defenseDice) : '?'}</div>
          <div class="bt-dice-num huge">${state.defenseDice !== null ? state.defenseDice : '-'}</div>
          <div class="bt-dice-action">${state.defenseAction === 'defend' ? '🛡 방어' : state.defenseAction === 'dodge' ? '💨 회피' : '...'}</div>
        </div>
      </div>
      ${damageHTML}
    `;
  }

  // 액션 버튼 결정
  let actionHTML = '';
  if (done) {
    actionHTML = `
      <div class="maze-actions">
        <button id="bt-again" class="maze-btn-action">다시 도전</button>
        <button id="bt-back" class="maze-btn-action secondary">메뉴로</button>
      </div>
    `;
  } else if (state.phase === 'preroll') {
    actionHTML = `
      <div style="text-align:center;margin-top:14px;">
        <button class="bt-roll-btn" id="bt-roll-preroll" ${state.animating ? 'disabled' : ''}>
          <span class="bt-roll-dice">🎲</span>
          <span class="bt-roll-label">선턴 다이스 굴리기</span>
        </button>
      </div>
    `;
  } else if (state.phase === 'attack') {
    if (state.currentAttacker === 'crew') {
      // 크루 공격 차례 - 2가지 공격 버튼 (강타 / 견제)
      actionHTML = `
        <div class="bt-actions" style="grid-template-columns:1fr 1fr;">
          <button class="bt-action-btn attack" data-attack="heavy" ${state.animating ? 'disabled' : ''}>
            <div class="bt-action-icon">⚔</div>
            <div class="bt-action-label">강타</div>
            <div class="bt-action-desc">정면 공격</div>
          </button>
          <button class="bt-action-btn attack-light" data-attack="quick" ${state.animating ? 'disabled' : ''}>
            <div class="bt-action-icon">🗡</div>
            <div class="bt-action-label">견제</div>
            <div class="bt-action-desc">빠른 일격</div>
          </button>
        </div>
      `;
    } else {
      // MARS II 공격 차례 - 자동 처리 중
      actionHTML = `
        <div style="text-align:center;padding:14px;color:#c97d5f;font-size:11px;">
          MARS II가 공격을 준비 중...
        </div>
      `;
    }
  } else if (state.phase === 'defense') {
    if (state.currentAttacker === 'mars') {
      // 크루가 방어자
      actionHTML = `
        <div class="bt-actions" style="grid-template-columns:1fr 1fr;">
          <button class="bt-action-btn defend" data-defaction="defend" ${state.animating ? 'disabled' : ''}>
            <div class="bt-action-icon">🛡</div>
            <div class="bt-action-label">방어</div>
            <div class="bt-action-desc">데미지 차감</div>
          </button>
          <button class="bt-action-btn dodge" data-defaction="dodge" ${state.animating ? 'disabled' : ''}>
            <div class="bt-action-icon">💨</div>
            <div class="bt-action-label">회피</div>
            <div class="bt-action-desc">8+ 완전회피</div>
          </button>
        </div>
      `;
    } else {
      // MARS II가 방어자
      actionHTML = `
        <div style="text-align:center;padding:14px;color:#c97d5f;font-size:11px;">
          MARS II가 받아낼 준비 중...
        </div>
      `;
    }
  } else {
    actionHTML = `<div style="text-align:center;padding:14px;color:#5fb37a;font-size:11px;">처리 중...</div>`;
  }

  modal.innerHTML = `
    <div class="maze-popup-head">
      <span>&gt; BATTLE.EXE · ROUND ${state.round} ${isTest ? '· <span style="color:#e8a853;">[TEST]</span>' : ''}</span>
      <span class="maze-close" id="bt-close" title="닫기">─ _ ✕</span>
    </div>
    <div class="maze-popup-body">
      ${headerHTML}
      ${cheerHTML}
      ${logHTML}

      <!-- HP 바 -->
      <div class="bt-hp-row ${state.pendingDamage > 0 && state.currentAttacker === 'crew' ? 'bt-hp-hit' : ''}">
        <span class="bt-hp-label" style="color:#c97d5f;">MARS II</span>
        <div class="bt-hp-bars">${marsBarsHTML}</div>
        <span class="bt-hp-value">${state.marsHp}/${state.maxHp}</span>
      </div>
      <div class="bt-hp-row ${state.pendingDamage > 0 && state.currentAttacker === 'mars' ? 'bt-hp-hit' : ''}">
        <span class="bt-hp-label" style="color:#03B352;">${currentUser.name}</span>
        <div class="bt-hp-bars">${crewBarsHTML}</div>
        <span class="bt-hp-value">${state.crewHp}/${state.maxHp}</span>
      </div>

      ${diceHTML}
      ${actionHTML}
    </div>
  `;

  // 데미지 카드가 있으면 보이는 위치로 스크롤
  if (state.pendingDamage !== undefined && state.pendingDamage !== 0 || state.defenseDice !== null) {
    setTimeout(() => {
      const card = modal.querySelector('.bt-damage-card');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

function attachBattleHandlers(modal, state) {
  document.getElementById('bt-close')?.addEventListener('click', () => modal.remove());

  document.getElementById('bt-roll-preroll')?.addEventListener('click', () =>
    handleBattlePreroll(modal, state));

  modal.querySelectorAll('[data-attack]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.animating) return;
      const variant = btn.dataset.attack;
      handleBattleCrewAttack(modal, state, variant);
    });
  });

  modal.querySelectorAll('[data-defaction]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.animating) return;
      const action = btn.dataset.defaction;
      handleBattleCrewDefense(modal, state, action);
    });
  });

  document.getElementById('bt-again')?.addEventListener('click', () => {
    modal.remove();
    setTimeout(showBattleGame, 100);
  });
  document.getElementById('bt-back')?.addEventListener('click', () => {
    modal.remove();
    showMinigameHub();
  });
}

/**
 * 1) 선턴 다이스 굴림
 */
async function handleBattlePreroll(modal, state) {
  state.animating = true;
  state.crewPreroll = rollD10();
  state.marsPreroll = rollD10();
  // 동률이면 한 번 더 (간단히 +1로 차이내기 또는 재굴림 - 재굴림으로)
  while (state.crewPreroll === state.marsPreroll) {
    state.crewPreroll = rollD10();
    state.marsPreroll = rollD10();
  }
  state.firstAttacker = state.crewPreroll > state.marsPreroll ? 'crew' : 'mars';
  state.currentAttacker = state.firstAttacker;
  playSfx('blip');

  // MARS II 응원 (선턴 결과별)
  if (Math.random() < 0.7) {
    // 70% 일반 응원, 30% 크루 인용
    const quote = tryCrewQuoteCheer(currentUser.name);
    if (quote) {
      state.cheer = quote;
    } else {
      const cheerKind = state.firstAttacker === 'crew' ? 'preroll_crew_win' : 'preroll_mars_win';
      state.cheer = pickMarsCheer(cheerKind, currentUser.name) || pickMarsCheer('preroll');
    }
  }

  renderBattle(modal, state);
  attachBattleHandlers(modal, state);
  await new Promise(r => setTimeout(r, 900));

  state.cheer = null;
  // 결과 로그
  const winName = state.firstAttacker === 'crew' ? currentUser.name : 'MARS II';
  state.log.push({ text: `R${state.round} 선턴: ${currentUser.name} ${state.crewPreroll} vs MARS II ${state.marsPreroll} → ${winName} 선공!`, cls: 'good' });

  // 다음: attack 페이즈
  state.phase = 'attack';
  state.attackDice = null;
  state.defenseDice = null;
  state.defenseAction = null;
  state.crewPreroll = null;
  state.marsPreroll = null;
  state.animating = false;

  renderBattle(modal, state);
  attachBattleHandlers(modal, state);

  // MARS II 차례면 자동 진행
  if (state.currentAttacker === 'mars') {
    await new Promise(r => setTimeout(r, 600));
    handleBattleMarsAttack(modal, state);
  }
}

/**
 * 2-A) 크루 공격 차례 - 다이스 굴림
 * @param variant 'heavy' (강타: 다이스 그대로) | 'quick' (견제: 1D6+2 = 3-8 범위, 안정적)
 */
async function handleBattleCrewAttack(modal, state, variant = 'heavy') {
  state.animating = true;
  // 강타: 1D10 (1~10, 변동 큼)
  // 견제: 1D6 + 2 (3~8, 안정적이지만 높은 값 못 나옴)
  if (variant === 'quick') {
    state.attackDice = Math.floor(Math.random() * 6) + 1 + 2;  // 3~8
    state.attackVariant = 'quick';
  } else {
    state.attackDice = rollD10();
    state.attackVariant = 'heavy';
  }
  playSfx('blip');

  // MARS II 응원 - 크루 다이스 값에 따라 다르게
  if (Math.random() < 0.55) {
    let kind;
    if (state.attackDice >= 8) kind = 'crew_attack_high';
    else if (state.attackDice >= 4) kind = 'crew_attack_mid';
    else kind = 'crew_attack_low';
    state.cheer = pickMarsCheer(kind, currentUser.name);
  }

  state.phase = 'defense';

  // 1) 크루 공격 다이스만 먼저 표시
  state.defenseDice = null;
  state.defenseAction = null;
  renderBattle(modal, state);
  attachBattleHandlers(modal, state);
  await new Promise(r => setTimeout(r, 700));

  // 2) MARS II 방어/회피 결정 + 다이스
  state.cheer = null;
  const r = Math.random();
  state.defenseAction = r < 0.6 ? 'defend' : 'dodge';
  state.defenseDice = rollD10();
  playSfx('blip');
  renderBattle(modal, state);
  attachBattleHandlers(modal, state);

  await new Promise(r2 => setTimeout(r2, 700));

  // 3) 데미지 계산 + 카드 표시
  resolveBattleAttack(state, 'crew');
  playSfx(state.pendingDamage > 0 ? 'happy' : 'cute');

  // MARS II 리액션 - 자기가 데미지 얼마나 받았는지에 따라
  if (Math.random() < 0.6) {
    let kind;
    if (state.pendingDamage === 0) {
      kind = state.defenseAction === 'dodge' ? 'mars_dodge' : 'mars_block';
    } else if (state.pendingDamage >= 5) {
      kind = 'mars_hurt_big';
    } else {
      kind = 'mars_hurt_small';
    }
    state.cheer = pickMarsCheer(kind, currentUser.name);
  }
  renderBattle(modal, state);
  attachBattleHandlers(modal, state);

  await new Promise(r3 => setTimeout(r3, 700));

  // 4) 데미지 팝업 + HP 깎기 (동시에)
  spawnDamagePopup(modal, 'mars', state.pendingDamage);
  state.marsHp = Math.max(0, state.marsHp - state.pendingDamage);
  // pendingDamage 유지 - render에서 HP 흔들림 적용 위해
  renderBattle(modal, state);
  attachBattleHandlers(modal, state);

  await new Promise(r4 => setTimeout(r4, 1100));

  // 5) pendingDamage 정리

  // 종료 체크
  if (state.marsHp <= 0) {
    state.result = 'win';
    state.phase = 'done';
    await onBattleFinish(state);
    state.animating = false;
    renderBattle(modal, state);
    attachBattleHandlers(modal, state);
    playBattleFinishSound(true);
    return;
  }

  // 다음: 공격자 교체
  state.attackDice = null;
  state.defenseDice = null;
  state.defenseAction = null;
  state.pendingDamage = 0;
  state.currentAttacker = state.currentAttacker === 'crew' ? 'mars' : 'crew';

  // 라운드 종료 체크 (양쪽 1번씩 했으면 라운드 +1)
  if (state.currentAttacker === state.firstAttacker) {
    state.round += 1;
  }

  state.phase = 'attack';
  state.animating = false;
  renderBattle(modal, state);
  attachBattleHandlers(modal, state);

  // MARS II 차례면 자동
  if (state.currentAttacker === 'mars') {
    await new Promise(r4 => setTimeout(r4, 500));
    handleBattleMarsAttack(modal, state);
  }
}

/**
 * 2-B) MARS II 공격 차례 - 자동 다이스 + 크루 방어 선택 대기
 */
async function handleBattleMarsAttack(modal, state) {
  state.animating = true;
  state.attackDice = rollD10();
  playSfx('blip');

  // MARS II 자기 공격 어필 - 다이스 값에 따라
  if (Math.random() < 0.55) {
    let kind;
    if (state.attackDice >= 8) kind = 'mars_attack_high';
    else if (state.attackDice >= 4) kind = 'mars_attack_mid';
    else kind = 'mars_attack_low';
    state.cheer = pickMarsCheer(kind, currentUser.name);
  }

  state.phase = 'defense';
  state.defenseDice = null;
  state.defenseAction = null;
  state.animating = false;

  renderBattle(modal, state);
  attachBattleHandlers(modal, state);
  // 크루 입력 대기
}

/**
 * 2-C) 크루 방어/회피 선택
 */
async function handleBattleCrewDefense(modal, state, defAction) {
  state.animating = true;
  state.defenseAction = defAction;
  state.defenseDice = rollD10();
  state.cheer = null;
  playSfx('blip');

  // 1) 방어/회피 다이스 표시
  renderBattle(modal, state);
  attachBattleHandlers(modal, state);
  await new Promise(r => setTimeout(r, 700));

  // 2) 데미지 계산 + 카드 표시
  resolveBattleAttack(state, 'mars');
  playSfx(state.pendingDamage > 0 ? 'angry' : 'cute');

  // MARS II 리액션 - 크루가 데미지 받았는지에 따라
  if (Math.random() < 0.6) {
    let kind;
    if (state.pendingDamage === 0) {
      kind = state.defenseAction === 'dodge' ? 'crew_dodge' : 'crew_block';
    } else if (state.pendingDamage >= 5) {
      kind = 'crew_hurt_big';
    } else {
      kind = 'crew_hurt_small';
    }
    state.cheer = pickMarsCheer(kind, currentUser.name);
  }
  renderBattle(modal, state);
  attachBattleHandlers(modal, state);

  await new Promise(r => setTimeout(r, 700));

  // 3) 데미지 팝업 + HP 깎기
  spawnDamagePopup(modal, 'crew', state.pendingDamage);
  state.crewHp = Math.max(0, state.crewHp - state.pendingDamage);
  renderBattle(modal, state);
  attachBattleHandlers(modal, state);

  await new Promise(r => setTimeout(r, 1100));

  // 종료 체크
  if (state.crewHp <= 0) {
    state.result = 'lose';
    state.phase = 'done';
    await onBattleFinish(state);
    state.animating = false;
    renderBattle(modal, state);
    attachBattleHandlers(modal, state);
    playBattleFinishSound(false);
    return;
  }

  // 다음: 공격자 교체
  state.attackDice = null;
  state.defenseDice = null;
  state.defenseAction = null;
  state.pendingDamage = 0;
  state.currentAttacker = state.currentAttacker === 'crew' ? 'mars' : 'crew';

  if (state.currentAttacker === state.firstAttacker) {
    state.round += 1;
  }

  state.phase = 'attack';
  state.animating = false;
  renderBattle(modal, state);
  attachBattleHandlers(modal, state);

  if (state.currentAttacker === 'mars') {
    await new Promise(r => setTimeout(r, 500));
    handleBattleMarsAttack(modal, state);
  }
}

/**
 * 데미지 계산 + 로그
 * @param {object} state
 * @param {string} attacker 'crew' | 'mars'
 */
function resolveBattleAttack(state, attacker) {
  const cfg = CONFIG.MINIGAME_CONFIG.BATTLE;
  const attName = attacker === 'crew' ? currentUser.name : 'MARS II';
  const defName = attacker === 'crew' ? 'MARS II' : currentUser.name;
  const aDice = state.attackDice;
  const dDice = state.defenseDice;
  const dAct = state.defenseAction;

  let damage = 0;
  let logText = '';

  if (dAct === 'defend') {
    damage = Math.max(0, aDice - dDice);
    if (damage === 0) {
      logText = `${attName} 공격 ${aDice} → ${defName} 방어 ${dDice}, 완전 차단!`;
    } else {
      logText = `${attName} 공격 ${aDice} → ${defName} 방어 ${dDice}, ${damage} 피해`;
    }
  } else if (dAct === 'dodge') {
    if (dDice >= cfg.DODGE_THRESHOLD) {
      damage = 0;
      logText = `${attName} 공격 ${aDice} → ${defName} 회피 ${dDice} (${cfg.DODGE_THRESHOLD}+) 완전 회피!`;
    } else {
      damage = aDice;
      logText = `${attName} 공격 ${aDice} → ${defName} 회피 실패 ${dDice}, ${damage} 피해!`;
    }
  }

  state.pendingDamage = damage;
  state.log.push({
    text: logText,
    cls: damage > 0 ? (attacker === 'crew' ? 'good' : 'warn') : 'dim',
  });
}

async function onBattleFinish(state) {
  const cfg = CONFIG.MINIGAME_CONFIG.BATTLE;
  let reward, label;

  if (state.result === 'win') {
    if (state.round <= 3) {
      reward = cfg.REWARDS.win_fast;
      label = '빠른 승리';
    } else if (state.round >= 7 && state.crewHp <= 5) {
      reward = cfg.REWARDS.win_slow;
      label = '아슬한 승리';
    } else {
      reward = cfg.REWARDS.win;
      label = '승리';
    }
  } else {
    reward = cfg.REWARDS.lose;
    label = '패배';
  }

  // 보상 텍스트
  const parts = [];
  for (const [k, v] of Object.entries(reward)) {
    if (k === 'personality' || v === 0) continue;
    parts.push(`${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`);
  }
  if (reward.personality) {
    const labels = {
      activeVsCalm: ['차분', '활발'],
      greedVsTemperance: ['절제', '탐욕'],
      socialVsIntro: ['내향', '사교'],
      diligentVsFree: ['자유', '성실'],
    };
    for (const [axis, d] of Object.entries(reward.personality)) {
      const lab = labels[axis];
      if (!lab) continue;
      parts.push(`${d > 0 ? lab[1] : lab[0]} ${d > 0 ? '+' : ''}${d}`);
    }
  }
  state.rewardText = parts.join(' · ') || '변화 없음';

  if (isMinigameTestMode()) {
    state.rewardText = '(테스트 모드 · 저장 안 됨) ' + state.rewardText;
    return;
  }

  for (const [k, v] of Object.entries(reward)) {
    if (k === 'personality') continue;
    if (currentPet[k] !== undefined) {
      currentPet[k] = Math.max(0, Math.min(100, (currentPet[k] || 0) + v));
    }
  }
  if (reward.personality) {
    currentPet.personality = currentPet.personality || {};
    for (const [axis, d] of Object.entries(reward.personality)) {
      currentPet.personality[axis] = Math.max(-100, Math.min(100,
        (currentPet.personality[axis] || 0) + d));
    }
  }

  await incrementMinigameCount();
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'BATTLE',
    text: `${label} (${state.round - 1}R) → ${state.rewardText}`,
    type: state.result === 'win' ? 'epic' : 'warn',
  });

  // 캐릭터 대사
  const speeches = {
    'win': [
      '...졌다. 다음엔 안 져.',
      '강하네. 인정.',
      '으, 손이 저려.',
    ],
    'lose': [
      '후훗, 봤지? 내가 더 강해.',
      '미안, 봐주지 못해서.',
      '연습이 더 필요한 것 같아.',
    ],
  };
  const pool = speeches[state.result] || [];
  if (pool.length > 0) {
    const speech = pool[Math.floor(Math.random() * pool.length)];
    saveBroadcastSpeech(currentPet, {
      text: speech, at: Date.now(), to: '__sys__',
    });
  }
}


// ════════════════════════════════════════════════════════════
// PvP BATTLE - 크루 vs 크루 (로비 + 매칭)
// ════════════════════════════════════════════════════════════

let pvpBattleId = null;       // 현재 참여 중인 battle ID
let pvpUnsubscribe = null;    // onSnapshot 구독 해제 함수
let pvpRefreshTimer = null;   // 로비 자동 새로고침

/**
 * 로비 진입 - 대기 중인 도전장 목록 + 새 도전장 만들기
 */
async function showPvpLobby() {
  if (!currentPet || currentPet.isDead) return;
  const existing = document.getElementById('minigame-modal');
  if (existing) { existing.remove(); }

  // 기존 구독 해제
  if (pvpUnsubscribe) { pvpUnsubscribe(); pvpUnsubscribe = null; }
  if (pvpRefreshTimer) { clearInterval(pvpRefreshTimer); pvpRefreshTimer = null; }
  pvpBattleId = null;

  const modal = document.createElement('div');
  modal.id = 'minigame-modal';
  modal.className = 'maze-popup';
  modal.innerHTML = `
    <div class="maze-popup-head">
      <span>&gt; PVP_LOBBY.EXE · 크루 결투</span>
      <span class="maze-close" id="pvp-close">─ _ ✕</span>
    </div>
    <div class="maze-popup-body">
      <div class="maze-terminal-line">&gt; 다른 크루와 1D10 다이스로 결투.</div>
      <div class="maze-terminal-line dim">&gt; 양쪽 동시에 [공격/방어/회피] 선택. HP 50.</div>

      <div style="margin:14px 0;">
        <button id="pvp-create" class="maze-btn-action" style="width:100%;">
          ⚔ 새 도전장 만들기 (대기)
        </button>
      </div>

      <div class="maze-terminal-line dim">&gt; 대기 중인 도전장:</div>
      <div id="pvp-lobby-list" style="margin-top:8px;">
        <div class="maze-terminal-line dim">&gt; 불러오는 중...</div>
      </div>

      <div style="margin-top:12px;">
        <button id="pvp-refresh" class="maze-btn-action secondary" style="width:100%;font-size:11px;">
          ↻ 목록 새로고침
        </button>
      </div>
    </div>
  `;
  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('pvp-close').addEventListener('click', () => {
    if (pvpRefreshTimer) clearInterval(pvpRefreshTimer);
    modal.remove();
  });
  document.getElementById('pvp-create').addEventListener('click', () => createPvpChallenge(modal));
  document.getElementById('pvp-refresh').addEventListener('click', () => refreshPvpLobby());

  // 첫 로드 + 5초마다 자동 새로고침
  await refreshPvpLobby();
  pvpRefreshTimer = setInterval(refreshPvpLobby, 5000);
}

async function refreshPvpLobby() {
  const list = document.getElementById('pvp-lobby-list');
  if (!list) return;
  try {
    const battles = await Backend.listWaitingBattles();
    if (battles.length === 0) {
      list.innerHTML = `<div class="maze-terminal-line dim">&gt; 대기 중인 도전장 없음</div>`;
      return;
    }
    list.innerHTML = battles.map(b => {
      const isMine = b.players.p1.name === currentUser.name;
      const ageMin = Math.floor((Date.now() - b.createdAt) / 60000);
      return `
        <div class="pvp-lobby-item" data-id="${b.id}" data-mine="${isMine}">
          <div class="pvp-lobby-info">
            <span class="pvp-lobby-host">${b.players.p1.name}</span>
            <span class="pvp-lobby-age">${ageMin}분 전</span>
          </div>
          <div class="pvp-lobby-actions">
            ${isMine
              ? `<button class="pvp-cancel-btn" data-id="${b.id}">취소</button>`
              : `<button class="pvp-join-btn" data-id="${b.id}">⚔ 도전</button>`}
          </div>
        </div>
      `;
    }).join('');
    // 핸들러
    list.querySelectorAll('.pvp-join-btn').forEach(btn => {
      btn.addEventListener('click', () => joinPvpChallenge(btn.dataset.id));
    });
    list.querySelectorAll('.pvp-cancel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Backend.cancelBattle(btn.dataset.id);
        refreshPvpLobby();
      });
    });
  } catch (err) {
    console.error('[pvp] 로비 로드 실패:', err);
    list.innerHTML = `<div class="maze-terminal-line warn">&gt; 로비 로드 실패: ${err.message}</div>`;
  }
}

async function createPvpChallenge(lobbyModal) {
  const cfg = CONFIG.MINIGAME_CONFIG.BATTLE;
  try {
    const battleId = await Backend.createBattle(currentUser.name, cfg.MAX_HP);
    pvpBattleId = battleId;
    if (pvpRefreshTimer) { clearInterval(pvpRefreshTimer); pvpRefreshTimer = null; }
    lobbyModal.remove();
    showPvpWaitingRoom(battleId);
  } catch (err) {
    console.error('[pvp] 도전장 생성 실패:', err);
    showToast(`⚠ 도전장 생성 실패: ${err.message}`, 'warn');
  }
}

async function joinPvpChallenge(battleId) {
  const cfg = CONFIG.MINIGAME_CONFIG.BATTLE;
  try {
    await Backend.joinBattle(battleId, currentUser.name, cfg.MAX_HP);
    pvpBattleId = battleId;
    if (pvpRefreshTimer) { clearInterval(pvpRefreshTimer); pvpRefreshTimer = null; }
    const modal = document.getElementById('minigame-modal');
    if (modal) modal.remove();
    showPvpBattle(battleId);
  } catch (err) {
    console.error('[pvp] 입장 실패:', err);
    showToast(`⚠ 입장 실패: ${err.message}`, 'warn');
    refreshPvpLobby();
  }
}

/**
 * 도전장 대기 화면 (호스트만)
 */
function showPvpWaitingRoom(battleId) {
  const existing = document.getElementById('minigame-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'minigame-modal';
  modal.className = 'maze-popup';
  modal.innerHTML = `
    <div class="maze-popup-head">
      <span>&gt; PVP_WAIT.EXE · 도전 대기 중</span>
      <span class="maze-close" id="pvpw-close">─ _ ✕</span>
    </div>
    <div class="maze-popup-body">
      <div class="maze-terminal-line good">&gt; 도전장 발행됨.</div>
      <div class="maze-terminal-line dim">&gt; 다른 크루의 입장을 대기 중...</div>
      <div class="maze-terminal-line dim">&gt; 30분 내 입장 없으면 자동 만료.</div>

      <div style="text-align:center;margin:24px 0;">
        <div class="pvp-spinner">⚔</div>
        <div style="margin-top:14px;color:#5fb37a;font-size:11px;">
          ${currentUser.name} (대기 중...)
        </div>
      </div>

      <div class="maze-actions">
        <button id="pvpw-cancel" class="maze-btn-action secondary">도전장 취소</button>
      </div>
    </div>
  `;
  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  // 도전장 구독 - 누군가 입장하면 자동으로 대결 화면으로
  pvpUnsubscribe = Backend.onBattleChange(battleId, (b) => {
    if (b.status === 'active' && b.players.p2) {
      // 게스트 입장됨 → 대결 시작
      modal.remove();
      showPvpBattle(battleId);
    }
  });

  // 취소 + 닫기
  const cancelHandler = async () => {
    if (pvpUnsubscribe) { pvpUnsubscribe(); pvpUnsubscribe = null; }
    await Backend.cancelBattle(battleId);
    pvpBattleId = null;
    modal.remove();
    showPvpLobby();  // 로비로 복귀
  };
  document.getElementById('pvpw-close').addEventListener('click', cancelHandler);
  document.getElementById('pvpw-cancel').addEventListener('click', cancelHandler);
}

/**
 * PvP 대결 화면 (양쪽 동기화)
 */
function showPvpBattle(battleId) {
  const existing = document.getElementById('minigame-modal');
  if (existing) existing.remove();

  // 이전 구독 해제
  if (pvpUnsubscribe) { pvpUnsubscribe(); pvpUnsubscribe = null; }

  const modal = document.createElement('div');
  modal.id = 'minigame-modal';
  modal.className = 'maze-popup';

  // 로컬 상태
  const state = {
    battleId,
    battle: null,
    submitting: false,
    mySlot: null,  // 'p1' or 'p2'
  };

  // Firestore 구독
  pvpUnsubscribe = Backend.onBattleChange(battleId, (b) => {
    state.battle = b;
    // 슬롯 결정
    if (b.players.p1?.name === currentUser.name) state.mySlot = 'p1';
    else if (b.players.p2?.name === currentUser.name) state.mySlot = 'p2';
    renderPvpBattle(modal, state);
    attachPvpBattleHandlers(modal, state);
  });

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }
}

function renderPvpBattle(modal, state) {
  const b = state.battle;
  if (!b) {
    modal.innerHTML = `<div class="maze-popup-body"><div class="maze-terminal-line dim">&gt; 로딩 중...</div></div>`;
    return;
  }
  const me = b.players[state.mySlot];
  const opSlot = state.mySlot === 'p1' ? 'p2' : 'p1';
  const op = b.players[opSlot];

  const done = b.status === 'done';
  let resultHTML = '';
  if (done) {
    let label, color;
    if (b.winner === 'draw') { label = '◇ 무승부'; color = '#8fb39a'; }
    else if (b.winner === state.mySlot) { label = '◆ 승리!'; color = '#03B352'; }
    else { label = '✕ 패배'; color = '#c97d5f'; }
    resultHTML = `
      <div class="maze-terminal-line good" style="color:${color};font-weight:bold;">&gt; ${label} (${b.round}R)</div>
      <div class="maze-terminal-line dim">&gt; PvP는 스탯 변화 없음 · 명예의 결투</div>
    `;
  } else {
    resultHTML = `
      <div class="maze-terminal-line">&gt; ROUND ${b.round} · ${me?.ready ? '상대 대기 중...' : '너의 차례'}</div>
      <div class="maze-terminal-line dim">&gt; ${op?.name || '?'} ${op?.ready ? '✓ 선택 완료' : '... 고민 중'}</div>
    `;
  }

  // 최근 로그 4줄
  const logHTML = (b.log || []).slice(-4).map(line =>
    `<div class="maze-terminal-line dim">&gt; ${line.text}</div>`).join('');

  // HP 바
  const meBars = me ? Math.ceil((me.hp / b.maxHp) * 12) : 0;
  const opBars = op ? Math.ceil((op.hp / b.maxHp) * 12) : 0;
  const meBarsHTML = Array.from({length: 12}, (_, i) =>
    `<span class="bt-hp-bar ${i < meBars ? 'on crew' : ''}"></span>`).join('');
  const opBarsHTML = Array.from({length: 12}, (_, i) =>
    `<span class="bt-hp-bar ${i < opBars ? 'on mars' : ''}"></span>`).join('');

  modal.innerHTML = `
    <div class="maze-popup-head">
      <span>&gt; PVP.EXE · ROUND ${b.round}</span>
      <span class="maze-close" id="pvp-bt-close">─ _ ✕</span>
    </div>
    <div class="maze-popup-body">
      ${resultHTML}
      ${logHTML}

      <div class="bt-hp-row">
        <span class="bt-hp-label" style="color:#c97d5f;">${op?.name || '?'}</span>
        <div class="bt-hp-bars">${opBarsHTML}</div>
        <span class="bt-hp-value">${op?.hp ?? '-'}/${b.maxHp}</span>
      </div>
      <div class="bt-hp-row">
        <span class="bt-hp-label" style="color:#03B352;">${me?.name || '?'}</span>
        <div class="bt-hp-bars">${meBarsHTML}</div>
        <span class="bt-hp-value">${me?.hp ?? '-'}/${b.maxHp}</span>
      </div>

      ${!done ? `
        ${me?.ready ? `
          <div style="text-align:center;padding:16px;color:#5fb37a;font-size:12px;">
            ✓ 선택 완료 · ${op?.ready ? '결과 처리 중...' : '상대 대기...'}
          </div>
        ` : `
          <div class="bt-actions">
            <button class="bt-action-btn attack" data-action="attack" ${state.submitting ? 'disabled' : ''}>
              <div class="bt-action-icon">⚔</div>
              <div class="bt-action-label">공격</div>
              <div class="bt-action-desc">다이스값 = 데미지</div>
            </button>
            <button class="bt-action-btn defend" data-action="defend" ${state.submitting ? 'disabled' : ''}>
              <div class="bt-action-icon">🛡</div>
              <div class="bt-action-label">방어</div>
              <div class="bt-action-desc">데미지 차감</div>
            </button>
            <button class="bt-action-btn dodge" data-action="dodge" ${state.submitting ? 'disabled' : ''}>
              <div class="bt-action-icon">💨</div>
              <div class="bt-action-label">회피</div>
              <div class="bt-action-desc">8+ 완전회피</div>
            </button>
          </div>
        `}
      ` : `
        <div class="maze-actions">
          <button id="pvp-bt-back" class="maze-btn-action">로비로</button>
        </div>
      `}
    </div>
  `;
}

function attachPvpBattleHandlers(modal, state) {
  document.getElementById('pvp-bt-close')?.addEventListener('click', () => {
    if (pvpUnsubscribe) { pvpUnsubscribe(); pvpUnsubscribe = null; }
    pvpBattleId = null;
    modal.remove();
  });
  document.getElementById('pvp-bt-back')?.addEventListener('click', () => {
    if (pvpUnsubscribe) { pvpUnsubscribe(); pvpUnsubscribe = null; }
    pvpBattleId = null;
    modal.remove();
    showPvpLobby();
  });

  modal.querySelectorAll('.bt-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (state.submitting) return;
      if (state.battle?.status !== 'active') return;
      const me = state.battle.players[state.mySlot];
      if (me?.ready) return;

      state.submitting = true;
      const action = btn.dataset.action;
      const dice = rollD10();
      playSfx('blip');
      try {
        await Backend.submitBattleAction(state.battleId, state.mySlot, action, dice);
      } catch (err) {
        console.error('[pvp] 행동 등록 실패:', err);
        showToast('⚠ 등록 실패', 'warn');
      } finally {
        state.submitting = false;
      }
    });
  });
}


/**
 * Up/Down 게임 UI
 */
function showUpDownGame() {
  if (!currentPet || currentPet.isDead) return;
  const existing = document.getElementById('minigame-modal');
  if (existing) { existing.remove(); return; }

  const cfg = CONFIG.MINIGAME_CONFIG.UPDOWN;
  const answer = Math.floor(Math.random() * (cfg.MAX - cfg.MIN + 1)) + cfg.MIN;
  const reward = checkMinigameRewardEligibility();

  const state = {
    answer,
    tries: 0,
    maxTries: cfg.MAX_TRIES,
    history: [],
    low: cfg.MIN,
    high: cfg.MAX,
    finished: false,
  };

  const modal = document.createElement('div');
  modal.id = 'minigame-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = renderUpDownContent(state, reward);

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  attachUpDownHandlers(modal, state, reward);
}

function renderUpDownContent(state, reward) {
  const remaining = state.maxTries - state.tries;
  const rewardText = isMinigameTestMode()
    ? '◆ 테스트 모드 (저장 안 됨)'
    : '◆ 보상 제한 없음';

  return `
    <div class="talk-modal-head" style="background:#1a3d28;">
      <span>UP/DOWN · 숫자 맞추기 ${isMinigameTestMode() ? '· <span style="color:#e8a853;">[TEST]</span>' : ''}</span>
      <span class="talk-close" id="minigame-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body" style="display:block;padding:14px;">
      <div style="color:#8fb39a;font-size:11px;margin-bottom:8px;">
        ${state.finished ? '' : `MARS II가 ${CONFIG.MINIGAME_CONFIG.UPDOWN.MIN}-${CONFIG.MINIGAME_CONFIG.UPDOWN.MAX} 중 숫자 하나를 생각했다.`}
      </div>

      <div style="background:#050a07;border:1px dotted #2d5a3e;padding:12px;margin-bottom:10px;">
        <div style="font-size:11px;color:#8fb39a;margin-bottom:6px;">
          범위: ${state.low} ~ ${state.high}  ·  시도 ${state.tries} / ${state.maxTries}
        </div>
        <div id="updown-history" style="font-size:12px;line-height:1.7;min-height:60px;color:#03B352;white-space:pre-line;">
${state.history.length > 0 ? state.history.join('\n') : '(아직 추측 없음)'}
        </div>
      </div>

      ${state.finished ? `
        <div style="padding:10px;border:1px solid ${state.won ? '#e8a853' : '#5fb37a'};background:${state.won ? '#1a1505' : '#0a1410'};color:${state.won ? '#e8a853' : '#8fb39a'};font-size:12px;line-height:1.6;text-align:center;">
          ${state.won
            ? `◆ 정답! 정답은 ${state.answer}이었다.<br>MARS II가 웃는다.`
            : `◇ 시간 끝. 정답은 ${state.answer}이었다.<br>MARS II가 살짝 아쉬워한다.`}
          ${state.rewardApplied
            ? `<div style="margin-top:6px;color:#c9c9c9;font-size:11px;">${state.rewardText}</div>`
            : reward.eligible
              ? ''
              : `<div style="margin-top:6px;color:#666;font-size:11px;">(오늘 보상 한도 초과 · 놀이만 함)</div>`
          }
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;">
          <button id="updown-again"
            style="flex:1;background:#0a3818;border:1px solid #03B352;color:#03B352;padding:10px;cursor:pointer;font-family:inherit;font-size:12px;">
            다시 하기
          </button>
          <button id="updown-exit"
            style="flex:1;background:transparent;border:1px solid #2d5a3e;color:#8fb39a;padding:10px;cursor:pointer;font-family:inherit;font-size:12px;">
            그만하기
          </button>
        </div>
      ` : `
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="number" id="updown-input" min="${state.low}" max="${state.high}"
            placeholder="${state.low}-${state.high}"
            style="flex:1;background:#050a07;border:1px solid #2d5a3e;color:#03B352;
            padding:10px;font-family:inherit;font-size:14px;text-align:center;">
          <button id="updown-submit"
            style="background:#0a3818;border:1px solid #03B352;color:#03B352;padding:10px 18px;cursor:pointer;font-family:inherit;font-size:12px;">
            [↵] 추측
          </button>
        </div>
        <div style="margin-top:8px;font-size:10px;color:#666;text-align:center;">
          ${rewardText}
        </div>
      `}
    </div>
  `;
}

function attachUpDownHandlers(modal, state, reward) {
  document.getElementById('minigame-close')?.addEventListener('click', () => modal.remove());

  const submit = async () => {
    const input = document.getElementById('updown-input');
    if (!input) return;
    const guess = parseInt(input.value);
    if (isNaN(guess) || guess < state.low || guess > state.high) {
      showToast(`⚠ ${state.low}-${state.high} 범위에서 선택해주세요`, 'warn');
      return;
    }

    state.tries++;
    if (guess === state.answer) {
      state.history.push(`${guess} → ✓ 정답!`);
      state.finished = true;
      state.won = true;
      await onUpDownFinish(state, reward);
    } else {
      if (guess < state.answer) {
        state.history.push(`${guess} → ↑ 더 큰 수`);
        state.low = Math.max(state.low, guess + 1);
      } else {
        state.history.push(`${guess} → ↓ 더 작은 수`);
        state.high = Math.min(state.high, guess - 1);
      }
      if (state.tries >= state.maxTries) {
        state.finished = true;
        state.won = false;
        await onUpDownFinish(state, reward);
      }
    }

    // 다시 렌더
    modal.innerHTML = renderUpDownContent(state, reward);
    attachUpDownHandlers(modal, state, reward);
    // input에 포커스
    setTimeout(() => document.getElementById('updown-input')?.focus(), 50);
  };

  document.getElementById('updown-submit')?.addEventListener('click', submit);
  document.getElementById('updown-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
  });
  // 자동 포커스
  setTimeout(() => document.getElementById('updown-input')?.focus(), 50);

  document.getElementById('updown-again')?.addEventListener('click', () => {
    modal.remove();
    showUpDownGame();
  });
  document.getElementById('updown-exit')?.addEventListener('click', () => modal.remove());
}

/**
 * Up/Down 게임 종료 처리
 */
async function onUpDownFinish(state, reward) {
  // 테스트 모드: 저장/로그 스킵
  if (isMinigameTestMode()) {
    state.rewardApplied = true;
    state.rewardText = `(테스트 · 저장 안 됨)`;
    return;
  }

  // 보상 적용 여부 판단
  if (!reward.eligible) {
    state.rewardApplied = false;
    // 로그만 남김
    await Backend.addLog({
      user: currentUser.name, action: 'MINIGAME',
      text: `숫자 맞추기 ${state.won ? '성공' : '실패'} (보상 없음)`,
      type: 'system',
    });
    return;
  }

  // 보상 계산 (성격 변화 적정)
  // 승리 = 오른쪽 성격 강화, 패배 = 왼쪽 성격 전환
  let reward_text = '';
  const triesUsed = state.tries;
  currentPet.personality = currentPet.personality || {};
  if (state.won) {
    if (triesUsed <= 3) {
      // 빠른 승리
      currentPet.happy = Math.min(100, currentPet.happy + 10);
      currentPet.bond = Math.min(100, (currentPet.bond || 0) + 1);
      currentPet.personality.socialVsIntro = Math.min(100, (currentPet.personality.socialVsIntro || 0) + 1);
      currentPet.personality.activeVsCalm = Math.min(100, (currentPet.personality.activeVsCalm || 0) + 1);
      reward_text = `happy +10, bond +1, 사교 +1, 활발 +1`;
    } else if (triesUsed <= 5) {
      // 보통 승리
      currentPet.happy = Math.min(100, currentPet.happy + 7);
      currentPet.bond = Math.min(100, (currentPet.bond || 0) + 1);
      currentPet.personality.diligentVsFree = Math.min(100, (currentPet.personality.diligentVsFree || 0) + 1);
      reward_text = `happy +7, bond +1, 성실 +1`;
    } else {
      // 늦은 승리 (아슬아슬) → 차분으로 전환
      currentPet.happy = Math.min(100, currentPet.happy + 5);
      currentPet.personality.activeVsCalm = Math.max(-100, (currentPet.personality.activeVsCalm || 0) - 2);
      currentPet.personality.diligentVsFree = Math.min(100, (currentPet.personality.diligentVsFree || 0) + 1);
      reward_text = `happy +5, 차분 +2, 성실 +1`;
    }
  } else {
    // 실패: 왼쪽 성격으로 전환 (반성/차분/절제)
    currentPet.happy = Math.min(100, currentPet.happy + 3);
    currentPet.personality.activeVsCalm = Math.max(-100, (currentPet.personality.activeVsCalm || 0) - 2);
    currentPet.personality.greedVsTemperance = Math.max(-100, (currentPet.personality.greedVsTemperance || 0) - 2);
    currentPet.personality.socialVsIntro = Math.max(-100, (currentPet.personality.socialVsIntro || 0) - 1);
    reward_text = `happy +3, 차분 +2, 절제 +2, 내향 +1`;
  }

  await incrementMinigameCount();
  state.rewardApplied = true;
  state.rewardText = reward_text;
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'MINIGAME',
    text: `숫자 맞추기 ${state.won ? `성공 (${triesUsed}회)` : '실패'} → ${reward_text}`,
    type: 'system',
  });
}

// ────────────────────────────────────────────────────────────
// 시작
// ────────────────────────────────────────────────────────────
async function startGame() {
  renderMain();
  await Backend.init();

  // 세션 시작 시각 기록 (이 이후의 강제 새로고침만 반응)
  const mySessionStartAt = Date.now();
  console.log('[session] 시작 시각:', new Date(mySessionStartAt).toLocaleTimeString());

  Backend.onPetChange(pet => {
    const prevStage = currentPet?.stage;
    currentPet = pet;

    // 강제 새로고침 감지: pet.forceRefreshAt이 내 세션 시작 이후여야만 반응
    // (APP_VERSION 기반 감지는 무한루프 원인이라 제거)
    if (pet.forceRefreshAt && pet.forceRefreshAt > mySessionStartAt) {
      console.warn('[refresh] ⚡ 강제 새로고침 신호 감지:', new Date(pet.forceRefreshAt).toLocaleTimeString());
      showToast(`⚡ 업데이트 감지: 3초 후 자동 새로고침`, 'personality');
      setTimeout(() => location.reload(true), 3000);
      return;
    }

    // 킬스위치: pet.stopTimers=true면 타이머 중단 (긴급 차단용)
    if (pet.stopTimers === true) {
      console.warn('[killswitch] ⚠ 관리자 킬스위치 활성화 - 타이머 모두 중단');
      stopAllTimers();
    }

    // 단계 변화 시 열려있는 미니게임 허브 자동 갱신 (CHILD 진화 대응)
    if (prevStage && prevStage !== pet.stage) {
      const hubOpen = document.getElementById('minigame-hub-modal');
      if (hubOpen) {
        hubOpen.remove();
        setTimeout(showMinigameHub, 100);
      }
    }

    render();
  });
  Backend.onLogsChange(newLogs => { logs = newLogs; render(); });

  // 동접자(presence) 구독 & heartbeat
  Backend.onPresenceChange(map => {
    presenceMap = map;
    render();
  });

  // 관리자는 presence에 잡히지 않도록
  if (!currentUser.isAdmin) {
    // 즉시 1번
    Backend.updatePresence(currentUser.name);
    // 10초 후 한 번 더 (첫 쓰기가 실패했을 경우 대비)
    setTimeout(() => Backend.updatePresence(currentUser.name), 10 * 1000);
    // 이후 3분마다 heartbeat (온라인 판정 5분이므로 여유)
    // 쿼터 절약을 위해 너무 자주 쓰지 않음
    timers.heartbeat = setInterval(
      () => Backend.updatePresence(currentUser.name),
      3 * 60 * 1000
    );
  }

  // 눈 깜빡임 애니메이션 시작
  startBlinking();
  // 짧은 말풍선 타이머 시작
  startBubbleTimer();
  // ASCII 클릭 리스너 (첫 렌더 후 약간 지연해서 연결)
  setTimeout(attachPetTapListener, 300);

  // 자동 스냅샷 (1시간마다, 중복 방지는 localStorage)
  startAutoSnapshot();

  // 브라우저 탭 닫기/이동 시 presence 제거
  if (!currentUser.isAdmin) {
    window.addEventListener('beforeunload', () => {
      // sendBeacon 또는 동기 처리 (브라우저가 페이지 떠날 때 비동기는 못 쓸 수 있음)
      try {
        Backend.removePresence(currentUser.name);
      } catch (e) { /* 무시 */ }
    });
    // pagehide도 (모바일에서 더 신뢰)
    window.addEventListener('pagehide', () => {
      try {
        Backend.removePresence(currentUser.name);
      } catch (e) { /* 무시 */ }
    });
  }

  // 로그인 시 맞이 대사 (EGG 단계 아니고, 관리자 아닐 때)
  setTimeout(() => {
    if (!currentPet || currentPet.isDead) return;
    if (currentPet.stage === 'EGG') return;
    if (currentUser.isAdmin) return;

    const { fav, least } = getCrewFavorites(currentPet);
    const vars = {
      user: currentUser.name, name: currentPet.name,
      prevUser: prevUser || '누군가', fav, least,
    };

    // 70% 맞이 대사, 30% 시간대 인사
    const welcome = Math.random() < 0.7
      ? getWelcomeSpeech(currentPet, currentUser.name, vars)
      : getTimeGreeting(currentPet, vars);

    if (welcome) {
      saveSpeechForUser(currentPet, currentUser.name, { text: welcome, at: Date.now(), to: currentUser.key });
      Backend.savePet(currentPet);
    }
  }, 500);

  // 주기적 틱 (5초) + 유휴 대사 + 신호 자동 발사 + 라디오
  let lastIdleWriteAt = 0;  // 유휴 대사 쓰기 쿨다운
  let lastSignalCheckAt = 0;  // 신호 발사 체크 쿨다운
  let lastRadioCheckAt = 0;   // 라디오 체크 쿨다운
  timers.tick = setInterval(() => {
    if (!currentPet || currentPet.isDead) return;

    const now = Date.now();

    // ─────── 신호 자동 발사 + 만료 체크 (1분에 1회) ───────
    if (now - lastSignalCheckAt > 60 * 1000) {
      lastSignalCheckAt = now;
      processSignalSystem();
    }

    // ─────── 라디오 이벤트 (1분에 1회) ───────
    if (now - lastRadioCheckAt > 60 * 1000) {
      lastRadioCheckAt = now;
      radioTick();
    }

    // 개인 대사 기준으로 마지막 시점 계산 (공용 lastSpeech로는 판정 오류 발생)
    const personalSpeech = getVisibleSpeech(currentPet, currentUser.name);
    const last = personalSpeech?.at || 0;

    // 조건 1: 마지막 대사 10분 이상 경과
    // 조건 2: 유휴 대사 쓰기 후 최소 5분 쿨다운 (무한 쓰기 방지)
    const elapsedSinceLastSpeech = now - last;
    const elapsedSinceIdleWrite = now - lastIdleWriteAt;

    if (elapsedSinceLastSpeech > 10 * 60 * 1000 && elapsedSinceIdleWrite > 5 * 60 * 1000) {
      const { fav, least } = getCrewFavorites(currentPet);
      const vars = {
        user: currentUser.name, name: currentPet.name,
        prevUser: prevUser || '누군가',
        fav, least,
      };
      // 위기 대사 > 신호 회상(20%) > EGG 메시지 회상(15%) > 회상 대사(10%) > 시간대 인사(20%) > 유휴
      const warn = getWarningSpeech(currentPet, vars);
      const hasSignalRecall = currentPet.stage !== 'EGG'
                            && Object.values(currentPet.signals || {})
                                .some(s => s.completedAt && !s.skipped);
      const shouldRecallSignal = hasSignalRecall && Math.random() < 0.2;
      const hasEggMsgs = (currentPet.eggMessages?.length || 0) > 0
                      && currentPet.stage !== 'EGG';
      const shouldRecallEgg = hasEggMsgs && Math.random() < 0.15;
      const shouldRecall = currentPet.stage !== 'EGG' && currentPet.stage !== 'BABY'
                         && (currentPet.memorableQuotes?.length || 0) > 0
                         && Math.random() < 0.1;
      const spk = warn
        || (shouldRecallSignal ? getSignalRecall(currentPet, vars) : null)
        || (shouldRecallEgg ? getEggMessageRecall(currentPet, vars) : null)
        || (shouldRecall ? getQuoteRecall(currentPet, vars) : null)
        || (Math.random() < 0.2 ? getTimeGreeting(currentPet, vars) : null)
        || getIdleSpeech(currentPet, vars);
      if (spk) {
        saveSpeechForUser(currentPet, currentUser.name, {
          text: spk, at: now, to: currentUser.key
        });
        Backend.savePet(currentPet);
        lastIdleWriteAt = now;  // 쿨다운 시작
      }
    }
    render();
  }, 5000);
}

// ────────────────────────────────────────────────────────────
// 부팅
// ────────────────────────────────────────────────────────────
(function bootstrap() {
  const saved = sessionStorage.getItem('nk_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    startGame();
  } else {
    renderLogin();
  }
})();

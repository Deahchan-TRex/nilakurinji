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
  pickBubbleSpeech, pickTapSpeech,
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
│        2026.03 INTAKE — MARS II          │
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
              <pre class="pet-art" id="pet-art"></pre>
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

  // 키보드 단축키
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    if (key === 'f') showActionSubmenu('feed');
    else if (key === 'p') showActionSubmenu('play');
    else if (key === 's') handleAction('sleep');
    else if (key === 'c') handleAction('clean');
    else if (key === 't') handleAction('train');
    else if (key === 'l') showLore();
    else if (key === 'k') showTalkMenu();
    else if (key === 'n') showSignalList();
    else if (key === 'g') showMinigameHub();
    else if (key === 'q') showPendingQuestions();
  });
}

// ────────────────────────────────────────────────────────────
// 명령 버튼
// ────────────────────────────────────────────────────────────
function renderCommandButtons() {
  const mainCmds = document.getElementById('cmds-main');
  const adminCmds = document.getElementById('cmds-admin');

  mainCmds.innerHTML = `
    <button class="cmd primary" data-act="feed">[F] FEED</button>
    <button class="cmd primary" data-act="play">[P] PLAY</button>
    <button class="cmd primary" data-act="sleep">[S] SLEEP</button>
    <button class="cmd primary" data-act="clean">[C] CLEAN</button>
    <button class="cmd primary" data-act="train">[T] TRAIN</button>
    <button class="cmd primary" data-act="talk">[K] TALK</button>
  `;

  // 관리자가 아닐 경우: SIGNAL / UP-DOWN / PENDING / LORE / LOGOUT
  if (!currentUser.isAdmin) {
    adminCmds.innerHTML = `
      <button class="cmd" data-act="signal" style="grid-column: span 2;">[N] SIGNAL</button>
      <button class="cmd" data-act="minigame" style="grid-column: span 2;">[G] UP/DOWN</button>
      <button class="cmd" data-act="pending" style="grid-column: span 2;">[Q] 말함</button>
      <button class="cmd" data-act="lore">[L] LORE</button>
      <button class="cmd" data-act="logout">[X] LOGOUT</button>
    `;
  } else {
    // 관리자일 경우: 상단 줄 (핵심 명령)
    adminCmds.innerHTML = `
      <button class="cmd admin" data-act="reset">[R] RESET 전체</button>
      <button class="cmd admin" data-act="edit">[E] EDIT</button>
      <button class="cmd admin" data-act="status">STATUS</button>
      <button class="cmd admin" data-act="help">HELP</button>
    `;

    // 관리자 시뮬레이션 바 추가 (단계 점프)
    let simBar = document.getElementById('cmds-sim');
    if (!simBar) {
      simBar = document.createElement('div');
      simBar.id = 'cmds-sim';
      simBar.className = 'cmds';
      simBar.style.marginTop = '4px';
      adminCmds.parentNode.insertBefore(simBar, adminCmds.nextSibling);
    }
    simBar.innerHTML = `
      <button class="cmd admin" data-act="sim-egg">→ EGG</button>
      <button class="cmd admin" data-act="sim-baby">→ BABY</button>
      <button class="cmd admin" data-act="sim-child">→ CHILD</button>
      <button class="cmd admin" data-act="sim-teen">→ TEEN</button>
      <button class="cmd admin" data-act="sim-adult">→ ADULT</button>
      <button class="cmd admin" data-act="sim-kill">→ DEAD</button>
    `;

    // 스탯/성격 프리셋 바
    let presetBar = document.getElementById('cmds-preset');
    if (!presetBar) {
      presetBar = document.createElement('div');
      presetBar.id = 'cmds-preset';
      presetBar.className = 'cmds';
      presetBar.style.marginTop = '4px';
      simBar.parentNode.insertBefore(presetBar, simBar.nextSibling);
    }
    presetBar.innerHTML = `
      <button class="cmd admin" data-act="preset-full">스탯 MAX</button>
      <button class="cmd admin" data-act="preset-low">스탯 LOW</button>
      <button class="cmd admin" data-act="signal-admin">신호 제어</button>
      <button class="cmd admin" data-act="finale">FINALE</button>
      <button class="cmd admin" data-act="minigame">UP/DOWN</button>
      <button class="cmd admin" data-act="pending">말함</button>
      <button class="cmd admin" data-act="forcerefresh">⚡ 전체 새로고침</button>
      <button class="cmd admin" data-act="killswitch">🔒 킬스위치</button>
      <button class="cmd admin" data-act="trimlogs">🧹 LOG 정리</button>
      <button class="cmd admin" data-act="clearlogs">LOG 리셋</button>
      <button class="cmd" data-act="lore">LORE</button>
    `;

    // 시간 조작 바 (hour 단위 성장)
    let timeBar = document.getElementById('cmds-time');
    if (!timeBar) {
      timeBar = document.createElement('div');
      timeBar.id = 'cmds-time';
      timeBar.className = 'cmds';
      timeBar.style.marginTop = '4px';
      presetBar.parentNode.insertBefore(timeBar, presetBar.nextSibling);
    }
    timeBar.innerHTML = `
      <button class="cmd admin" data-act="age-1">+1h</button>
      <button class="cmd admin" data-act="age-3">+3h</button>
      <button class="cmd admin" data-act="age-6">+6h</button>
      <button class="cmd admin" data-act="age-12">+12h</button>
      <button class="cmd admin" data-act="age-24">+24h</button>
      <button class="cmd admin" data-act="age-custom">⏱ 커스텀</button>
    `;

    // 스탯 개별 조작 바
    let statBar = document.getElementById('cmds-stat');
    if (!statBar) {
      statBar = document.createElement('div');
      statBar.id = 'cmds-stat';
      statBar.className = 'cmds';
      statBar.style.marginTop = '4px';
      timeBar.parentNode.insertBefore(statBar, timeBar.nextSibling);
    }
    statBar.innerHTML = `
      <button class="cmd admin" data-act="edit-stat">스탯 편집</button>
      <button class="cmd admin" data-act="edit-persona">성격 편집</button>
      <button class="cmd admin" data-act="snapshotsave">💾 SNAP</button>
      <button class="cmd admin" data-act="snapshotlist">♻ RESTORE</button>
      <button class="cmd admin" data-act="adminrevive">REVIVE</button>
      <button class="cmd" data-act="logout">LOGOUT</button>
    `;
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
function handleCommand(raw) {
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
 * → 펜딩 질문으로 저장해서 나중에 다른 크루가 답할 수 있게
 */
async function savePendingQuestion(raw) {
  if (!currentPet || currentPet.isDead) return;
  if (!raw || raw.trim().length < 2) return;

  currentPet.pendingQuestions = currentPet.pendingQuestions || [];
  currentPet.pendingQuestions.push({
    user: currentUser.name,
    text: raw.trim().slice(0, 120),  // 최대 120자
    at: Date.now(),
    answered: false,
    answer: null,
    answerBy: null,
    answerAt: null,
  });
  // 최대 50개 유지 (오래된 것 삭제)
  if (currentPet.pendingQuestions.length > 50) {
    currentPet.pendingQuestions = currentPet.pendingQuestions.slice(-50);
  }

  await Backend.savePet(currentPet);
  appendSystemLog(`◎ 질문이 기록되었어. 언젠가 답이 돌아올지도 몰라.`, 'personality');
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
  const effTxt = Object.entries(actualEff)
    .filter(([k]) => !['label','desc','exp'].includes(k))
    .map(([k,v]) => `${k} ${v>0?'+':''}${v}`).join(' / ');

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
  document.getElementById('pet-art').textContent = renderTeddy(currentPet);
  document.getElementById('stage-badge').textContent = currentPet.stage;
  // 탭 리스너 유지 (DOM이 바뀌었을 수도 있으니 확인)
  attachPetTapListener();

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
    // 다음 단계까지 남은 시간 계산
    const hoursLived = Math.max(0, (Date.now() - currentPet.bornAt) / 3600000);
    const stageInfo = CONFIG.STAGES.find(s => s.name === currentPet.stage);
    const nextStageInfo = stageInfo ? CONFIG.STAGES.find(s => s.fromHour === stageInfo.toHour) : null;
    const hoursToNext = stageInfo ? Math.max(0, stageInfo.toHour - hoursLived) : 0;
    const nextStageName = nextStageInfo?.name || null;

    document.getElementById('pet-extras').innerHTML = `
      <div class="kv-row"><span class="k">STRENGTH</span><span class="v hl">${Math.round(currentPet.strength)}</span></div>
      <div class="kv-row"><span class="k">INTEL</span><span class="v hl">${Math.round(currentPet.intel)}</span></div>
      <div class="kv-row"><span class="k">BOND</span><span class="v hl">${Math.round(currentPet.bond)}</span></div>
      <div class="kv-row"><span class="k">LEVEL</span><span class="v">${currentPet.level || 1}</span></div>
      ${nextStageName ? `
        <div class="kv-row divider-top"><span class="k">→ ${nextStageName}</span>
          <span class="v" style="color:#e8a853;">${Math.floor(hoursToNext)}h</span>
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
    speechWrapper.innerHTML = `
      <div class="speech">
        <div class="speech-head">
          <span>▶ ${currentPet.name} · ${lastSpeech ? timeAgo(lastSpeech.at) : '–'}${showAddressee ? ' · ' + getUserNameByKey(lastSpeech.to) + '에게' : ''}</span>
        </div>
        <div class="speech-body">${lastSpeech?.text || '…'}</div>
      </div>
    `;
  }

  // 로그 (최신 로그 ID 기억해서 새 로그만 애니메이션)
  const logBody = document.getElementById('log-body');
  const lastShownAt = logBody.dataset.lastAt ? Number(logBody.dataset.lastAt) : 0;
  let newestAt = lastShownAt;

  // 개인용 archive 필터링: viewer 필드가 없거나 본인인 것만
  const visibleLogs = logs.filter(l =>
    !l.viewer || l.viewer === currentUser.name
  );

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

  // 성격
  document.getElementById('persona').innerHTML = `
    ${personaRow('활발', currentPet.personality.activeVsCalm, '차분')}
    ${personaRow('탐욕', currentPet.personality.greedVsTemperance, '절제')}
    ${personaRow('사교', currentPet.personality.socialVsIntro, '내향')}
    ${personaRow('성실', currentPet.personality.diligentVsFree, '자유')}
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
  const v = val || 0;
  // -100~+100 → 0~4 인덱스
  const idx = Math.max(0, Math.min(4, Math.round(((v + 100) / 200) * 4)));
  let dots = '';
  for (let i = 0; i < 5; i++) {
    if (i === idx) dots += '<span class="me"></span>';
    else if (i < idx) dots += '<span class="on"></span>';
    else dots += '<span></span>';
  }
  return `<div class="persona-row"><span>${left}</span><span class="dots">${dots}</span><span>${right}</span></div>`;
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

    // 깜빡임 한 번
    petArt.textContent = renderTeddyBlink(currentPet);
    setTimeout(() => {
      if (!currentPet) return;
      const art = document.getElementById('pet-art');
      if (art) art.textContent = renderTeddy(currentPet);
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
function handlePetTap() {
  if (!currentPet || currentPet.isDead) return;

  // 연타 방지 (팔 벌리기 애니메이션 4초 동안은 중복 실행 안 함)
  const now = Date.now();
  if (now - lastTapAt < 4000) return;
  lastTapAt = now;

  // 팔 벌리기 애니메이션 (4초, 오래 유지)
  const petArt = document.getElementById('pet-art');
  if (petArt && currentPet.stage !== 'EGG') {
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
  const speech = pickTapSpeech(currentPet, {
    user: currentUser.name,
    name: currentPet.name,
    fav, least,
  });

  if (speech) {
    saveSpeechForUser(currentPet, currentUser.name, {
      text: speech, at: now, to: currentUser.key,
    });
    Backend.savePet(currentPet);
  }

  // 가벼운 반응 이모티콘
  const tapEmotes = ['heart2', 'sparkle', 'note', 'bubble'];
  const picked = tapEmotes[Math.floor(Math.random() * tapEmotes.length)];
  showEmote(picked);

  // 아주 가벼운 부가 스탯 (값 폭주 방지)
  currentPet.bond = Math.min(100, (currentPet.bond || 0) + 0.05);
  currentPet.intel = Math.min(100, (currentPet.intel || 0) + 0.03);
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

  // 오늘의 대화 세션 초기화/확인
  initDailyTalk(currentPet);
  const dt = currentPet.dailyTalk;

  if (dt.turnsLeft <= 0) {
    appendSystemLog('💬 오늘은 이미 충분히 이야기했어. 내일 또 만나.', 'system');
    return;
  }

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

  if (topicCandidates.length === 0 || dt.turnsLeft <= 0) {
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
  if (!dt || dt.turnsLeft <= 0) return;

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
  dt.turnsLeft -= 1;

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
    if (dt.turnsLeft > 0) {
      renderTalkMenu();
    } else {
      closeTalkSession();
    }
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
function showSignalList() {
  const existing = document.getElementById('signal-list-modal');
  if (existing) { existing.remove(); return; }

  const signals = listActiveSignals(currentPet)
    .filter(s => !s.skipped);  // 시스템 활성화 전 스킵된 건 안 보임

  if (signals.length === 0) {
    showToast('📡 아직 수신된 신호가 없습니다', 'system');
    return;
  }

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
        ${signals.map(s => renderSignalListItem(s)).join('')}
      </div>
    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  document.getElementById('signal-list-close').addEventListener('click', () => modal.remove());
  modal.querySelectorAll('[data-signal-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.signalId;
      modal.remove();
      showSignalDetail(id);
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

      <div style="background:#050a07;border:1px dotted #2d5a3e;padding:14px;font-size:13px;line-height:1.7;letter-spacing:0.5px;min-height:80px;white-space:pre-wrap;${isComplete ? 'color:#e8a853;' : 'color:#03B352;'}">
${text || '(아직 신호를 열지 않았습니다)'}
      </div>

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
function showSignalAdminPanel() {
  if (!currentUser?.isAdmin) return;
  const existing = document.getElementById('signal-admin-modal');
  if (existing) { existing.remove(); return; }

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
        ` : fired.map(s => renderSignalAdminRow(s)).join('')}
      </div>

    </div>
  `;

  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  // 이벤트 핸들러
  document.getElementById('sigadmin-close').addEventListener('click', () => modal.remove());

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
 */
function showPendingQuestions() {
  if (!currentPet) return;
  const existing = document.getElementById('pending-modal');
  if (existing) { existing.remove(); return; }

  const all = currentPet.pendingQuestions || [];
  const unanswered = all.filter(q => !q.answered);
  const answered = all.filter(q => q.answered);

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

      ${unanswered.length === 0 ? `
        <div style="color:#666;font-size:12px;text-align:center;padding:20px 0;">
          아직 답 기다리는 말이 없어.
        </div>
      ` : unanswered.slice().reverse().map((q, revIdx) => {
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

      ${answered.length > 0 ? `
        <div style="margin-top:16px;border-top:1px dotted #2d5a3e;padding-top:10px;">
          <div style="color:#8fb39a;font-size:11px;font-weight:bold;margin-bottom:8px;">
            ◢ 답한 말 (${answered.length}개)
          </div>
          ${answered.slice().reverse().map(q => `
            <div class="pending-answered-row" data-qidx="${all.indexOf(q)}"
              style="padding:8px 10px;margin-bottom:6px;background:#050a07;border:1px solid #1a3d28;font-size:11px;line-height:1.6;cursor:pointer;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:#8fb39a;">${q.user} · <span style="color:#c9c9c9;">"${q.text.slice(0, 30).replace(/</g, '&lt;')}${q.text.length > 30 ? '...' : ''}"</span></span>
                <span style="color:#666;font-size:10px;">▶ 답 보기</span>
              </div>
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

  document.getElementById('pending-close').addEventListener('click', () => modal.remove());

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

      // 답변 저장
      q.answered = true;
      q.answer = trimmed;
      q.answerBy = currentUser.name;
      q.answerAt = Date.now();

      // 아이 대사로 즉시 노출 (질문한 유저에게 개인 대사)
      const speech = `${q.user}, "${q.text}"... ${trimmed}`;
      saveSpeechForUser(currentPet, q.user, {
        text: speech, at: Date.now(), to: q.user,
      });

      await Backend.savePet(currentPet);
      await Backend.addLog({
        user: currentUser.name, action: 'ANSWER',
        text: `${q.user}의 오래된 말에 답함`,
        type: 'personality',
      });
      showToast(`${q.user}에게 답이 전해졌어`, 'personality');
      modal.remove();
      setTimeout(showPendingQuestions, 200);
    });
  });

  modal.querySelectorAll('.pending-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      if (!confirm('이 질문을 삭제합니다. 계속할까요?')) return;
      currentPet.pendingQuestions.splice(idx, 1);
      await Backend.savePet(currentPet);
      modal.remove();
      setTimeout(showPendingQuestions, 200);
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
 * 오늘 보상 가능 횟수 체크
 */
function checkMinigameRewardEligibility() {
  // 테스트 모드: 항상 eligible, 카운트는 "테스트" 라벨
  if (isMinigameTestMode()) {
    return { eligible: true, count: 0, limit: CONFIG.MINIGAME_CONFIG.DAILY_REWARD_LIMIT, testMode: true };
  }
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  const mg = currentPet.minigameToday;
  if (!mg || mg.dayKey !== dayKey) {
    return { eligible: true, count: 0, limit: CONFIG.MINIGAME_CONFIG.DAILY_REWARD_LIMIT };
  }
  return {
    eligible: mg.count < CONFIG.MINIGAME_CONFIG.DAILY_REWARD_LIMIT,
    count: mg.count,
    limit: CONFIG.MINIGAME_CONFIG.DAILY_REWARD_LIMIT,
  };
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
  const unlocked = (stage === 'CHILD' || stage === 'TEEN' || stage === 'ADULT');

  // BABY는 바로 Up/Down 실행 (기존 동작 유지)
  if (!unlocked && !currentUser.isAdmin) {
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
      </div>

      <div style="margin-top:14px;font-size:10px;color:#666;text-align:center;">
        ${reward.testMode
          ? '◆ 테스트 모드 (무제한, 저장 안 됨)'
          : reward.eligible
            ? `◆ 오늘 보상 가능 (${reward.count}/${reward.limit})`
            : `◇ 오늘 보상 끝 · 놀이만 가능`}
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
    });
  });
}

// ════════════════════════════════════════════════════════════
// 블랙잭 (BLACKJACK)
// ════════════════════════════════════════════════════════════

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
  };

  // 초기 2장씩 배분
  state.player.push(state.deck.pop(), state.deck.pop());
  state.dealer.push(state.deck.pop(), state.deck.pop());

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
        <div style="color:#8fb39a;font-size:11px;margin-bottom:6px;">
          MARS II · ${state.hideDealer ? '?' : dv}
        </div>
        <div class="bj-hand" id="bj-dealer-hand" style="display:flex;gap:8px;flex-wrap:wrap;">
          ${state.dealer.map((c, i) => bjCardHTML(c, i === 1 && state.hideDealer)).join('')}
        </div>
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

  return `
    <div style="padding:12px;border:1px solid ${m.color};background:${m.bg};margin-top:14px;text-align:center;">
      <div style="color:${m.color};font-size:14px;font-weight:bold;margin-bottom:4px;">${m.label}</div>
      <div style="color:#c9c9c9;font-size:11px;">${m.story}</div>
      <div style="color:#666;font-size:10px;margin-top:6px;">당신 ${pv} · MARS II ${dv}</div>
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
    }
    state.animating = false;
    renderBlackjack(modal, state);
    attachBlackjackHandlers(modal, state);
  });

  document.getElementById('bj-stand')?.addEventListener('click', async () => {
    if (state.animating || state.phase !== 'player') return;
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

  // 테스트 모드: 저장 스킵
  if (isMinigameTestMode()) {
    state.rewardText = `(테스트 · ${JSON.stringify(reward).slice(0, 40)}...)`;
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
    state.rewardText = `(테스트 · ${JSON.stringify(reward).slice(0, 40)}...)`;
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
  const rewardText = reward.eligible
    ? `◆ 오늘 보상 가능 (${reward.count}/${reward.limit})`
    : `◇ 오늘 보상 끝 · 놀이 기록은 남음`;

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

  // 보상 계산
  // 승리: 시도 횟수 적을수록 보상↑ / 실패: 적은 보상
  let reward_text = '';
  const triesUsed = state.tries;
  if (state.won) {
    if (triesUsed <= 3) {
      // 빠른 승리
      currentPet.happy = Math.min(100, currentPet.happy + 10);
      currentPet.bond = Math.min(100, (currentPet.bond || 0) + 2);
      currentPet.personality = currentPet.personality || {};
      currentPet.personality.socialVsIntro = Math.min(100, (currentPet.personality.socialVsIntro || 0) + 2);
      reward_text = `happy +10, bond +2, 사교 +2`;
    } else if (triesUsed <= 5) {
      // 보통 승리
      currentPet.happy = Math.min(100, currentPet.happy + 7);
      currentPet.bond = Math.min(100, (currentPet.bond || 0) + 1);
      currentPet.personality = currentPet.personality || {};
      currentPet.personality.diligentVsFree = Math.min(100, (currentPet.personality.diligentVsFree || 0) + 1);
      reward_text = `happy +7, bond +1, 성실 +1`;
    } else {
      // 늦은 승리
      currentPet.happy = Math.min(100, currentPet.happy + 5);
      currentPet.personality = currentPet.personality || {};
      currentPet.personality.activeVsCalm = Math.max(-100, (currentPet.personality.activeVsCalm || 0) - 1);
      reward_text = `happy +5, 차분 +1`;
    }
  } else {
    // 실패 보상 (작음, 차분한 성격 부여)
    currentPet.happy = Math.min(100, currentPet.happy + 3);
    currentPet.personality = currentPet.personality || {};
    currentPet.personality.activeVsCalm = Math.max(-100, (currentPet.personality.activeVsCalm || 0) - 2);
    currentPet.personality.greedVsTemperance = Math.max(-100, (currentPet.personality.greedVsTemperance || 0) - 1);
    reward_text = `happy +3, 차분 +2, 절제 +1`;
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

  // 주기적 틱 (5초) + 유휴 대사 + 신호 자동 발사
  let lastIdleWriteAt = 0;  // 유휴 대사 쓰기 쿨다운
  let lastSignalCheckAt = 0;  // 신호 발사 체크 쿨다운
  timers.tick = setInterval(() => {
    if (!currentPet || currentPet.isDead) return;

    const now = Date.now();

    // ─────── 신호 자동 발사 + 만료 체크 (1분에 1회) ───────
    if (now - lastSignalCheckAt > 60 * 1000) {
      lastSignalCheckAt = now;
      processSignalSystem();
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

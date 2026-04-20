// ============================================================
// app.js - UI 진입점 및 상태 관리
// ============================================================

import { CONFIG } from './config.js';
import { Backend } from './backend.js';
import { renderTeddy, renderTeddyBlink } from './teddy.js';
import {
  tickStats, updateStage, applyAction, revive,
  personalityLabel, getProgress,
  getEggNarrative, getEggNarrativeIndex,
  getStageNarrative, getStageNarrativeKey,
} from './game.js';
import {
  getActionSpeech, getWarningSpeech, getIdleSpeech,
  pickSpeech, SPEECHES, getCrewFavorites,
  getTimeGreeting, getWelcomeSpeech, getTalkTopics, getTalkResponse,
  pickTalkTurnCount, getTalkFarewell,
  recordMemorableQuote, getQuoteRecall, getEggMessageRecall,
  getNextTopicChoices, getTopicBridge,
  matchGreeting, getGreetingResponse,
  pickBubbleSpeech,
} from './speeches.js';

// ────────────────────────────────────────────────────────────
// 전역 상태
// ────────────────────────────────────────────────────────────
let currentUser = null;   // { name, key, isAdmin }
let currentPet = null;
let logs = [];
let prevUser = null;
let presenceMap = {};     // { userName: lastSeenMs }

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

  // 관리자가 아닐 경우: LORE / LOGOUT / HELP
  if (!currentUser.isAdmin) {
    adminCmds.innerHTML = `
      <button class="cmd" data-act="lore" style="grid-column: span 2;">[L] LORE</button>
      <button class="cmd" data-act="logout" style="grid-column: span 2;">[X] LOGOUT</button>
      <button class="cmd" data-act="help" style="grid-column: span 2;">[?] HELP</button>
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
      <button class="cmd admin" data-act="preset-active">활발/사교</button>
      <button class="cmd admin" data-act="clearlogs">LOG 리셋</button>
      <button class="cmd admin" data-act="backup">JSON 백업</button>
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
      else if (act === 'clearlogs') adminClearLogs();
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
    appendSystemLog(`⚠ "${head}": 알 수 없는 명령입니다. help 입력.`, 'warn');
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

  appendSystemLog(`⚠ "${head}": 알 수 없는 명령입니다. help 입력.`, 'warn');
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

  const menuDef = action === 'feed' ? CONFIG.FEED_MENU
                : action === 'play' ? CONFIG.PLAY_MENU
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
  const speech = getActionSpeech(action, currentPet, {
    user: currentUser.name,
    prevUser: prevUser || '누군가',
    name: currentPet.name,
    fav, least,
    submenuLabel: submenuItem?.label,
  });
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
  });
}

// ────────────────────────────────────────────────────────────
// 화면 렌더 (구독 콜백에서 매번 호출)
// ────────────────────────────────────────────────────────────
function render() {
  if (!currentPet) return;

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
    document.getElementById('pet-extras').innerHTML = `
      <div class="kv-row"><span class="k">STRENGTH</span><span class="v hl">${Math.round(currentPet.strength)}</span></div>
      <div class="kv-row"><span class="k">INTEL</span><span class="v hl">${Math.round(currentPet.intel)}</span></div>
      <div class="kv-row"><span class="k">BOND</span><span class="v hl">${Math.round(currentPet.bond)}</span></div>
      <div class="kv-row"><span class="k">LEVEL</span><span class="v">${currentPet.level || 1}</span></div>
      <div class="kv-row divider-top"><span class="k">REVIVE</span>
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
    // EGG: 해설을 말풍선 자리에 표시
    const narrative = getEggNarrative(currentPet);
    const hoursLived = Math.max(0, (Date.now() - currentPet.bornAt) / 3600000);
    const remaining = Math.max(0, 36 - hoursLived);
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
        // 칼라릴리호 항해 중 — 부화까지 기다려주세요 //
      </div>
    `;
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

  // 로그 테이블을 항상 맨 아래로 스크롤 (최신이 보이게)
  const logContainer = logBody.closest('.log-tbl');
  if (logContainer) {
    logContainer.scrollTop = logContainer.scrollHeight;
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

  // 버튼 비활성화
  const dead = currentPet.isDead;
  const isEgg = currentPet.stage === 'EGG';
  document.querySelectorAll('.cmd.primary').forEach(b => {
    b.disabled = dead || isEgg;
  });

  // 모든 단계: 시간대별 아카이브 해설 자동 노출
  // 각 크루가 새로 접속/갱신 시점에 자기 기준으로 확인
  // narrativeShownKeyBy: { [userName]: lastSeenKey } — 개인별 중복 방지
  const narrativeKey = getStageNarrativeKey(currentPet);
  const viewerName = currentUser.name;
  currentPet.narrativeShownKeyBy = currentPet.narrativeShownKeyBy || {};
  const lastShown = currentPet.narrativeShownKeyBy[viewerName];

  if (narrativeKey && lastShown !== narrativeKey) {
    const narrative = getStageNarrative(currentPet);
    if (narrative) {
      currentPet.narrativeShownKeyBy[viewerName] = narrativeKey;

      // EGG 단계에서는 말풍선 자리를 해설이 차지 (캐릭터가 말을 못 하니까)
      // 개인 대사로 저장해 보는 사람 기준으로 표시
      if (currentPet.stage === 'EGG') {
        saveSpeechForUser(currentPet, viewerName, {
          text: narrative.text, at: Date.now(), to: viewerName,
        });
      }

      Backend.savePet(currentPet);
      // viewerName을 심어서 "이 유저에게만 보이는 로그"로 기록
      Backend.addLog({
        user: null, action: 'ARCHIVE',
        text: narrative.text,
        type: 'system',
        viewer: viewerName,  // 이 필드가 있으면 해당 유저에게만 보임
      });
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
// 추가 기능
// ────────────────────────────────────────────────────────────
async function handleGreeting(greetKey, rawInput) {
  if (!currentPet || currentPet.isDead) {
    appendSystemLog('💭 답을 들을 수 없는 상태입니다.', 'warn');
    return;
  }
  if (currentPet.stage === 'EGG') {
    appendSystemLog('💭 아직 대답할 수 없어요. 부화를 기다려주세요.', 'system');
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
    const bond = pet.bond || 0;
    // 유대에 따라 하루 대화 횟수 결정
    let maxTurns = 4;
    if (bond > 60) maxTurns = 6;
    else if (bond > 30) maxTurns = 5;

    pet.dailyTalk = {
      dayKey,
      usedTopics: [],
      lastTopic: null,
      turnsLeft: maxTurns,
    };
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
      <span>▶ ${headText} <span style="color:#8fb39a;font-weight:400;">(오늘 남은 이야기: ${dt.turnsLeft}회)</span></span>
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
  currentPet.bond = Math.min(100, (currentPet.bond || 0) + 0.3);

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
  });
}

// ────────────────────────────────────────────────────────────
// 시작
// ────────────────────────────────────────────────────────────
async function startGame() {
  renderMain();
  await Backend.init();

  Backend.onPetChange(pet => { currentPet = pet; render(); });
  Backend.onLogsChange(newLogs => { logs = newLogs; render(); });

  // 동접자(presence) 구독 & heartbeat
  Backend.onPresenceChange(map => {
    presenceMap = map;
    render();
  });

  // 관리자는 presence에 잡히지 않도록
  if (!currentUser.isAdmin) {
    Backend.updatePresence(currentUser.name);
    // 2분마다 heartbeat
    setInterval(() => Backend.updatePresence(currentUser.name), 2 * 60 * 1000);
  }

  // 눈 깜빡임 애니메이션 시작
  startBlinking();
  // 짧은 말풍선 타이머 시작
  startBubbleTimer();

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

  // 주기적 틱 (5초) + 유휴 대사
  setInterval(() => {
    if (!currentPet || currentPet.isDead) return;

    // 마지막 대사 10분 이상 경과 시 자동 대사
    const last = currentPet.lastSpeech?.at || 0;
    if (Date.now() - last > 10 * 60 * 1000) {
      const { fav, least } = getCrewFavorites(currentPet);
      const vars = {
        user: currentUser.name, name: currentPet.name,
        prevUser: prevUser || '누군가',
        fav, least,
      };
      // 위기 대사 > EGG 메시지 회상(15%) > 회상 대사(10%) > 시간대 인사(20%) > 유휴
      const warn = getWarningSpeech(currentPet, vars);
      const hasEggMsgs = (currentPet.eggMessages?.length || 0) > 0
                      && currentPet.stage !== 'EGG';
      const shouldRecallEgg = hasEggMsgs && Math.random() < 0.15;
      const shouldRecall = currentPet.stage !== 'EGG' && currentPet.stage !== 'BABY'
                         && (currentPet.memorableQuotes?.length || 0) > 0
                         && Math.random() < 0.1;
      const spk = warn
        || (shouldRecallEgg ? getEggMessageRecall(currentPet, vars) : null)
        || (shouldRecall ? getQuoteRecall(currentPet, vars) : null)
        || (Math.random() < 0.2 ? getTimeGreeting(currentPet, vars) : null)
        || getIdleSpeech(currentPet, vars);
      if (spk) {
        saveSpeechForUser(currentPet, currentUser.name, {
          text: spk, at: Date.now(), to: currentUser.key
        });
        Backend.savePet(currentPet);
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

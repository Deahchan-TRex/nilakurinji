// ============================================================
// app.js - UI 진입점 및 상태 관리
// ============================================================

import { CONFIG } from './config.js';
import { Backend } from './backend.js';
import { renderTeddy } from './teddy.js';
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
} from './speeches.js';

// ────────────────────────────────────────────────────────────
// 전역 상태
// ────────────────────────────────────────────────────────────
let currentUser = null;   // { name, key, isAdmin }
let currentPet = null;
let logs = [];
let prevUser = null;

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
        <pre style="color:#1a3d28;font-family:'VT323',monospace;font-size:13px;line-height:1.05;white-space:pre;text-align:center;margin-bottom:14px;">┌─────────────────────────────────────────────┐
│                                             │
│   N I L A K U R I N J I   M A N I F E S T   │
│          CREW ACCESS TERMINAL v2.4          │
│        2026.03 INTAKE — COHORT 087          │
│                                             │
└─────────────────────────────────────────────┘</pre>
        <h1>칼라릴리호 · 관리 단말</h1>
        <div class="sub">CREW AUTHENTICATION REQUIRED</div>

        <div class="lore-block">
          <div class="lore-title">▶ 꽃잎 속 이름 // SUBJECT-02847</div>
          <div class="lore-body">
            이 름 &nbsp;&nbsp;&nbsp;&nbsp;: <span class="hl">크림슨 오퍼튜니티 마르스 II</span><br>
            온 곳 &nbsp;&nbsp;&nbsp;&nbsp;: <span class="hl">붉은 땅</span> / 기회를 쫓던 이들의 자리<br>
            아 버 지 &nbsp;: <span class="warn">크림슨 오퍼튜니티 마르스 I — 그 땅에 묻혔다</span><br>
            이 름 의 뜻 : 오래전 붉은 행성을 걸었던 탐사선을 기린다<br>
            상 태 &nbsp;&nbsp;&nbsp;&nbsp;: 꽃잎에 싸여 대기 / <span class="hl">COHORT 087</span> 명단<br>
            부 기 &nbsp;&nbsp;&nbsp;&nbsp;: '사슬' 한 가닥 허용 — 고향과 겨우 이어진 실
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

        <div class="login-hint">// CALLA-LILY MANIFEST SYSTEM // COHORT 087 //</div>
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
              <span>SUBJECT-02847</span>
              <span class="badge" id="stage-badge">EGG</span>
            </div>
            <div class="tbl-body">
              <pre class="pet-art" id="pet-art"></pre>
              <div class="pet-id">
                <div class="cn">${CONFIG.PET_NAME}</div>
                <div class="full">${CONFIG.PET_FULLNAME}</div>
                <div class="origin">◣ ${CONFIG.PET_ORIGIN} ◥</div>
              </div>
              <div class="pet-tags">
                <span class="tag">FROM MARS</span>
                <span class="tag">AGE 13</span>
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
    const map = { f: 'feed', p: 'play', s: 'sleep', c: 'clean', t: 'train', l: 'lore', k: 'talk' };
    const act = map[e.key.toLowerCase()];
    if (act === 'lore') showLore();
    else if (act === 'talk') showTalkMenu();
    else if (act) handleAction(act);
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
    // 관리자일 경우: 두 줄 — 관리 명령 + 시뮬레이션 점프
    adminCmds.innerHTML = `
      <button class="cmd admin" data-act="reset">[R] RESET</button>
      <button class="cmd admin" data-act="edit">[E] EDIT</button>
      <button class="cmd admin" data-act="adminrevive">[V] REVIVE</button>
      <button class="cmd admin" data-act="backup">[B] BACKUP</button>
      <button class="cmd" data-act="lore">[L] LORE</button>
      <button class="cmd" data-act="logout">[X] LOGOUT</button>
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
      <button class="cmd admin" data-act="preset-intro">내향/차분</button>
      <button class="cmd admin" data-act="preset-diligent">성실/절제</button>
      <button class="cmd admin" data-act="status">STATUS</button>
    `;
  }

  document.querySelectorAll('.cmd').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'lore') showLore();
      else if (act === 'talk') showTalkMenu();
      else if (act === 'reset') adminReset();
      else if (act === 'edit') adminEdit();
      else if (act === 'adminrevive') adminRevive();
      else if (act === 'backup') adminBackup();
      else if (act === 'logout') doLogout();
      else if (act === 'help') showHelp();
      else if (act === 'status') adminStatus();
      else if (act.startsWith('sim-')) adminSimJump(act.slice(4));
      else if (act.startsWith('preset-')) adminPreset(act.slice(7));
      else handleAction(act);
    });
  });
}

// ────────────────────────────────────────────────────────────
// 프롬프트 명령 처리
// ────────────────────────────────────────────────────────────
function handleCommand(raw) {
  const cmd = raw.toLowerCase();
  const [head, ...args] = cmd.split(/\s+/);

  // 기본 행동
  if (['feed','play','sleep','clean','train'].includes(head)) {
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
async function handleAction(action) {
  if (!currentPet) return;

  tickStats(currentPet);
  const result = applyAction(currentPet, action, currentUser.name);

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
    return;
  }

  // 크루 최애/가장 뜸한 크루 계산
  const { fav, least } = getCrewFavorites(currentPet);

  // 대사 생성
  const speech = getActionSpeech(action, currentPet, {
    user: currentUser.name,
    prevUser: prevUser || '누군가',
    name: currentPet.name,
    fav, least,
  });
  if (speech) {
    currentPet.lastSpeech = { text: speech, at: Date.now(), to: currentUser.key };
  }
  prevUser = currentUser.name;

  const eff = CONFIG.ACTIONS[action];
  const effTxt = Object.entries(eff)
    .filter(([k]) => !['label','desc','exp'].includes(k))
    .map(([k,v]) => `${k} ${v>0?'+':''}${v}`).join(' / ');

  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: eff.label,
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
    `CYCLE ${String(progress.day).padStart(2,'0')}/${CONFIG.DURATION_DAYS} · ${progress.hoursLived}h`;

  // 캐릭터 아트 (표정 동적)
  document.getElementById('pet-art').textContent = renderTeddy(currentPet);
  document.getElementById('stage-badge').textContent = currentPet.stage;

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
          <span>▶ ARCHIVE LOG // COHORT 087</span>
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
    const lastSpeech = currentPet.lastSpeech;
    speechWrapper.innerHTML = `
      <div class="speech">
        <div class="speech-head">
          <span>▶ ${currentPet.name} · ${lastSpeech ? timeAgo(lastSpeech.at) : '–'}${lastSpeech?.to && lastSpeech.to !== '__sys__' ? ' · ' + getUserNameByKey(lastSpeech.to) + '에게' : ''}</span>
        </div>
        <div class="speech-body">${lastSpeech?.text || '…'}</div>
      </div>
    `;
  }

  // 로그
  document.getElementById('log-body').innerHTML = logs.length
    ? logs.map(l => {
        const t = new Date(l.at).toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
        const cls = l.type === 'warn' ? 'warn' : l.type === 'epic' ? 'epic' : l.type === 'system' ? 'system' : l.type === 'admin' ? 'admin' : '';
        return `<tr class="${cls}"><td class="time">${t}</td><td class="user">${l.user || 'SYS'}</td><td class="action">${l.action || '-'}</td><td class="effect">${l.text || ''}</td></tr>`;
      }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#4a5f50;padding:14px;">기록 없음</td></tr>';

  // 성격
  document.getElementById('persona').innerHTML = `
    ${personaRow('활발', currentPet.personality.activeVsCalm, '차분')}
    ${personaRow('탐욕', currentPet.personality.greedVsTemperance, '절제')}
    ${personaRow('사교', currentPet.personality.socialVsIntro, '내향')}
    ${personaRow('성실', currentPet.personality.diligentVsFree, '자유')}
    <div class="persona-label">◆ ${personalityLabel(currentPet)} ◆</div>
  `;

  // 크루 (본인만 표시 — 페이지 길이 축소)
  document.getElementById('crew-list').innerHTML = `
    <table>
      <tr class="me">
        <td class="dot">●</td>
        <td>${currentUser.name} (ME)</td>
      </tr>
      <tr class="off" style="font-size:10px;">
        <td class="dot">·</td>
        <td style="color:#6b8f76;">외 ${CONFIG.MEMBERS.length - 1}명</td>
      </tr>
    </table>
  `;
  document.getElementById('crew-online').textContent = '01';

  // 미션 진행률
  document.getElementById('mission').innerHTML = `
    <div class="mission-info">COHORT 087 · CYCLE</div>
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
  // 단계가 바뀌면 키가 바뀌므로 새 단계에서도 처음부터 다시 노출됨
  const narrativeKey = getStageNarrativeKey(currentPet);
  if (narrativeKey && currentPet.narrativeShownKey !== narrativeKey) {
    const narrative = getStageNarrative(currentPet);
    if (narrative) {
      currentPet.narrativeShownKey = narrativeKey;

      // EGG 단계에서는 말풍선 자리를 해설이 차지 (캐릭터가 말을 못 하니까)
      // BABY 이후부터는 캐릭터 대사를 방해하지 않도록 로그에만 기록
      if (currentPet.stage === 'EGG') {
        currentPet.lastSpeech = { text: narrative.text, at: Date.now(), to: '__sys__' };
      }

      Backend.savePet(currentPet);
      Backend.addLog({
        user: null, action: 'ARCHIVE',
        text: narrative.text,
        type: 'system',
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
      currentPet.lastSpeech = { text, at: Date.now(), to: '__sys__' };
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
// 추가 기능
// ────────────────────────────────────────────────────────────
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
  lines.forEach((l, i) => {
    setTimeout(() => Backend.addLog({ user: 'SYS', action: 'LORE', text: l, type: 'system' }), i * 100);
  });
}

// ────────────────────────────────────────────────────────────
// TALK 모달 — 대화 주제 선택 팝업
// ────────────────────────────────────────────────────────────
function showTalkMenu() {
  if (!currentPet || currentPet.isDead) return;
  if (currentPet.stage === 'EGG') {
    appendSystemLog('⚠ 아직 대화할 수 없습니다. 부화를 기다려주세요.', 'warn');
    return;
  }

  // 이미 열려있으면 닫기 (토글)
  const existing = document.getElementById('talk-modal');
  if (existing) { existing.remove(); return; }

  const topics = getTalkTopics();
  const modal = document.createElement('div');
  modal.id = 'talk-modal';
  modal.className = 'talk-modal';
  modal.innerHTML = `
    <div class="talk-modal-head">
      <span>▶ 무슨 이야기를 할까?</span>
      <span class="talk-close" id="talk-close">✕ 닫기</span>
    </div>
    <div class="talk-modal-body">
      ${topics.map(t => `
        <button class="talk-option" data-topic="${t.key}">${t.label}</button>
      `).join('')}
    </div>
  `;

  // 말풍선 영역 위에 끼워넣기
  const wrapper = document.getElementById('speech-wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(modal, wrapper);
  }

  // 닫기
  document.getElementById('talk-close').addEventListener('click', () => modal.remove());

  // 주제 선택
  modal.querySelectorAll('.talk-option').forEach(btn => {
    btn.addEventListener('click', () => {
      handleTalk(btn.dataset.topic);
      modal.remove();
    });
  });
}

async function handleTalk(topicKey) {
  if (!currentPet || currentPet.isDead) return;

  const { fav, least } = getCrewFavorites(currentPet);
  const vars = {
    user: currentUser.name,
    prevUser: prevUser || '누군가',
    name: currentPet.name,
    fav, least,
  };

  const response = getTalkResponse(topicKey, currentPet, vars);
  if (!response) {
    appendSystemLog('⚠ 주제를 불러오지 못했습니다.', 'warn');
    return;
  }

  // 캐릭터 대사로 응답
  currentPet.lastSpeech = { text: response, at: Date.now(), to: currentUser.key };
  prevUser = currentUser.name;

  // 대화는 happy +3 (소소한 즐거움)
  currentPet.happy = Math.min(100, currentPet.happy + 3);
  currentPet.bond = Math.min(100, (currentPet.bond || 0) + 0.3);

  // 대화도 크루 기억에 기록 (약한 무게)
  currentPet.crewMemory = currentPet.crewMemory || {};
  const mem = currentPet.crewMemory[currentUser.name] || {
    feed: 0, play: 0, sleep: 0, clean: 0, train: 0, talk: 0,
    total: 0, lastAction: null, lastAt: 0,
  };
  mem.talk = (mem.talk || 0) + 1;
  mem.total = (mem.total || 0) + 0.5;  // 대화는 돌봄의 절반 가중치
  mem.lastAction = 'talk';
  mem.lastAt = Date.now();
  currentPet.crewMemory[currentUser.name] = mem;

  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'TALK',
    text: `💬 ${SPEECHES.talkTopics[topicKey]?.label || topicKey}`,
    type: 'action',
  });
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
  currentPet.lastSpeech = { text, at: Date.now(), to: currentUser.key };
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'REVIVE',
    text: `💫 부활 성공. 남은 기회: ${r.remaining}`,
    type: 'epic',
  });
}

function doLogout() {
  sessionStorage.removeItem('nk_user');
  location.reload();
}

// ────────────────────────────────────────────────────────────
// 관리자 명령
// ────────────────────────────────────────────────────────────
async function adminReset() {
  if (!currentUser.isAdmin) return;
  if (!confirm('전체 상태를 초기화합니다. 계속할까요?')) return;
  await Backend.reset();
  await Backend.addLog({
    user: currentUser.name, action: 'RESET',
    text: '⚙ 관리자가 전체 리셋을 수행했습니다.',
    type: 'admin',
  });
}

async function adminRevive() {
  if (!currentUser.isAdmin) return;
  if (!currentPet.isDead) {
    appendSystemLog('⚠ 사망 상태가 아닙니다.', 'warn');
    return;
  }
  revive(currentPet, true); // 강제
  currentPet.lastSpeech = {
    text: pickSpeech(SPEECHES.revived, { user: currentUser.name, name: currentPet.name }),
    at: Date.now(), to: '__admin__',
  };
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
  await Backend.savePet(currentPet);
  await Backend.addLog({
    user: currentUser.name, action: 'AGE',
    text: `⚙ 나이 ${hours > 0 ? '+' : ''}${hours}h 조정`,
    type: 'admin',
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
  currentPet.lastSpeech = { text, at: Date.now(), to: '__admin__' };
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
  if (!confirm('모든 로그를 삭제합니다. 계속할까요?')) return;
  if (CONFIG.LOCAL_TEST_MODE) {
    localStorage.removeItem('nk_logs');
  }
  logs = [];
  // 빈 배열로 다시 리스너 호출
  await Backend.addLog({
    user: currentUser.name, action: 'CLEAR',
    text: '⚙ 로그 초기화됨',
    type: 'admin',
  });
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
      currentPet.lastSpeech = { text: welcome, at: Date.now(), to: currentUser.key };
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
      // 위기 대사 > 시간대 인사(20%) > 유휴
      const warn = getWarningSpeech(currentPet, vars);
      const spk = warn
        || (Math.random() < 0.2 ? getTimeGreeting(currentPet, vars) : null)
        || getIdleSpeech(currentPet, vars);
      if (spk) {
        currentPet.lastSpeech = { text: spk, at: Date.now(), to: '__sys__' };
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

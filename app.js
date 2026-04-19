// ============================================================
// app.js - UI 진입점 및 상태 관리
// ============================================================

import { CONFIG } from './config.js';
import { Backend } from './backend.js';
import { renderTeddy } from './teddy.js';
import {
  tickStats, updateStage, applyAction, revive,
  personalityLabel, getProgress,
} from './game.js';
import {
  getActionSpeech, getWarningSpeech, getIdleSpeech,
  pickSpeech, SPEECHES,
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
        <span>NILAKURINJI-01 // DOCK BAY 7</span>
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
        <h1>닐라쿠린지호 · 관리 단말</h1>
        <div class="sub">CREW AUTHENTICATION REQUIRED</div>

        <div class="lore-block">
          <div class="lore-title">▶ CARGO MANIFEST // SUBJECT-02847</div>
          <div class="lore-body">
            DESIGNATION &nbsp;: <span class="hl">크림슨 오퍼튜니티 마르스 II</span><br>
            ORIGIN &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span class="hl">아레스 베이스 원</span> / 행성 간 자원 개발 사무소<br>
            PARENT &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span class="warn">크림슨 오퍼튜니티 마르스 I (deceased)</span><br>
            NAMING &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 화성 탐사선 『오퍼튜니티』를 기림<br>
            STATUS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 수송 대기 / <span class="hl">COHORT 087</span> 배속<br>
            NOTE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: '사슬' 소지 허가 / 고향 연락 가능
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

        <div class="login-hint">// 관리자 권한은 ${CONFIG.ADMIN_KEYWORD}로 입력하세요 //</div>
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
        <span><span class="status-dot"></span>NILAKURINJI-01 // CREW: <span id="current-user"></span><span id="admin-badge"></span></span>
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
    document.getElementById('admin-hint').textContent = `// locked 명령은 ${CONFIG.ADMIN_KEYWORD} 권한 필요 //`;
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
    const map = { f: 'feed', p: 'play', s: 'sleep', c: 'clean', t: 'train', l: 'lore' };
    if (map[e.key.toLowerCase()]) handleAction(map[e.key.toLowerCase()]);
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
    <button class="cmd" data-act="lore">[L] LORE</button>
  `;

  const lock = currentUser.isAdmin ? 'admin' : 'locked';
  adminCmds.innerHTML = `
    <button class="cmd ${lock}" data-act="reset">[R] RESET</button>
    <button class="cmd ${lock}" data-act="edit">[E] EDIT</button>
    <button class="cmd ${lock}" data-act="adminrevive">[V] REVIVE</button>
    <button class="cmd ${lock}" data-act="backup">[B] BACKUP</button>
    <button class="cmd" data-act="logout">[X] LOGOUT</button>
    <button class="cmd" data-act="help">[?] HELP</button>
  `;

  document.querySelectorAll('.cmd').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('locked')) {
        appendSystemLog(`⚠ ${CONFIG.ADMIN_KEYWORD} 권한이 필요합니다.`, 'warn');
        return;
      }
      const act = btn.dataset.act;
      if (act === 'lore') showLore();
      else if (act === 'reset') adminReset();
      else if (act === 'edit') adminEdit();
      else if (act === 'adminrevive') adminRevive();
      else if (act === 'backup') adminBackup();
      else if (act === 'logout') doLogout();
      else if (act === 'help') showHelp();
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
  if (head === 'help' || head === '?') return showHelp();
  if (head === 'logout' || head === 'exit') return doLogout();

  // 관리자 전용
  if (!currentUser.isAdmin) {
    appendSystemLog(`⚠ "${head}": 알 수 없는 명령이거나 ${CONFIG.ADMIN_KEYWORD} 권한 필요`, 'warn');
    return;
  }

  if (head === 'reset') return adminReset();
  if (head === 'revive') return adminRevive();
  if (head === 'backup') return adminBackup();
  if (head === 'restore') return adminRestore();
  if (head === 'kill') return adminKill();
  if (head === 'evolve') return adminEvolve(args[0]);
  if (head === 'set') return adminSet(args[0], args[1]);

  appendSystemLog(`⚠ "${head}": 알 수 없는 명령입니다. help 입력.`, 'warn');
}

// ────────────────────────────────────────────────────────────
// 기본 행동
// ────────────────────────────────────────────────────────────
async function handleAction(action) {
  if (!currentPet) return;

  tickStats(currentPet);
  const result = applyAction(currentPet, action);

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

  // 대사 생성
  const speech = getActionSpeech(action, currentPet, {
    user: currentUser.name, prevUser: prevUser || '누군가', name: currentPet.name,
  });
  if (speech) {
    currentPet.lastSpeech = { text: speech, at: Date.now(), to: currentUser.key };
  }
  prevUser = currentUser.name;

  // EXP 증가분 전달용 로그
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

  // 부가 스탯
  document.getElementById('pet-extras').innerHTML = `
    <div class="kv-row"><span class="k">STRENGTH</span><span class="v hl">${Math.round(currentPet.strength)}</span></div>
    <div class="kv-row"><span class="k">INTEL</span><span class="v hl">${Math.round(currentPet.intel)}</span></div>
    <div class="kv-row"><span class="k">BOND</span><span class="v hl">${Math.round(currentPet.bond)}</span></div>
    <div class="kv-row"><span class="k">LEVEL</span><span class="v">${currentPet.level || 1}</span></div>
    <div class="kv-row divider-top"><span class="k">REVIVE</span>
      <span class="v" style="color:#c97d5f;">${renderReviveDots(currentPet.deathCount)}</span>
    </div>
  `;

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

  // 크루 (현재는 나 혼자만 online으로 표시 — 나중에 Firebase presence로 확장)
  document.getElementById('crew-list').innerHTML = `
    <table>
      ${CONFIG.MEMBERS.map(m => {
        const isMe = m.key === currentUser.key;
        return `<tr class="${isMe ? 'me' : 'off'}">
          <td class="dot">${isMe ? '●' : '·'}</td>
          <td>${m.name}${isMe ? ' (ME)' : ''}</td>
        </tr>`;
      }).join('')}
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
    '── 크림슨 오퍼튜니티 마르스 2세 ──',
    '',
    '아버지 1세는 화성의 아레스 베이스 원에서',
    '행성 간 자원 개발 사무소 소속으로 일했다.',
    '광부의 생은 고단했고, 마지막 크레딧은',
    '2세에게 보내졌다.',
    '',
    '이름 \'오퍼튜니티\'는 2000년대 지구의',
    '붉은 행성 탐사선에서 따왔다.',
    '크림슨 가계 대대로 내려오는 이름이다.',
    '',
    '지금 이 아이는 닐라쿠린지호에 승선했고,',
    '\'사슬\'을 통해 아버지가 없는 고향과',
    '가늘게 연결되어 있다.',
  ];
  lines.forEach((l, i) => {
    setTimeout(() => Backend.addLog({ user: 'SYS', action: 'LORE', text: l, type: 'system' }), i * 100);
  });
}

function showHelp() {
  const cmds = [
    'feed / play / sleep / clean / train — 기본 행동',
    'lore — 세계관 정보',
    'logout — 로그아웃',
    currentUser.isAdmin ? '──── ADMIN ────' : null,
    currentUser.isAdmin ? 'reset — 전체 초기화' : null,
    currentUser.isAdmin ? 'revive — 강제 부활 (카운트 소모 안함)' : null,
    currentUser.isAdmin ? 'kill — 강제 사망 (테스트)' : null,
    currentUser.isAdmin ? 'set <stat> <value> — 스탯 직접 설정 (예: set hunger 80)' : null,
    currentUser.isAdmin ? 'evolve <stage> — 진화 강제 (egg/baby/child/teen/adult)' : null,
    currentUser.isAdmin ? 'backup — JSON 백업 다운로드' : null,
    currentUser.isAdmin ? 'restore — 백업 파일로 복원' : null,
  ].filter(Boolean);
  cmds.forEach((l, i) => {
    setTimeout(() => Backend.addLog({ user: 'SYS', action: 'HELP', text: l, type: 'system' }), i * 80);
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

// ────────────────────────────────────────────────────────────
// 시작
// ────────────────────────────────────────────────────────────
async function startGame() {
  renderMain();
  await Backend.init();

  Backend.onPetChange(pet => { currentPet = pet; render(); });
  Backend.onLogsChange(newLogs => { logs = newLogs; render(); });

  // 주기적 틱 (5초) + 유휴 대사
  setInterval(() => {
    if (!currentPet || currentPet.isDead) return;

    // 마지막 대사 10분 이상 경과 시 자동 대사
    const last = currentPet.lastSpeech?.at || 0;
    if (Date.now() - last > 10 * 60 * 1000) {
      const warn = getWarningSpeech(currentPet, {
        user: currentUser.name, name: currentPet.name,
      });
      const spk = warn || getIdleSpeech(currentPet, {
        user: currentUser.name, name: currentPet.name,
      });
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

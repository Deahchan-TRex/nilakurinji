// ============================================================
// config.js - 게임 설정 (운영자가 이 파일만 수정)
// ============================================================

export const CONFIG = {
  // ── 캐릭터 기본 ───────────────────────────────────────
  PET_NAME: 'MARS II',
  PET_FULLNAME: '크림슨 오퍼튜니티 마르스 2세',
  PET_ORIGIN: 'MARS / AB-1',
  // 캐릭터가 '처음 생성될 때' 탄생 시각으로 사용됨.
  // 한 번 DB에 저장된 이후에는 DB 값이 유지되므로 변경해도 영향 없음.
  // 새로 시작하려면 관리자 로그인 후 /reset 실행.
  // 예시: '2026-05-01T20:00:00+09:00'
  PET_BIRTH: new Date().toISOString(),
  DURATION_DAYS: 14,

  // ── 관리자 인증 ───────────────────────────────────────
  ADMIN_KEYWORD: 'OBJECT',

  // ── 24명 사전 등록 승무원 ────────────────────────────
  MEMBERS: [
    { name: '마레',       key: '마레' },
    { name: '무진',       key: '무진' },
    { name: '카탸',       key: '카탸' },
    { name: '에이',       key: '에이' },
    { name: '줄리안',     key: '줄리안' },
    { name: '볼크',       key: '볼크' },
    { name: '요로나',     key: '요로나' },
    { name: '메이',       key: '메이' },
    { name: '바시르',     key: '바시르' },
    { name: '파트리시오', key: '파트리시오' },
    { name: '유진',       key: '유진' },
    { name: '칼',         key: '칼' },
    { name: '소콜로바',   key: '소콜로바' },
    { name: '체이스',     key: '체이스' },
    { name: '앤디',       key: '앤디' },
    { name: '켈시',       key: '켈시' },
    { name: '시마',       key: '시마' },
    { name: '레프',       key: '레프' },
    { name: '딘메이',     key: '딘메이' },
    { name: '콜튼',       key: '콜튼' },
    { name: '카나',       key: '카나' },
    { name: '소냐',       key: '소냐' },
    { name: '필립',       key: '필립' },
    { name: '토요',       key: '토요' },
  ],

  // ── 스탯 감소율 (시간당) ──────────────────────────────
  // 24명이 1시간에 각 스탯당 1-2회씩 행동해야 유지되는 페이스
  DECAY_PER_HOUR: {
    hunger:  8,
    happy:   6,
    energy:  5,
    hygiene: 4,
  },

  // ── 행동별 효과 ───────────────────────────────────────
  // 1회 행동으로 2-3시간치 회복. 전체 24명 분량으로 밸런스 유지
  ACTIONS: {
    feed:  { hunger:  20, happy:   3, hygiene: -3, exp: 5,  label: 'FEED',  desc: '먹이주기'  },
    play:  { happy:   20, energy: -12, hunger: -4, exp: 8,  label: 'PLAY',  desc: '놀아주기'  },
    sleep: { energy:  30, hunger:  -6, happy:  2,  exp: 2,  label: 'SLEEP', desc: '재우기'    },
    clean: { hygiene: 25, happy:   5, exp: 3,                 label: 'CLEAN', desc: '씻기기'    },
    train: { energy: -18, hunger: -8, happy: -4, exp: 20, label: 'TRAIN', desc: '훈련하기'  },
  },

  // ── FEED 서브메뉴 ────────────────────────────────────
  // 각 종류별로 스탯 효과 약간 다름. 기본 feed에 덧씌워짐
  FEED_MENU: [
    { key: 'bread',   label: '따뜻한 빵',     override: { hunger: 22, happy: 5 } },
    { key: 'soup',    label: '뜨끈한 수프',   override: { hunger: 18, happy: 6, hygiene: -1 } },
    { key: 'fruit',   label: '붉은 과일',     override: { hunger: 15, happy: 8 } },
    { key: 'sweet',   label: '단 것',         override: { hunger: 12, happy: 12, hygiene: -4 } },
  ],

  // ── PLAY 서브메뉴 ────────────────────────────────────
  PLAY_MENU: [
    { key: 'chase',   label: '술래잡기',  override: { happy: 22, energy: -15, hunger: -5 } },
    { key: 'story',   label: '이야기하기', override: { happy: 18, energy: -5,  hunger: -2 } },
    { key: 'hide',    label: '숨바꼭질',  override: { happy: 20, energy: -10, hunger: -3 } },
    { key: 'draw',    label: '그림 그리기', override: { happy: 16, energy: -6,  hunger: -2 } },
  ],

  // ── 행동 → 성격 영향 ─────────────────────────────────
  PERSONALITY_DELTA: {
    feed:  { greedVsTemperance: +2 },
    play:  { activeVsCalm: +2, socialVsIntro: +1 },
    sleep: { activeVsCalm: -2 },
    clean: { greedVsTemperance: -1, diligentVsFree: +1 },
    train: { diligentVsFree: +2, activeVsCalm: +1 },
  },

  // ── 진화 단계 (시간 기준) ─────────────────────────────
  // 1.5일 EGG → 이후 단계는 자동으로 뒤로 밀림
  STAGES: [
    { name: 'EGG',   fromHour: 0,   toHour: 36  },   // 0 ~ 1.5일
    { name: 'BABY',  fromHour: 36,  toHour: 84  },   // 1.5 ~ 3.5일
    { name: 'CHILD', fromHour: 84,  toHour: 156 },   // 3.5 ~ 6.5일
    { name: 'TEEN',  fromHour: 156, toHour: 264 },   // 6.5 ~ 11일
    { name: 'ADULT', fromHour: 264, toHour: 336 },   // 11 ~ 14일
  ],

  // ── 사망/부활 ─────────────────────────────────────────
  MAX_REVIVES: 3,

  // ── Firebase 설정 (2단계에서 채움) ────────────────────
  FIREBASE: {
    apiKey:            'YOUR_API_KEY',
    authDomain:        'YOUR_PROJECT.firebaseapp.com',
    projectId:         'YOUR_PROJECT_ID',
    storageBucket:     'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId:             'YOUR_APP_ID',
  },

  // ── 로컬 테스트 모드 ──────────────────────────────────
  // true: localStorage로 동작 (혼자 테스트용)
  // false: Firebase 실시간 동기화 (24명 공유)
  LOCAL_TEST_MODE: true,
};

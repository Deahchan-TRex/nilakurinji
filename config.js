// ============================================================
// config.js - 게임 설정 (운영자가 이 파일만 수정)
// ============================================================

export const CONFIG = {
  // ── 앱 버전 (배포마다 올림) ───────────────────────────
  // 이 값이 바뀌면 모든 접속자가 자동 새로고침됨
  APP_VERSION: '2026.04.22.38',

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

  // ── FEED 서브메뉴 (단계별 차별화) ────────────────────
  // 세계관: 영양 공급 시스템이 단계에 따라 다름
  FEED_MENU_BY_STAGE: {
    EGG: [
      { key: 'warmth',    label: '따뜻한 공기',      override: { hunger: 18, happy: 5 } },
      { key: 'nutrient',  label: '영양액 주입',      override: { hunger: 22, happy: 3 } },
      { key: 'sonic',     label: '저주파 진동',      override: { hunger: 14, happy: 8 } },
      { key: 'tempctl',   label: '온도 조절',        override: { hunger: 16, happy: 6, hygiene: 4 } },
    ],
    BABY: [
      { key: 'milk',      label: '보급 영양식',      override: { hunger: 22, happy: 8 } },
      { key: 'paste',     label: '영양 페이스트',    override: { hunger: 20, happy: 4,
                           personality: { greedVsTemperance: -2 } } },
      { key: 'porridge',  label: '따뜻한 죽',        override: { hunger: 18, happy: 10 } },
      { key: 'candy',     label: '달콤한 알약',      override: { hunger: 10, happy: 14, hygiene: -3,
                           personality: { greedVsTemperance: +2 } } },
    ],
    CHILD: [
      { key: 'bread',     label: '따뜻한 빵',        override: { hunger: 22, happy: 5 } },
      { key: 'soup',      label: '뜨끈한 수프',      override: { hunger: 18, happy: 6, hygiene: -1 } },
      { key: 'fruit',     label: '붉은 과일',        override: { hunger: 15, happy: 8,
                           personality: { greedVsTemperance: -2 } } },
      { key: 'sweet',     label: '단 것',            override: { hunger: 12, happy: 12, hygiene: -4,
                           personality: { greedVsTemperance: +2 } } },
    ],
    TEEN: [
      { key: 'ration',    label: '규정 배급식',      override: { hunger: 20, happy: 3,
                           personality: { greedVsTemperance: -3, diligentVsFree: +1 } } },
      { key: 'stew',      label: '고기 스튜',        override: { hunger: 25, happy: 5 } },
      { key: 'premium',   label: '특별 메뉴',        override: { hunger: 20, happy: 15, hygiene: -2,
                           personality: { greedVsTemperance: +3 } } },
      { key: 'stolen',    label: '몰래 빼온 것',     override: { hunger: 15, happy: 18,
                           personality: { greedVsTemperance: +2, diligentVsFree: -3 } } },
    ],
    ADULT: [
      { key: 'last',      label: '마지막 정찬',      override: { hunger: 30, happy: 10 } },
      { key: 'shared',    label: '나눠 먹기',        override: { hunger: 18, happy: 18,
                           personality: { socialVsIntro: +2, greedVsTemperance: -2 } } },
      { key: 'bitter',    label: '쓴 차',            override: { hunger: 10, happy: 8,
                           personality: { greedVsTemperance: -3, activeVsCalm: -2 } } },
      { key: 'sugar',     label: '달콤한 선물',      override: { hunger: 15, happy: 20, hygiene: -3,
                           personality: { greedVsTemperance: +3 } } },
    ],
  },

  // 구버전 호환용 (기본 CHILD)
  FEED_MENU: [
    { key: 'bread',   label: '따뜻한 빵',     override: { hunger: 22, happy: 5 } },
    { key: 'soup',    label: '뜨끈한 수프',   override: { hunger: 18, happy: 6, hygiene: -1 } },
    { key: 'fruit',   label: '붉은 과일',     override: { hunger: 15, happy: 8 } },
    { key: 'sweet',   label: '단 것',         override: { hunger: 12, happy: 12, hygiene: -4 } },
  ],

  // ── PLAY 서브메뉴 (단계별 차별화) ────────────────────
  PLAY_MENU_BY_STAGE: {
    EGG: [
      { key: 'hum',       label: '콧노래 불러주기',  override: { happy: 18, energy: -4, hunger: -2 } },
      { key: 'caress',    label: '알 쓰다듬기',      override: { happy: 22, energy: -3, hunger: -1 } },
      { key: 'rock',      label: '흔들어 주기',      override: { happy: 15, energy: -6, hunger: -3 } },
      { key: 'watch',     label: '조용히 지켜보기',  override: { happy: 10, energy: -1,
                           personality: { activeVsCalm: -2, socialVsIntro: -1 } } },
    ],
    BABY: [
      { key: 'peekaboo',  label: '까꿍 놀이',        override: { happy: 22, energy: -8, hunger: -3 } },
      { key: 'rattle',    label: '장난감 흔들기',    override: { happy: 18, energy: -6, hunger: -2 } },
      { key: 'lullaby',   label: '자장가 불러주기',  override: { happy: 15, energy: -3,
                           personality: { activeVsCalm: -3 } } },
      { key: 'tickle',    label: '간지럽히기',       override: { happy: 20, energy: -10, hunger: -4 } },
    ],
    CHILD: [
      { key: 'chase',     label: '술래잡기',         override: { happy: 22, energy: -15, hunger: -5 } },
      { key: 'story',     label: '이야기하기',       override: { happy: 18, energy: -5, hunger: -2,
                           personality: { activeVsCalm: -1, socialVsIntro: +1 } } },
      { key: 'hide',      label: '숨바꼭질',         override: { happy: 20, energy: -10, hunger: -3 } },
      { key: 'draw',      label: '그림 그리기',      override: { happy: 16, energy: -6, hunger: -2,
                           personality: { activeVsCalm: -2, socialVsIntro: -1, diligentVsFree: +1 } } },
    ],
    TEEN: [
      { key: 'talk',      label: '속마음 얘기',      override: { happy: 20, energy: -4, hunger: -2,
                           personality: { socialVsIntro: +2, activeVsCalm: -1 } } },
      { key: 'spar',      label: '가벼운 겨루기',    override: { happy: 18, energy: -15, hunger: -5 } },
      { key: 'music',     label: '음악 듣기',        override: { happy: 22, energy: -3,
                           personality: { activeVsCalm: -2, diligentVsFree: -2 } } },
      { key: 'stargaze',  label: '별 헤기',          override: { happy: 15, energy: -2,
                           personality: { activeVsCalm: -3, socialVsIntro: -2 } } },
    ],
    ADULT: [
      { key: 'reminisce', label: '추억 더듬기',      override: { happy: 18, energy: -3, hunger: -1,
                           personality: { activeVsCalm: -2, socialVsIntro: -1 } } },
      { key: 'silence',   label: '말없이 있기',      override: { happy: 15, energy: -1,
                           personality: { activeVsCalm: -3, socialVsIntro: -3 } } },
      { key: 'dance',     label: '함께 춤추기',      override: { happy: 25, energy: -12, hunger: -4 } },
      { key: 'promise',   label: '약속 나누기',      override: { happy: 20, energy: -2,
                           personality: { socialVsIntro: +2, diligentVsFree: +1 } } },
    ],
  },

  // 구버전 호환용
  PLAY_MENU: [
    { key: 'chase',   label: '술래잡기',  override: { happy: 22, energy: -15, hunger: -5 } },
    { key: 'story',   label: '이야기하기', override: { happy: 18, energy: -5,  hunger: -2 } },
    { key: 'hide',    label: '숨바꼭질',  override: { happy: 20, energy: -10, hunger: -3 } },
    { key: 'draw',    label: '그림 그리기', override: { happy: 16, energy: -6,  hunger: -2 } },
  ],

  // ── 행동 → 성격 영향 (적정 수치, 24명 누적 고려) ──────
  PERSONALITY_DELTA: {
    feed:  { greedVsTemperance: +1 },
    play:  { activeVsCalm: +1, socialVsIntro: +1 },
    sleep: { activeVsCalm: -1, socialVsIntro: -1 },
    clean: { diligentVsFree: +1 },
    train: { diligentVsFree: +1, activeVsCalm: +1 },
    talk:  { socialVsIntro: +1 },
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

  // ── 미니게임 설정 ─────────────────────────────────────
  MINIGAME_CONFIG: {
    // 하루 보상 받을 수 있는 판 수 (그 이후는 대사만)
    DAILY_REWARD_LIMIT: 3,
    // Up/Down 설정
    UPDOWN: {
      MIN: 1,
      MAX: 30,
      MAX_TRIES: 7,
    },
    // 블랙잭 (happy 중심 · 성격 영향 최소화)
    BLACKJACK: {
      REWARDS: {
        blackjack:  { happy: +15, bond: +2, personality: { activeVsCalm: +2 } },
        win:        { happy: +10, bond: +1, personality: { socialVsIntro: +1, activeVsCalm: +1 } },
        push:       { happy: +3, intel: +1, personality: { activeVsCalm: -1 } },
        lose:       { happy: +1, personality: { activeVsCalm: -1, socialVsIntro: -1 } },
        bust:       { happy: -2, personality: { activeVsCalm: -1, diligentVsFree: +1 } },
      },
    },
    // 틱택토 (intel 중심 · 성격 영향 적정)
    TICTACTOE: {
      AI_OPTIMAL_RATE: 0.65,
      REWARDS: {
        win:  { intel: +6, bond: +1, personality: { diligentVsFree: +2, socialVsIntro: +1 } },
        draw: { intel: +4, personality: { activeVsCalm: -1, diligentVsFree: +1 } },
        lose: { intel: +2, personality: { activeVsCalm: -2, socialVsIntro: -1, diligentVsFree: -1 } },
      },
    },
    // BATTLE - MARS II와의 다이스 결투 (PvE)
    BATTLE: {
      MAX_HP: 30,
      DICE_MAX: 10,            // 1D10
      DODGE_THRESHOLD: 8,      // 다이스 8 이상이면 완전 회피
      // MARS II AI (HP 비율별 행동 분포)
      AI_BEHAVIOR: {
        // HP 75% 이상: 공격 위주
        HIGH:   { attack: 0.7, defend: 0.2, dodge: 0.1 },
        // HP 50% 이상 ~ 75%: 균형
        MID:    { attack: 0.55, defend: 0.3, dodge: 0.15 },
        // HP 25% 이상 ~ 50%: 생존 경향
        LOW:    { attack: 0.5, defend: 0.3, dodge: 0.2 },
        // HP 25% 이하: 회피 자주
        CRIT:   { attack: 0.4, defend: 0.25, dodge: 0.35 },
      },
      REWARDS: {
        // 빠른 승리 (3턴 이내)
        win_fast: { strength: +5, intel: +3, happy: +5,
                    personality: { activeVsCalm: +2, socialVsIntro: +1 } },
        // 보통 승리 (4-6턴)
        win:      { strength: +3, intel: +2, happy: +3,
                    personality: { activeVsCalm: +1 } },
        // 아슬한 승리 (HP 5 이하 + 7턴 이상)
        win_slow: { strength: +1, intel: +1, happy: +1,
                    personality: { activeVsCalm: -1, diligentVsFree: +1 } },
        // 패배
        lose:     { happy: -3,
                    personality: { activeVsCalm: -1, greedVsTemperance: -1 } },
      },
    },
  },

  // ── 라디오 이벤트 ─────────────────────────────────────
  // 하루 3번 랜덤 시각에 크루에게 팝업이 뜨고, 4시간 내 주파수 맞춤
  RADIO_CONFIG: {
    DAILY_COUNT: 3,
    WINDOW_HOURS: 4,           // 팝업 유효 시간
    MIN_GAP_HOURS: 4,          // 각 이벤트 사이 최소 간격
    FREQ_MIN: 0,
    FREQ_MAX: 100,
    TOLERANCE: 3,              // ±3 오차 허용 (맞췄다 판정)
    STAGES_ENABLED: ['TEEN', 'ADULT'],  // TEEN부터 해금
    // 팝업에서 뜰 수 있는 채널 종류
    CHANNELS: [
      {
        id: 'music',
        label: '음악 방송',
        desc: '오래된 연주곡이 흐른다.',
        story: 'MARS II가 리듬에 맞춰 까닥거린다.',
        reward: { happy: +5, bond: +3, personality: { activeVsCalm: +2 } },
      },
      {
        id: 'news',
        label: '뉴스 방송',
        desc: '차분한 목소리가 오늘의 소식을 전한다.',
        story: 'MARS II가 조용히 귀 기울인다.',
        reward: { intel: +5, personality: { activeVsCalm: -2, diligentVsFree: +2 } },
      },
      {
        id: 'whisper',
        label: '속삭임',
        desc: '누군가 아이의 이름을 부르는 것 같다.',
        story: 'MARS II가 굳은 채 신호 너머를 바라본다.',
        reward: { intel: +3, personality: { socialVsIntro: -3, activeVsCalm: -3 } },
      },
      {
        id: 'warning',
        label: '경고 방송',
        desc: '반복되는 금속성 신호. 좌표 같은 숫자들.',
        story: '"...무슨 말인지 모르겠어. 근데 무서워."',
        reward: { intel: +7, personality: { diligentVsFree: +3, activeVsCalm: -2 } },
      },
      {
        id: 'static_voice',
        label: '잡음 속 목소리',
        desc: '잡음 사이로 "...잊지 마..." 라는 말이 들린다.',
        story: 'MARS II가 숨을 참는다.',
        reward: { intel: +4, bond: +2, personality: { socialVsIntro: -2 } },
      },
      {
        id: 'nostalgia',
        label: '옛 노래',
        desc: '아무도 부르지 않은 자장가가 흐른다.',
        story: 'MARS II가 조용히 눈을 감는다.',
        reward: { happy: +3, bond: +4, personality: { activeVsCalm: -3 } },
      },
    ],
    MISSED_PENALTY: { happy: -3, personality: { socialVsIntro: -2 } },
  },

  // ── 미지의 신호 설정 ──────────────────────────────────
  SIGNAL_CONFIG: {
    EXPIRE_HOURS: 24,
    LOW_ENERGY_THRESHOLD: 25,
    CRITICAL_ENERGY_THRESHOLD: 10,
    PENALTY_LOW_ENERGY: { happy: -20, hygiene: -10 },
    FATIGUE_THRESHOLD: 3,
    FATIGUE_HOURS: 12,
    // 각 단계 완료에 필요한 참여자 수 (등급별)
    // 같은 크루는 같은 단계에 2번 참여 불가 (다른 단계는 가능)
    DECODERS_PER_STAGE: { 1: 2, 2: 3, 3: 4 },
  },

  // ── 미지의 신호: 14개 단서 (★ 2단계 / ★★ 3단계 / ★★★ 4단계) ──────
  // costs: 각 단계별 1인당 에너지 소모 (단계별 * 인원수 = 총 에너지)
  // percents: 각 단계 완료 시 공개되는 해독률
  SIGNALS: [
    { id: 'signal-001', tier: 1, triggerHour: 42, name: '빗방울',
      stages: {
        1: '"...아 █ 거 █ 있 █? ...나 █ 여기 █ 있 █."',
        2: '"......아직 거기 있니? ......나는 여기에 있어."',
      },
      percents: { 1: 60, 2: 100 }, costs: { 1: 5, 2: 5 },
      personality: { socialVsIntro: +2 },
      reward: '꿈 조각 "누군가의 목소리" 추가', dream: '누군가의 목소리' },

    { id: 'signal-002', tier: 2, triggerHour: 56, name: '이름의 그림자',
      stages: {
        1: '"...█ █를 █른 █이 있 █. █ █스..."',
        2: '"...네 █를 █른 사람이 있었다. █레스..."',
        3: '"네 이름을 부른 사람이 있었다. 아레스.\n그게 우리가 너에게 처음 지어준 이름이야."',
      },
      percents: { 1: 25, 2: 55, 3: 100 }, costs: { 1: 5, 2: 5, 3: 5 },
      personality: { greedVsTemperance: -3 },
      reward: '원래 이름 "아레스" 해금', originalName: '아레스' },

    { id: 'signal-003', tier: 1, triggerHour: 92, name: '자장가',
      stages: {
        1: '"♪ ...█ █ 언덕 █ █로 / █기 █이 █드 █ / █아오렴... ♪"',
        2: '"♪ ...붉은 언덕 너머로 / 아기 별이 잠드네 / 돌아오렴 ...돌아오렴... ♪\n(노랫소리가 끊기며 잡음으로 사라진다.)"',
      },
      percents: { 1: 55, 2: 100 }, costs: { 1: 5, 2: 5 },
      personality: { activeVsCalm: -2 },
      reward: '수면 시 "엄마의 자장가" 대사 해금' },

    { id: 'signal-004', tier: 2, triggerHour: 108, name: '화성의 아침',
      stages: {
        1: '"...새█이 █다. █리 █ █지 █ █로 █지는..."',
        2: '"...새벽이 █다. █리된 기 █ ██로 퍼지는..."',
        3: '"새벽이 온다. 분리된 기지 위로 퍼지는 붉은 빛.\n우리가 너를 본 마지막 풍경이었다.\n— AB-1 Ares Base One, 2026.03.14"',
      },
      percents: { 1: 30, 2: 60, 3: 100 }, costs: { 1: 5, 2: 5, 3: 5 },
      personality: { activeVsCalm: -3 },
      reward: '꿈 조각 "붉은 새벽" 추가', dream: '붉은 새벽' },

    { id: 'signal-005', tier: 1, triggerHour: 128, name: '생일',
      stages: {
        1: '"오늘 █ █ 생일 █ 걸 █아.\n우리 █ 여기 █ █ █불 █ 켰 █. █리니?"',
        2: '"오늘이 네 생일이라는 걸 알아.\n우리는 여기서도 촛불을 켰다. 들리니?"',
      },
      percents: { 1: 55, 2: 100 }, costs: { 1: 5, 2: 5 },
      personality: { socialVsIntro: +3 },
      reward: '24시간 happy +5 보너스',
      buff: { type: 'happy_bonus', duration: 24 * 3600 * 1000, value: 5 } },

    { id: 'signal-006', tier: 2, triggerHour: 150, name: '흘려본 이름',
      stages: {
        1: '"...이 █지 █ █■■■■ █록 █어 있 █. 24 █의 █■ █록..."',
        2: '"...이 █지에 █■■■■ 기록되어 있다. 24명의 █■ █록..."',
        3: '"이 배에 특별 명단이 기록되어 있다. 24명의 이름 목록.\n선원 명부와는 다른 종이에, 다른 이유로 적혔다.\n그게 무슨 의미인지는 네가 더 자랄 때 알게 될 거야."',
      },
      percents: { 1: 25, 2: 55, 3: 100 }, costs: { 1: 5, 2: 5, 3: 5 },
      personality: { greedVsTemperance: -3 },
      reward: '"왜 우리는 같은 배에 탔을까?" 대사 해금' },

    { id: 'signal-007', tier: 1, triggerHour: 168, name: '흔적',
      stages: {
        1: '"█ 아 █지 █ 남긴 █적 █ 찾 █다.\n책 █ 위 █ █ 돌 █ █."',
        2: '"네 아버지가 남긴 흔적을 찾았다.\n책상 위 작은 돌 하나. 붉은 모래로 된.\n너한테 주고 싶어 했대."',
      },
      percents: { 1: 55, 2: 100 }, costs: { 1: 5, 2: 5 },
      personality: { activeVsCalm: -2 },
      reward: '아카이브 "아버지의 돌" 수집 +1', archive: '아버지의 돌' },

    { id: 'signal-008', tier: 1, triggerHour: 190, name: '아버지의 기록',
      stages: {
        1: '"2026.02.28 — █들 █ █지막 █로 █ 날.\n2026.03.01 — █착장 █ 잠시 █."',
        2: '"2026.02.28 — 아들과 마지막으로 본 날.\n2026.03.01 — 선착장에서 잠시 울었다.\n2026.03.14 — 네 배가 떠났다. 나는 공항에서 하루 종일 서 있었다."',
      },
      percents: { 1: 55, 2: 100 }, costs: { 1: 5, 2: 5 },
      personality: { activeVsCalm: -4 },
      reward: '아카이브 "아버지의 일기" 추가', archive: '아버지의 일기' },

    { id: 'signal-009', tier: 3, triggerHour: 210, name: '이름의 의미',
      stages: {
        1: '"...24 █ █. █ █록 █ █미 █..."',
        2: '"...24명의 █단. █ █록의 █미는..."',
        3: '"24명의 명단. 그 기록의 의미는\n██■■■ 감시 프로그램이다..."',
        4: '"24명의 명단. 그 기록의 의미는 감시 프로그램이다.\n칼라릴리호는 수송선이 아니야.\n너도, 너를 돌보는 이들도, 모두 관찰되고 있다.\n하지만 그들이 모르는 게 하나 있어.\n너희가 서로를 진짜로 돌보고 있다는 것."',
      },
      percents: { 1: 15, 2: 40, 3: 70, 4: 100 }, costs: { 1: 5, 2: 5, 3: 5, 4: 5 },
      personality: { greedVsTemperance: -5, diligentVsFree: +3 },
      reward: '"우리가 서로를 진짜 돌봤던 거야" 대사 해금', majorEvent: true },

    { id: 'signal-010', tier: 2, triggerHour: 240, name: '도착지',
      stages: {
        1: '"...█가 █착 █ █이다. █ █■ █된 █이 아니 █..."',
        2: '"...배가 █착할 █이다. █ █■ 예정된 곳이 아니 █..."',
        3: '"배가 도착할 곳이다. 원래 예정된 곳이 아니다.\n프로키시마 b가 아니라, 시민 재분류 구역.\n내릴 때 각자 다른 곳으로 가게 될지도 몰라. 마음의 준비를."',
      },
      percents: { 1: 30, 2: 60, 3: 100 }, costs: { 1: 5, 2: 5, 3: 5 },
      personality: { socialVsIntro: -3 },
      reward: '"헤어질 수도 있다는 걸 알아" 대사 해금' },

    { id: 'signal-011', tier: 1, triggerHour: 276, name: '네가 본 별',
      stages: {
        1: '"엄마 █ 묻더 █. █ █ 아직 █ █ 볼 █ 있 █..."',
        2: '"엄마가 묻더라. 네가 아직 별을 볼 수 있냐고.\n유리창이 있는 방이면 좋겠다고."',
      },
      percents: { 1: 55, 2: 100 }, costs: { 1: 5, 2: 5 },
      personality: { activeVsCalm: -2 },
      reward: '야간 "별을 보고 있어" 대사 빈도 증가' },

    { id: 'signal-012', tier: 2, triggerHour: 296, name: '선물',
      stages: {
        1: '"...크리 ██ █ 다 █왔 █. 선█ █ █다. 전█기 █ 막히 █..."',
        2: '"...크리스█스가 다 █왔다. 선█을 █다. 전█기가 막히기 █에..."',
        3: '"크리스마스가 다가왔다. 선물을 보냈다. 전달기가 막히기 전에.\n네 방 어딘가에 작은 나무 조각이 있을 거야.\n아버지가 깎은 새. 너를 닮았대."',
      },
      percents: { 1: 30, 2: 65, 3: 100 }, costs: { 1: 5, 2: 5, 3: 5 },
      personality: { socialVsIntro: +3 },
      reward: '아카이브 "새 조각" 추가', archive: '새 조각' },

    { id: 'signal-013', tier: 3, triggerHour: 318, name: '끊어지는 끈',
      stages: {
        1: '"...█신 █ █어진 █. █부 █ █ █락 █을 █..."',
        2: '"...█신이 █어진다. █부터는 █락 █을 거 █..."',
        3: '"통신이 끊어진다. 이제부터는 연락 못 할 거야.\n여기서 █■■ 시작됐다. █■■ 끝나지 않았어..."',
        4: '"통신이 끊어진다. 이제부터는 연락 못 할 거야.\n여기서 뭔가가 시작됐다. 아직 끝나지 않았어.\n살아남은 사람도, 사라진 사람도 있어.\n확실한 건 네가 살아있다는 것뿐.\n아레스. 너는 이 우주에서 사랑받은 아이였다.\n지금도 그렇다."',
      },
      percents: { 1: 12, 2: 35, 3: 65, 4: 100 }, costs: { 1: 5, 2: 5, 3: 5, 4: 5 },
      personality: { diligentVsFree: +5, greedVsTemperance: -4 },
      reward: 'ADULT 유휴 대사에 회상 삽입', majorEvent: true },

    { id: 'signal-014', tier: 3, triggerHour: 330, name: '마지막 답장',
      stages: { 1: '[FINALE: 답장 발신 UI]' },
      percents: { 1: 100 }, costs: { 1: 0 },
      personality: { socialVsIntro: +5 },
      reward: '이벤트 종결 · 크루 편지 아카이브 영구 보존', isFinale: true },
  ],

  // ── Firebase 설정 ────────────────────────────────────
  FIREBASE: {
    apiKey:            'AIzaSyASN1ZnDEGyyO22_FdjlJVYd3ADLjfO0t0',
    authDomain:        'calla-lily-01.firebaseapp.com',
    projectId:         'calla-lily-01',
    storageBucket:     'calla-lily-01.firebasestorage.app',
    messagingSenderId: '347965378281',
    appId:             '1:347965378281:web:8c05701a2705ead95faa78',
  },

  // ── 로컬 테스트 모드 ──────────────────────────────────
  // true: localStorage로 동작 (혼자 테스트용)
  // false: Firebase 실시간 동기화 (24명 공유)
  LOCAL_TEST_MODE: false,
};

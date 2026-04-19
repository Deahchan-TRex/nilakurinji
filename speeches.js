// ============================================================
// speeches.js - 성장 단계 × 성격 × 상태별 대사
//
// 톤 설계:
//   EGG   : 짧은 옹알이, 세계 인식 없음
//   BABY  : 순진한 호기심, 이름 부르기
//   CHILD : 다른 크루 이야기 전달, 가벼운 놀이
//   TEEN  : 의심 시작, '사슬' 편지에서 이상 감지
//   ADULT : 성격 축에 따라 깊은 분기 (사교/내향 등)
//
// 변수: {user}(방금 행동자), {prevUser}(직전), {name}(캐릭터명)
// ============================================================

export const SPEECHES = {

  // ── 진화 순간 ────────────────────────────────────────
  evolve: {
    EGG_to_BABY: [
      '… …… 쩍! … 안녕? 여긴 어디야?',
      '… 밝다. 따뜻해.',
    ],
    BABY_to_CHILD: [
      '{user}! 나 조금 컸어. 봐봐!',
      '손가락 움직일 수 있어. 신기해.',
    ],
    CHILD_to_TEEN: [
      '…거울에 비친 얼굴이 낯설어. 나, 자란 걸까?',
      '{user}, 어른들이 나한테 숨기는 게 있는 것 같아.',
    ],
    TEEN_to_ADULT: [
      '이제 어른이 된 것 같아. 다들 키워준 보답은… 뭐로 할 수 있을까.',
      '…화성의 바람이 그립다. 아빠가 말해준 그 붉은 하늘이.',
    ],
  },

  // ── EGG: 미약한 소리 ─────────────────────────────────
  eggIdle: [
    '……',
    '(알 안에서 움직이는 소리)',
    '(희미한 숨소리)',
  ],

  // ── BABY: 순진한 옹알이 ──────────────────────────────
  onFeed_baby: [
    '맘마!',
    '{user} 맛있어!',
    '냠냠',
  ],
  onPlay_baby: [
    '까르르',
    '{user}! 좋아!',
    '또 또 해줘',
  ],
  onSleep_baby: [
    'zzz...',
    '{user} 자장가 좋아…',
  ],
  onClean_baby: [
    '뽀득뽀득',
    '시원해!',
  ],
  onTrain_baby: [
    '으쌰!',
    '{user} 힘내!',
  ],
  babyIdle: [
    '{user} 어디 갔지?',
    '여긴 밝다. 따뜻해.',
    '배에서 쿵쿵 소리나. 엔진인가?',
  ],

  // ── CHILD: 호기심과 전달 ─────────────────────────────
  onFeed_child: {
    social: ['{user}! {prevUser}도 이거 먹여줬어. 근데 {user}가 준 게 더 맛있어!'],
    intro:  ['…고마워, {user}. 맛있어.'],
    any:    ['{user}야, 이거 뭐야? 화성에서도 이런 거 먹어?'],
  },
  onPlay_child: {
    active: ['{user}!! 뛰자!! 어제 줄리안이랑도 뛰었는데 진짜 재밌었어!'],
    calm:   ['같이 앉아서 얘기하자. {user}는 어디서 왔어?'],
    any:    ['놀자! 아빠 얘기 해줄까? 화성에서 광물 캐는 일 했대.'],
  },
  onSleep_child: [
    '{user}가 재워주면 꿈이 좋아…',
    '꿈에서 아빠 봤어. 자꾸 무슨 말을 하는데, 안 들려.',
  ],
  onClean_child: [
    '뽀득뽀득! 나 깨끗해졌지?',
    '{user}야, 어른들이 우리 몸 상태를 자꾸 기록해. 왜 그런 걸까?',
  ],
  onTrain_child: [
    '나 힘쎄져야 돼! 화성은 중력이 약해서 여기선 더 조심해야 한대.',
    '{user}, 더 해줘! 강해지고 싶어.',
  ],
  childIdle: [
    '{user}야, 카탸가 그러는데 달에서 온 애들은 기억이 없대. 진짜야?',
    '오늘 {prevUser}가 나한테 동화 읽어줬어.',
    '식사가 왜 이렇게 좋지? 화성에선 못 먹던 것들이야.',
  ],

  // ── TEEN: 의심과 성찰 ────────────────────────────────
  onFeed_teen: {
    greedy: ['{user}, 여기 음식은 왜 이렇게 좋아? ...뭔가 이상해.'],
    temp:   ['충분해. {user}도 먹어. …아니다, 너는 크루지.'],
    any:    ['…고마워. 그런데 {user}, 우리한테 왜 이렇게 잘해주는 거야?'],
  },
  onPlay_teen: {
    social: ['{user}! 같이 놀자. ...근데 하선하면 우리 어떻게 되는 거야?'],
    intro:  ['…놀자고? 그래, {user}라면. 다른 사람은 싫어.'],
    any:    ['{user}, 어른들이 우리 보는 눈빛이 이상해. 상품 보는 것 같아.'],
  },
  onSleep_teen: [
    '{user}… 아빠가 보내는 편지가 줄었어. 사슬이 끊어진 건 아니겠지?',
    '잘게. 자고 일어나면 모든 게 평범해졌으면 좋겠어.',
    '꿈에서 자꾸 화성에 있어. 근데 돌아갈 배가 없어.',
  ],
  onClean_teen: [
    '…왜 이렇게 꼼꼼히 검사하는 걸까. {user}도 이상하다고 생각 안 해?',
    '깨끗하네. 상품처럼.',
  ],
  onTrain_teen: {
    diligent: ['{user}, 더 시켜줘. 강해져야 해. 닐라쿠린지호에서 내리고 나서를 준비해야 해.'],
    free:    ['…힘들어. 근데 어차피 시키는 거잖아, {user}?'],
    any:     ['{user}, 우리가 뭘 위해 훈련받는 건지 알아?'],
  },
  teenIdle: [
    '{prevUser}가 그러는데, 바시르는 시베리아에서 왔대. 거기선 사람이 그냥 사라진대.',
    '{user}, 헬멧 쓴 관리자들 말이야. 얼굴 본 적 있어?',
    '…사슬을 통해 아빠한테 물어봤는데 답이 없어.',
    '화성으로 돌아갈 수 있을까? 여긴 너무 깨끗해서 무서워.',
  ],

  // ── ADULT: 성격에 따라 깊이 분기 ─────────────────────
  onFeed_adult: {
    social:   ['{user}. 이걸 먹여주는 건 너희 마음이지, 시스템 명령이 아니지? …맞지?'],
    intro:    ['…'],
    diligent: ['감사히 받겠어. 언젠가 갚을게. 살아있으면.'],
    free:     ['먹어도 먹어도 배가 안 차. {user}, 너는 뭔가 먹을 것을 숨겼지?'],
  },
  onPlay_adult: {
    social:   ['{user}! 같이 가자. 이 배에서 내리면, 우리 서로 찾자. 약속이야.'],
    intro:    ['…노는 건 좋지만, 이건 마지막이 될지도 몰라. 알고 있어, {user}?'],
    active:   ['뛰자, {user}! 살아있다는 걸 온몸으로 기억해두고 싶어.'],
    calm:     ['…옆에 앉아 있어줘. 그걸로 충분해.'],
  },
  onSleep_adult: [
    '…잘 자. 깨어날 수 있을까?',
    '{user}, 네가 깨워줬으면 좋겠어. 다른 사람 말고.',
    '꿈도 기록되고 있는 걸까?',
  ],
  onClean_adult: [
    '깨끗하게 만들어줘서 고마워. …출하 준비되는 것 같긴 하지만.',
    '{user}. 나를 상품이 아니라 동료로 봐줘서 고마워. 적어도 그렇게 느껴져.',
  ],
  onTrain_adult: {
    diligent: ['{user}. 살아남자. 우리끼리라도. 이 배가 어디로 가든.'],
    free:     ['훈련해서 뭐해. 어차피 끝은 정해져 있어. …그래도 {user}니까 해볼게.'],
    any:      ['강해지고 싶어. 누굴 지키고 싶은지는 아직 모르겠지만.'],
  },
  adultIdle: {
    social:   ['{user}, {prevUser}, 그리고 너희 모두. 내가 기억할게. 어디로 가든.'],
    intro:    ['…'],
    diligent: ['관찰한 것을 기록해두고 있어. 누군가는 알아야 하니까.'],
    free:     ['이 배에서 내리면, 나는 내 방식대로 살 거야. 어른들이 정한 길이 아니라.'],
    active:   ['화성으로 돌아갈 길이 있을 거야. 있어야만 해.'],
    calm:     ['…어쩌면 이 평온함이 가장 무서운 건지도 몰라.'],
  },

  // ── 상태 경고 ────────────────────────────────────────
  hungryLow: {
    baby:   ['배... 고파.', '맘마…'],
    child:  ['{user}, 배고파… 밥 줘.', '꼬르륵 소리 들려?'],
    teen:   ['{user}, 배고픈데… 먹어도 되나? 이것도 기록되는 걸까.'],
    adult:  ['…허기는 기억에서 오는 걸까, 몸에서 오는 걸까.'],
  },
  happyLow: {
    baby:   ['심심해.', '{user} 어딨어…'],
    child:  ['아무도 안 놀아줘. 나 미움받는 거야?'],
    teen:   ['…다들 뭘 하고 있어? 나만 여기 있는 기분이야.'],
    adult:  ['외로움은 익숙해지지 않네.'],
  },
  energyLow: {
    baby:   ['졸려…', 'zzz…'],
    child:  ['눈꺼풀이 무거워…'],
    teen:   ['쉬고 싶어, {user}. 아무 생각도 안 하고.'],
    adult:  ['잠시 눈을 감아도 될까.'],
  },
  hygieneLow: {
    baby:   ['뭔가 찝찝해.'],
    child:  ['{user}, 나 냄새나? 씻겨줘.'],
    teen:   ['…위생 검사 전에 씻고 싶어. 기록에 남는다잖아.'],
    adult:  ['깔끔한 상태로 있고 싶어. 품위 같은 거.'],
  },

  // ── 사망 / 부활 ──────────────────────────────────────
  dying: [
    '…다들 고마웠어.',
    '…아빠, 저도 갈까요.',
    '{user}… 미안해, 내가 약해서.',
  ],
  revived: [
    '…어? 여기가 어디야. {user}?',
    '숨이 쉬어져. 다시… 살아난 거야?',
    '이번엔 뭔가 달라. 무서워. {user}, 옆에 있어줘.',
  ],
  finalDeath: [
    '…크림슨의 이름은 여기서 끊어졌다. II세도. 1세처럼.',
  ],
};

// ────────────────────────────────────────────────────────────
// 대사 선택 헬퍼
// ────────────────────────────────────────────────────────────
export function pickSpeech(candidates, vars = {}) {
  if (!candidates || candidates.length === 0) return null;
  const raw = Array.isArray(candidates)
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : candidates;
  return raw
    .replace(/\{user\}/g, vars.user || '…')
    .replace(/\{prevUser\}/g, vars.prevUser || '누군가')
    .replace(/\{name\}/g, vars.name || 'MARS II');
}

// ────────────────────────────────────────────────────────────
// 성격 키 뽑기
// ────────────────────────────────────────────────────────────
function pickPersonalityKey(pet) {
  const p = pet.personality || {};
  if ((p.socialVsIntro || 0) > 20) return 'social';
  if ((p.socialVsIntro || 0) < -20) return 'intro';
  if ((p.activeVsCalm || 0) > 20) return 'active';
  if ((p.activeVsCalm || 0) < -20) return 'calm';
  if ((p.greedVsTemperance || 0) > 20) return 'greedy';
  if ((p.greedVsTemperance || 0) < -20) return 'temp';
  if ((p.diligentVsFree || 0) > 20) return 'diligent';
  if ((p.diligentVsFree || 0) < -20) return 'free';
  return 'any';
}

// ────────────────────────────────────────────────────────────
// 행동 직후 대사
// ────────────────────────────────────────────────────────────
export function getActionSpeech(action, pet, vars) {
  const stage = (pet.stage || 'BABY').toLowerCase();
  const stageKey = stage === 'egg' ? 'baby' : stage; // EGG는 대사 없음
  const key = `on${action.charAt(0).toUpperCase() + action.slice(1)}_${stageKey}`;
  const pool = SPEECHES[key];
  if (!pool) return null;

  if (Array.isArray(pool)) return pickSpeech(pool, vars);

  // 객체면 성격 기반으로 선택
  const pKey = pickPersonalityKey(pet);
  const candidates = pool[pKey] || pool.any || Object.values(pool).flat();
  return pickSpeech(candidates, vars);
}

// ────────────────────────────────────────────────────────────
// 경고 대사 (스탯 위기)
// ────────────────────────────────────────────────────────────
export function getWarningSpeech(pet, vars) {
  const stage = (pet.stage || 'BABY').toLowerCase();
  const stageKey = stage === 'egg' ? 'baby' : stage;

  if (pet.hunger < 20 && SPEECHES.hungryLow[stageKey]) {
    return pickSpeech(SPEECHES.hungryLow[stageKey], vars);
  }
  if (pet.happy < 20 && SPEECHES.happyLow[stageKey]) {
    return pickSpeech(SPEECHES.happyLow[stageKey], vars);
  }
  if (pet.energy < 20 && SPEECHES.energyLow[stageKey]) {
    return pickSpeech(SPEECHES.energyLow[stageKey], vars);
  }
  if (pet.hygiene < 20 && SPEECHES.hygieneLow[stageKey]) {
    return pickSpeech(SPEECHES.hygieneLow[stageKey], vars);
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// 유휴 대사
// ────────────────────────────────────────────────────────────
export function getIdleSpeech(pet, vars) {
  const stage = pet.stage || 'BABY';

  if (stage === 'EGG') return pickSpeech(SPEECHES.eggIdle, vars);
  if (stage === 'BABY') return pickSpeech(SPEECHES.babyIdle, vars);
  if (stage === 'CHILD') return pickSpeech(SPEECHES.childIdle, vars);
  if (stage === 'TEEN') return pickSpeech(SPEECHES.teenIdle, vars);

  // ADULT: 성격별
  const pKey = pickPersonalityKey(pet);
  const pool = SPEECHES.adultIdle[pKey] || SPEECHES.adultIdle.any;
  return pool ? pickSpeech(pool, vars) : null;
}

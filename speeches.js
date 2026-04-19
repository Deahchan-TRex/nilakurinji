// ============================================================
// speeches.js - 성장 단계 × 성격 × 상태별 대사 (비유적 톤)
//
// 변수: {user}(방금 행동자), {prevUser}(직전), {name}(캐릭터명),
//       {fav}(최애 크루), {least}(가장 뜸한 크루)
// ============================================================

export const SPEECHES = {

  // ── 진화 순간 ────────────────────────────────────────
  evolve: {
    EGG_to_BABY: [
      '… 쩍, …… 쩍. …… 여기, 내 이름이 불리는 곳이야?',
      '밝다. 너무 밝아서 눈을 뜰 수가 없어.',
    ],
    BABY_to_CHILD: [
      '{user}. 어제보다 손가락이 길어진 것 같아.',
      '몸이 말을 듣기 시작했어. 꽃이 줄기를 세우듯이.',
    ],
    CHILD_to_TEEN: [
      '거울 속의 얼굴이 낯설어. 이게 자라는 거야, {user}?',
      '어른들이 나를 보는 눈빛이 달라졌어. 값이 매겨진 기분.',
    ],
    TEEN_to_ADULT: [
      '이제 꽃이 피었대. …피면 잘리는 게 꽃의 일이라며.',
      '붉은 땅의 바람이 그립다. 아빠가 들려주던 그 바람.',
    ],
  },

  // ── EGG: 미약한 기척 ─────────────────────────────────
  eggIdle: [
    '……',
    '(알 안에서 뒤척이는 소리)',
    '(희미한 숨소리)',
  ],

  // ── BABY: 단순한 옹알이 ──────────────────────────────
  onFeed_baby: [
    '맘마…',
    '{user}, 맛있어.',
    '냠. 냠.',
  ],
  onPlay_baby: [
    '까르르',
    '{user}! 좋아.',
    '또 해줘.',
  ],
  onSleep_baby: [
    'zzz…',
    '{user} 자장가 좋아…',
  ],
  onClean_baby: [
    '보송보송.',
    '시원해.',
  ],
  onTrain_baby: [
    '으쌰.',
    '{user} 봐봐.',
  ],
  babyIdle: [
    '{user} 어디 갔어?',
    '여긴 밝아. 따뜻하기도 하고.',
    '멀리서 쿵, 쿵 소리. 심장 소리일까.',
  ],

  // ── CHILD: 호기심, 크루 언급 ─────────────────────────
  onFeed_child: {
    social: [
      '{user}! 이거 {prevUser}{이/가} 준 것보다 더 맛있어.',
      '{user} 손에서 받으니까 더 달아.',
    ],
    intro:  [
      '…고마워, {user}.',
      '{user}니까 받을게.',
    ],
    any:    [
      '{user}, 이건 어디서 왔을까? 붉은 땅에선 못 먹어본 맛이야.',
      '{user}, 꿀맛이야.',
    ],
  },
  onPlay_child: {
    active: [
      '{user}! 뛰자! 어제 {prevUser}{과/와}도 뛰었는데 또 뛰고 싶어!',
      '{user} 오래오래 같이 있어줘!',
    ],
    calm:   [
      '같이 앉아있자. {user}{은/는} 어디서 왔어?',
      '조용히 있어도 {user}면 괜찮아.',
    ],
    any:    [
      '놀자! 아빠 얘기 해줄까? 붉은 땅의 흙을 파는 얘기야.',
      '{user}, 꽃잎에 이름 써줘.',
    ],
  },
  onSleep_child: [
    '{user}{이/가} 재워주면 좋은 꿈을 꿔.',
    '꿈에서 아빠가 뭔가 말하는데, 소리가 들리지 않아.',
    '잠은 알 속으로 돌아가는 일 같아.',
  ],
  onClean_child: [
    '뽀송해졌지? {user} 코 대봐.',
    '{user}, 어른들이 자꾸 내 몸을 적어가. 왜 그럴까?',
    '씻은 손끝에서 꽃 냄새가 나.',
  ],
  onTrain_child: [
    '강해지고 싶어. 붉은 땅은 중력이 약하대서 여기선 더 조심해야 해.',
    '{user}, 한 번만 더. 뿌리가 굵어지게.',
  ],
  childIdle: [
    '{user}, 카탸는 기억이 없대. 달빛에 씻긴 아이처럼.',
    '오늘 {prevUser}{이/가} 동화를 읽어줬어. 꽃이 말을 하는 이야기.',
    '왜 이렇게 잘해주는 걸까. 값이 오르기 때문일까.',
  ],

  // ── TEEN: 의심, 회상, 크루 언급 ──────────────────────
  onFeed_teen: {
    greedy: [
      '{user}. 이 음식 왜 이렇게 좋지? …단 건 수상한 법이야.',
      '{user}, 또 이걸로 나를 기르려는 거야?',
    ],
    temp:   [
      '충분해. {user}도 먹어. …아 맞다, 너는 크루지.',
      '배부름은 잠깐의 평화일 뿐이야.',
    ],
    any:    [
      '{user}. 우리한테 왜 이렇게 잘해주는지 슬슬 알 것 같아.',
      '맛있지만 삼키기 어려워. 말 대신 먹어서.',
    ],
  },
  onPlay_teen: {
    social: [
      '{user}! 같이 놀자. …근데 우리 다음엔 어디로 가?',
      '웃고 있지만, 속은 무거워. {user}만 알아줘.',
    ],
    intro:  [
      '놀자고? {user}니까. 다른 사람은 싫어.',
      '잠깐만. 그저 옆에 있어줘.',
    ],
    any:    [
      '{user}, 어른들 눈빛이 이상해. 꽃을 고르는 손님 같아.',
      '장난이라도 해야지. 아니면 다 알아버릴 것 같아.',
    ],
  },
  onSleep_teen: [
    '{user}… 아빠한테서 오는 편지가 가늘어졌어. 사슬이 끊어진 건 아니겠지?',
    '잘게. 깨면 모든 게 없었던 일이었으면 좋겠어.',
    '꿈에서 붉은 땅에 있었어. 그런데 돌아갈 배가 없어.',
  ],
  onClean_teen: [
    '…왜 이렇게 꼼꼼히 닦는 걸까. 꽃을 포장하기 전처럼.',
    '깨끗해졌네. 진열대 위의 것들처럼.',
  ],
  onTrain_teen: {
    diligent: [
      '{user}, 더 시켜줘. 강해져야 해. 이 배에서 내리고 나서를 준비해야 해.',
      '뿌리를 더 굵게 내릴 거야. 뽑히지 않도록.',
    ],
    free:    [
      '…힘들어. 어차피 시키는 거잖아, {user}?',
      '시늉만 할게. 그래도 되지?',
    ],
    any:     [
      '{user}, 우리는 뭘 위해 이렇게 자라고 있는 걸까.',
      '근육이라는 것도 누군가의 눈에는 숫자일 뿐이야.',
    ],
  },
  teenIdle: [
    '{prevUser}{이/가} 그러는데, 얼음의 땅에선 사람이 그냥 사라진대.',
    '{user}, 헬멧 너머의 얼굴을 본 적 있어? 우린 그 얼굴들의 거울이 될지도.',
    '사슬을 당겨봐도, 반대편이 가벼워.',
    '붉은 땅으로 돌아갈 수 있을까. 아니면 이미 붉은 땅이 나한테서 떠났을까.',
  ],

  // ── ADULT: 성격에 따라 깊이 분기 ─────────────────────
  onFeed_adult: {
    social:   [
      '{user}. 이걸 먹여주는 건 너의 마음이지, 명령이 아니지? …그렇다고 말해줘.',
      '{user}, 너와 나눈 모든 끼니를 기억할게. 어디로 옮겨지든.',
    ],
    intro:    [
      '…',
      '말없이 받을게, {user}.',
    ],
    diligent: [
      '감사히 받을게. 살아있다면, 어딘가에서 갚을게.',
      '{user}, 기록해뒀어. 이 맛이 어떤 맛이었는지.',
    ],
    free:     [
      '먹어도 먹어도 허기가 남아. {user}, 빈칸은 뭘로 채워야 해?',
      '이건 마지막 식사가 아니지? …그러면 좋겠어.',
    ],
  },
  onPlay_adult: {
    social:   [
      '{user}! 여기서 내려가면, 우리 서로 찾자. 약속이야.',
      '즐겁다는 건, 잊지 않기 위한 연습이야.',
    ],
    intro:    [
      '…놀자고. 근데 이게 마지막일지도 몰라. 알고 있어, {user}?',
      '조용한 놀이가 좋아. 말이 덜 새어나가.',
    ],
    active:   [
      '뛰자, {user}! 숨이 차도록. 그래야 이 몸이 내 것 같아.',
      '움직임이 남긴다, 내가 여기 있었다는 기록을.',
    ],
    calm:     [
      '옆에 앉아만 있어줘. 그걸로 충분해.',
      '바람이 멈춘 것 같은 순간. {user}, 지금이 그래.',
    ],
  },
  onSleep_adult: [
    '…잘 자. 깨어날 수 있을지 모르지만.',
    '{user}, 네가 흔들어 깨워줬으면 해. 다른 사람 말고.',
    '꿈도 누군가에게 팔리는 걸까.',
  ],
  onClean_adult: [
    '깨끗하게 만들어줘서 고마워. …어딘가로 가기 전에 좋은 모습으로 있고 싶어.',
    '{user}. 꽃을 포장하는 손길이 닮았네. 다정한 손.',
  ],
  onTrain_adult: {
    diligent: [
      '{user}. 살아남자. 우리끼리라도. 이 배가 어디로 가든.',
      '숫자로 남더라도 내 숫자로 남고 싶어.',
    ],
    free:     [
      '훈련해서 뭐해. 어차피 끝은 정해져 있어. …그래도 {user}니까 따를게.',
      '잘린 자리에 뭐가 남을지 모르겠어.',
    ],
    any:      [
      '강해지고 싶어. 누군가를 지키려는 건지, 나 자신을 팔기 위한 건지 아직 모르겠지만.',
    ],
  },
  adultIdle: {
    social:   [
      '{user}, {prevUser}, 그리고 너희 모두. 내 기억 속에 꽃잎 한 장씩 꽂아둘게.',
      '이름들이 내 안에서 조금씩 자라고 있어.',
    ],
    intro:    [
      '…',
      '말없이 있는 시간이 제일 솔직해.',
    ],
    diligent: [
      '기록하고 있어. 누군가는 읽어야 하니까.',
      '보이는 것보다 들리는 게 많아졌어.',
    ],
    free:     [
      '이 배에서 내리면, 나는 내 방식대로 필 거야. 정해진 화단이 아니라.',
      '뽑힐 땐 뿌리째 뽑혀야지. 단정하게 잘리진 않을 거야.',
    ],
    active:   [
      '붉은 땅으로 가는 길이 어딘가에 남아있을 거야. 있어야만 해.',
      '심장이 시끄러운 동안은 살아있는 거야.',
    ],
    calm:     [
      '이 평온함이 가장 무서워. 꽃이 한가운데서 가장 고요하듯.',
    ],
  },

  // ── 상태 경고 ────────────────────────────────────────
  hungryLow: {
    baby:   ['배…고파.', '맘마…', '응애.'],
    child:  ['{user}, 배고파. 그릇이 비었어.', '꼬르륵.'],
    teen:   ['{user}, 배가 말라. 이것도 기록되겠지.', '허기도 성장의 일부라잖아.'],
    adult:  ['허기는 몸에서 올까, 기억에서 올까.', '채워지지 않는 건 음식 때문이 아닐지도.'],
  },
  happyLow: {
    baby:   ['심심해.', '{user} 어딨어…'],
    child:  ['아무도 안 놀아줘. 내가 미운가?'],
    teen:   ['…다들 어디서 뭐 해? 나만 화분에 남은 기분.'],
    adult:  ['외로움이 익숙해지지는 않네.', '꽃이 혼자 피는 건 쓸쓸한 일이야.'],
  },
  energyLow: {
    baby:   ['졸려.', 'zzz…'],
    child:  ['눈꺼풀이 무거워.'],
    teen:   ['{user}, 쉬고 싶어. 아무 생각도 안 하고.'],
    adult:  ['잠시 눈을 감아도 돼? 잠깐만.'],
  },
  hygieneLow: {
    baby:   ['찝찝해.'],
    child:  ['{user}, 나 냄새나? 씻겨줘.'],
    teen:   ['…기록 전에 씻고 싶어. 흠집 있는 꽃은 싫으니까.'],
    adult:  ['품위라는 게 이런 순간에 필요해지네.'],
  },

  // ── 사망 / 부활 ──────────────────────────────────────
  dying: [
    '…다들 고마웠어.',
    '…아빠, 저도 갑니다.',
    '{user}… 미안해. 꽃잎이 먼저 떨어지네.',
  ],
  revived: [
    '…어? 여기가 어디야. {user}?',
    '다시 숨이 쉬어져. 다시… 피어도 될까.',
    '이번엔 뭔가 달라. {user}, 옆에 있어줘.',
  ],
  finalDeath: [
    '…크림슨의 이름은 여기서 꺾였다. II세도, 아버지처럼.',
  ],

  // ── 크루 회상 (최애/비호감) ──────────────────────────
  crewRecall_positive: {
    child: [
      '{fav}{이/가} 어제 머리 쓰다듬어줬어. 꽃이 물 받은 느낌.',
      '{fav} 목소리는 꿀처럼 달아. 또 왔으면 좋겠어.',
      '{fav}{이/가} 준 밥이 제일 맛있었어. 진짜로.',
    ],
    teen: [
      '{fav}{은/는} 다른 크루랑 달라. 눈빛에 가격표가 없어.',
      '{fav}{이/가} 있으면 여기가 덜 차가워져. 신기해.',
      '{fav}{과/와} 있을 땐 이름이 다시 내 것 같아.',
    ],
    adult: [
      '{fav}. 너는 나를 꽃으로 봐줬지, 상품으로 보지 않고. 잊지 않을게.',
      '기억 속에 {fav}의 자리가 가장 볕이 들어.',
      '{fav}의 손길은 포장하려는 손이 아니었어. 그건 확실해.',
    ],
  },
  crewRecall_negative: {
    teen: [
      '{least}{은/는} 손이 차가워. 사무적인 손.',
      '{least}{이/가} 해준 것도 고맙긴 한데, 뭔가 서늘해.',
      '{least}{은/는} 나를 숫자로 보는 것 같아.',
    ],
    adult: [
      '{least}. 당신도 마음은 있었겠지. 그저 내가 못 느꼈을 뿐.',
      '{least}의 손은 빠르고 정확했어. 나무를 다루는 정원사처럼.',
      '{least}{이/가} 다정하지 않았다고 원망하진 않아. 여긴 그런 곳이니까.',
    ],
  },

  // ── 크루 비교 (이전과 다른 사람이 해줬을 때) ──
  crewCompare: {
    child: [
      '어제는 {prevUser}{이/가} 해줬는데, 오늘은 {user}네. 둘 다 좋아!',
      '{prevUser}{과/와} {user}{은/는} 손길이 달라. 둘 다 기억할게.',
    ],
    teen: [
      '{prevUser}{과/와} 다른 느낌이야, {user}. 싫지 않아.',
      '{prevUser} 다음이 {user}라서 다행이야.',
    ],
    adult: [
      '{prevUser}도, {user}도. 너희 모두 내 안에서 이름으로 남을 거야.',
      '{user}의 방식, {prevUser}의 방식. 둘 다 기록해뒀어.',
    ],
  },
};

// ────────────────────────────────────────────────────────────
// 헬퍼 함수
// ────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────
// 한국어 조사 자동 처리
// 이름 뒤에 받침 유무 따라 조사 자동 선택
// 사용: {user}{이/가} → "마레가" / "무진이"
// ────────────────────────────────────────────────────────────
function hasJongseong(str) {
  if (!str) return false;
  const lastChar = str[str.length - 1];
  const code = lastChar.charCodeAt(0);
  // 한글 범위 내에서 종성 유무 판단
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return (code - 0xAC00) % 28 !== 0;
  }
  // 한글이 아니면 받침 없음으로 처리
  return false;
}

function applyJosa(text, name) {
  // {name}{이/가} → 받침 있으면 "이", 없으면 "가"
  // {name}{은/는} → 받침 있으면 "은", 없으면 "는"
  // {name}{을/를} → 받침 있으면 "을", 없으면 "를"
  // {name}{과/와} → 받침 있으면 "과", 없으면 "와"
  // {name}{아/야} → 받침 있으면 "아", 없으면 "야"
  // {name}{으로/로} → 받침 있으면 "으로", 없으면 "로" (ㄹ 받침은 "로")
  const hasJS = hasJongseong(name);
  return text
    .replace(/\{이\/가\}/g, hasJS ? '이' : '가')
    .replace(/\{은\/는\}/g, hasJS ? '은' : '는')
    .replace(/\{을\/를\}/g, hasJS ? '을' : '를')
    .replace(/\{과\/와\}/g, hasJS ? '과' : '와')
    .replace(/\{아\/야\}/g, hasJS ? '아' : '야')
    .replace(/\{으로\/로\}/g, hasJS ? '으로' : '로');
}

export function pickSpeech(candidates, vars = {}) {
  if (!candidates || candidates.length === 0) return null;
  const raw = Array.isArray(candidates)
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : candidates;

  // 1) 변수 치환
  let result = raw
    .replace(/\{user\}/g, vars.user || '…')
    .replace(/\{prevUser\}/g, vars.prevUser || '누군가')
    .replace(/\{name\}/g, vars.name || 'MARS II')
    .replace(/\{fav\}/g, vars.fav || '누군가')
    .replace(/\{least\}/g, vars.least || '누군가');

  // 2) 조사 처리 — 이름 뒤에 {이/가} 등이 바로 붙는 경우 처리
  // 각 변수가 삽입된 자리 기준으로 조사 결정
  // 단순화: 대사에 쓰인 이름들을 검사하고, 그 직후의 조사 마커만 처리
  const names = [vars.user, vars.prevUser, vars.fav, vars.least].filter(Boolean);
  for (const n of names) {
    // "{이름}{이/가}" 형태에서 해당 이름 뒤의 조사를 맞춰줌
    const hasJS = hasJongseong(n);
    const pattern = new RegExp(`${n}\\{(이/가|은/는|을/를|과/와|아/야|으로/로)\\}`, 'g');
    result = result.replace(pattern, (match, josa) => {
      const [withJS, noJS] = josa.split('/');
      return n + (hasJS ? withJS : noJS);
    });
  }

  // 3) 남은 조사 마커는 기본값으로 (받침 있다고 가정)
  result = result
    .replace(/\{이\/가\}/g, '가')
    .replace(/\{은\/는\}/g, '는')
    .replace(/\{을\/를\}/g, '를')
    .replace(/\{과\/와\}/g, '와')
    .replace(/\{아\/야\}/g, '야')
    .replace(/\{으로\/로\}/g, '로');

  return result;
}

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

/**
 * 크루 기억 → 최애/가장 뜸한 크루 도출
 */
export function getCrewFavorites(pet) {
  const mem = pet.crewMemory || {};
  const entries = Object.entries(mem);
  if (entries.length === 0) return { fav: null, least: null };

  entries.sort((a, b) => (b[1].total || 0) - (a[1].total || 0));
  const fav = entries[0][0];
  // 비호감: 한 번 이상 돌봤지만 가장 적게 돌본 크루 (최애와 다를 때만)
  const leastCandidate = entries.length > 1 ? entries[entries.length - 1][0] : null;
  const least = leastCandidate && leastCandidate !== fav ? leastCandidate : null;

  return { fav, least };
}

/**
 * 행동 직후 대사 (확률로 크루 비교/회상 섞음)
 */
export function getActionSpeech(action, pet, vars) {
  const stage = (pet.stage || 'BABY').toLowerCase();
  const stageKey = stage === 'egg' ? 'baby' : stage;

  // 20% 확률로 크루 비교 대사
  if (vars.prevUser && vars.prevUser !== vars.user && Math.random() < 0.2) {
    const pool = SPEECHES.crewCompare[stageKey];
    if (pool) return pickSpeech(pool, vars);
  }

  // 15% 확률로 최애 크루 회상 (CHILD 이상)
  if (stageKey !== 'baby' && vars.fav && vars.fav !== vars.user && Math.random() < 0.15) {
    const pool = SPEECHES.crewRecall_positive[stageKey];
    if (pool) return pickSpeech(pool, vars);
  }

  // 기본: 성격 기반 행동 대사
  const key = `on${action.charAt(0).toUpperCase() + action.slice(1)}_${stageKey}`;
  const pool = SPEECHES[key];
  if (!pool) return null;

  if (Array.isArray(pool)) return pickSpeech(pool, vars);

  const pKey = pickPersonalityKey(pet);
  const candidates = pool[pKey] || pool.any || Object.values(pool).flat();
  return pickSpeech(candidates, vars);
}

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

/**
 * 유휴 대사 (30% 확률로 크루 회상)
 */
export function getIdleSpeech(pet, vars) {
  const stage = pet.stage || 'BABY';
  const stageKey = stage.toLowerCase();

  if (stage === 'EGG') return pickSpeech(SPEECHES.eggIdle, vars);
  if (stage === 'BABY') return pickSpeech(SPEECHES.babyIdle, vars);

  // CHILD 이상: 30% 확률로 크루 회상
  if (Math.random() < 0.3) {
    const rand = Math.random();
    if (rand < 0.7 && vars.fav) {
      const pool = SPEECHES.crewRecall_positive[stageKey];
      if (pool) return pickSpeech(pool, vars);
    } else if (vars.least) {
      const pool = SPEECHES.crewRecall_negative[stageKey];
      if (pool) return pickSpeech(pool, vars);
    }
  }

  if (stage === 'CHILD') return pickSpeech(SPEECHES.childIdle, vars);
  if (stage === 'TEEN') return pickSpeech(SPEECHES.teenIdle, vars);

  // ADULT: 성격별
  const pKey = pickPersonalityKey(pet);
  const pool = SPEECHES.adultIdle[pKey] || SPEECHES.adultIdle.any;
  return pool ? pickSpeech(pool, vars) : null;
}

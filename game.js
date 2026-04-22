// ============================================================
// game.js - 순수 게임 로직 (DB와 무관)
// ============================================================

import { CONFIG } from './config.js';

// ────────────────────────────────────────────────────────────
// 지연 계산: 누군가 접속/행동할 때마다 호출
// ────────────────────────────────────────────────────────────
export function tickStats(pet) {
  if (pet.isDead) return pet;

  const now = Date.now();
  const hoursElapsed = (now - pet.lastTickAt) / 3600000;
  if (hoursElapsed <= 0) return pet;

  const decay = CONFIG.DECAY_PER_HOUR;

  // EGG 상태: 감소 속도 절반 (알도 돌봄이 필요하지만 덜 민감함)
  const rate = pet.stage === 'EGG' ? 0.5 : 1.0;

  pet.hunger  = Math.max(0, pet.hunger  - decay.hunger  * hoursElapsed * rate);
  pet.happy   = Math.max(0, pet.happy   - decay.happy   * hoursElapsed * rate);
  pet.energy  = Math.max(0, pet.energy  - decay.energy  * hoursElapsed * rate);
  pet.hygiene = Math.max(0, pet.hygiene - decay.hygiene * hoursElapsed * rate);

  pet.lastTickAt = now;

  // 사망: 3개 이상 스탯이 0 (EGG 단계는 사망 안 함 - 너무 이르니까)
  if (pet.stage !== 'EGG') {
    const zeroCount = [pet.hunger, pet.happy, pet.energy].filter(v => v <= 0).length;
    if (zeroCount >= 3) {
      pet.isDead = true;
    }
  }
  return pet;
}

// ────────────────────────────────────────────────────────────
// 진화 업데이트 (탄생 경과 시간 기준)
// ────────────────────────────────────────────────────────────
export function updateStage(pet) {
  const hoursLived = (Date.now() - pet.bornAt) / 3600000;
  for (const s of CONFIG.STAGES) {
    if (hoursLived >= s.fromHour && hoursLived < s.toHour) {
      if (pet.stage !== s.name) {
        const from = pet.stage;
        pet.stage = s.name;
        return { evolved: true, from, to: s.name };
      }
      return { evolved: false };
    }
  }
  // 336h 이후는 ADULT 유지
  if (pet.stage !== 'ADULT' && hoursLived >= 240) {
    const from = pet.stage;
    pet.stage = 'ADULT';
    return { evolved: true, from, to: 'ADULT' };
  }
  return { evolved: false };
}

// ────────────────────────────────────────────────────────────
// 행동 적용
// ────────────────────────────────────────────────────────────
export function applyAction(pet, action, userName = null, override = null) {
  if (pet.isDead) return { ok: false, reason: 'dead' };
  // EGG 상태에서도 돌봄 가능 (이벤트 설계 변경)

  const effect = CONFIG.ACTIONS[action];
  if (!effect) return { ok: false, reason: 'unknown' };

  if ((action === 'play' || action === 'train') && pet.energy < 15) {
    return { ok: false, reason: 'tired' };
  }

  // 서브메뉴 override가 있으면 해당 값으로 덮어씀
  const actualEffect = override ? { ...effect, ...override } : effect;

  for (const [key, val] of Object.entries(actualEffect)) {
    if (['label', 'desc', 'exp'].includes(key)) continue;
    if (pet[key] !== undefined) {
      pet[key] = Math.max(0, Math.min(100, pet[key] + val));
    }
  }

  pet.exp = (pet.exp || 0) + (effect.exp || 0);
  if (action === 'train') pet.strength = Math.min(100, (pet.strength || 0) + 2);
  if (action === 'play')  pet.bond     = Math.min(100, (pet.bond || 0) + 1);
  if (action === 'feed')  pet.bond     = Math.min(100, (pet.bond || 0) + 0.5);

  pet.counters = pet.counters || {};
  pet.counters[action] = (pet.counters[action] || 0) + 1;

  const delta = CONFIG.PERSONALITY_DELTA[action] || {};
  pet.personality = pet.personality || {};
  for (const [axis, d] of Object.entries(delta)) {
    pet.personality[axis] = Math.max(-100, Math.min(100, (pet.personality[axis] || 0) + d));
  }

  if (pet.exp >= 100) {
    pet.exp -= 100;
    pet.level = (pet.level || 1) + 1;
  }

  // ── 크루 기억 업데이트 ──
  if (userName && userName !== '__admin__') {
    pet.crewMemory = pet.crewMemory || {};
    const mem = pet.crewMemory[userName] || {
      feed: 0, play: 0, sleep: 0, clean: 0, train: 0,
      total: 0, lastAction: null, lastAt: 0,
    };
    mem[action] = (mem[action] || 0) + 1;
    mem.total = (mem.total || 0) + 1;
    mem.lastAction = action;
    mem.lastAt = Date.now();
    pet.crewMemory[userName] = mem;

    // 최근 크루 큐 갱신 (중복 제거 후 맨 앞에)
    pet.recentCrew = pet.recentCrew || [];
    pet.recentCrew = [userName, ...pet.recentCrew.filter(n => n !== userName)].slice(0, 5);
  }

  return { ok: true, effect };
}

// ────────────────────────────────────────────────────────────
// 부활
// ────────────────────────────────────────────────────────────
export function revive(pet, forceAdmin = false) {
  if (!pet.isDead) return { ok: false, reason: 'alive' };
  if (!forceAdmin && pet.deathCount >= CONFIG.MAX_REVIVES) {
    return { ok: false, reason: 'max' };
  }

  pet.isDead = false;
  if (!forceAdmin) pet.deathCount = (pet.deathCount || 0) + 1;
  pet.hunger = 50; pet.happy = 50; pet.energy = 50; pet.hygiene = 50;
  pet.lastTickAt = Date.now();

  return { ok: true, remaining: CONFIG.MAX_REVIVES - (pet.deathCount || 0) };
}

// ────────────────────────────────────────────────────────────
// 성격 라벨
// ────────────────────────────────────────────────────────────
export function personalityLabel(pet) {
  const p = pet.personality || {};
  const a = (p.activeVsCalm || 0) > 10 ? '활발한' : (p.activeVsCalm || 0) < -10 ? '차분한' : '';
  const b = (p.greedVsTemperance || 0) > 10 ? '탐욕스러운' : (p.greedVsTemperance || 0) < -10 ? '절제하는' : '';
  const c = (p.socialVsIntro || 0) > 10 ? '사교적인' : (p.socialVsIntro || 0) < -10 ? '내향적인' : '';
  const d = (p.diligentVsFree || 0) > 10 ? '성실한' : (p.diligentVsFree || 0) < -10 ? '자유로운' : '';

  const traits = [a, b, c, d].filter(Boolean);
  if (traits.length === 0) return '형성 중…';

  // ADULT 단계에서는 세계관 반영 라벨
  if (pet.stage === 'ADULT') {
    if (c === '사교적인' && (p.activeVsCalm || 0) > 10) return '사교적 개척자';
    if (c === '내향적인' && d === '자유로운') return '조용한 관찰자';
    if (d === '성실한' && a === '차분한') return '기록하는 자';
    if (c === '내향적인' && a === '차분한') return '침묵의 생존자';
  }
  return traits.slice(0, 2).join(' ') + ' 아이';
}

// ────────────────────────────────────────────────────────────
// 진행률
// ────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────
// 한국 시간 자정 기준 "DAY N" 계산
// 리셋(bornAt) 날짜의 KST 자정을 day 1로 시작해서, 자정마다 +1
// ────────────────────────────────────────────────────────────
function toKstMidnight(epochMs) {
  // KST = UTC+9. 자정은 그 날 00:00 KST
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(epochMs + kstOffsetMs);
  // KST 기준 해당 날짜의 00:00
  kstDate.setUTCHours(0, 0, 0, 0);
  // UTC 시각으로 되돌림
  return kstDate.getTime() - kstOffsetMs;
}

export function getProgress(pet) {
  const now = Date.now();
  const hoursLived = Math.max(0, (now - pet.bornAt) / 3600000);
  const totalHours = CONFIG.DURATION_DAYS * 24;

  // KST 자정 기준 day 계산
  const bornMidnight = toKstMidnight(pet.bornAt);
  const nowMidnight = toKstMidnight(now);
  const dayDiff = Math.floor((nowMidnight - bornMidnight) / (24 * 3600000));
  const day = Math.max(1, Math.min(CONFIG.DURATION_DAYS, dayDiff + 1));

  // 오늘의 고유 키 (KST 기준 YYYY-MM-DD)
  const kstNow = new Date(now + 9 * 3600 * 1000);
  const dayKey = kstNow.toISOString().slice(0, 10);

  return {
    hoursLived: Math.floor(hoursLived),
    totalHours,
    day,
    dayKey,
    percent: Math.max(0, Math.min(100, (hoursLived / totalHours) * 100)),
    finished: hoursLived >= totalHours,
  };
}

// ────────────────────────────────────────────────────────────
// 단계별 시간대 해설 - 아카이브 로그 스타일
//
// 각 단계가 시작되는 시점을 0h로 잡고, 해당 단계 내에서의 경과 시간
// 기준으로 해설이 등장합니다. 세계관에 맞게 점진적으로 무거워짐.
// ────────────────────────────────────────────────────────────
const STAGE_NARRATIVES = {
  EGG: [
    { hour: 0,  text: '◎ 꽃이 품을 새 한 송이를 받았다.' },
    { hour: 1,  text: '▪ 게이트가 닫히는 순간, 아무도 뒤를 돌아보지 않았다.' },
    { hour: 3,  text: '◎ 칼라릴리호가 닻을 올린다. 목적지는 꽃잎 안에 있다.' },
    { hour: 6,  text: '▪ 기록원의 만년필이 "포장 상태 양호"라고 적는다.' },
    { hour: 9,  text: '◎ 처음 맡아보는 냄새의 식사. 낯설어서 서러운 맛.' },
    { hour: 12, text: '▪ 아이의 팔뚝에서 꼬리표가 미약하게 빛난다. 값이 매겨졌다는 증거.' },
    { hour: 15, text: '◎ 뼈와 숨결, 심장의 박자가 종이 위로 옮겨진다.' },
    { hour: 18, text: '▪ 기내 조명이 천천히 꺼진다. 꽃밥 같은 어둠이 내린다.' },
    { hour: 21, text: '◎ 누구의 꿈도 소리를 내지 않는다.' },
    { hour: 24, text: '▪ 첫 바퀴가 돌았다. 알 속에서 심장만이 답을 알고 있다.' },
    { hour: 27, text: '◎ 다시 종이 울리고, 같은 그림자가 움직인다.' },
    { hour: 30, text: '▪ 창밖으로 먼 별빛이 보인다. 혹은 먼 도시의 등불일지도.' },
    { hour: 33, text: '◎ 헬멧 너머의 시선이 오래 머문다. 값어치가 있다는 뜻.' },
    { hour: 35, text: '▪ 문이 열릴 준비를 한다. 꽃도 언젠가는 피어야 하니까.' },
  ],
  BABY: [
    { hour: 0,  text: '◎ 첫 호흡. 공기가 너무 맑아서 한동안 기침했다.' },
    { hour: 3,  text: '▪ 흰 복도를 따라 이동한다. 꽃잎 속을 걷는 것만 같다.' },
    { hour: 6,  text: '◎ 다시 기록되는 몸. 어제의 숫자와 비교된다.' },
    { hour: 9,  text: '▪ 식사는 달다. 어딘가에서 오래 기른 단맛.' },
    { hour: 12, text: '◎ 멀리서 다른 꽃봉오리들이 울고 있다.' },
    { hour: 18, text: '▪ 누군가 이름을 불러주었다. 아이는 그것이 자기 이름인지 확신하지 못한다.' },
    { hour: 24, text: '◎ 하루를 살아냈다는 건, 그만큼 값이 올랐다는 뜻.' },
    { hour: 30, text: '▪ 같은 방의 아이는 붉은 땅에서 왔다고 한다. 같은 빛의 먼지를 묻힌 아이.' },
    { hour: 36, text: '◎ 꿈에서 붉은 흙의 냄새를 맡았다. 아버지의 손톱 밑 냄새.' },
    { hour: 42, text: '▪ 방 안에 장난감이 놓였다. 손에 쥐는 것도 일이라는 것을 아이는 배운다.' },
  ],
  CHILD: [
    { hour: 0,  text: '◎ 입에서 처음으로 말이 피어난다. 시킨 대로 정확하게.' },
    { hour: 6,  text: '▪ 같은 땅에서 온 아이와 이름을 나눈다. 나눌 것이 그것뿐이라서.' },
    { hour: 12, text: '◎ 다른 아이가 그릇을 비우지 않았다. 그것조차 기록된다.' },
    { hour: 18, text: '▪ 개인 방으로 불려갔다가, 나올 때는 기억 한 귀퉁이가 얇아져 있다.' },
    { hour: 24, text: '◎ 두 번째 바퀴가 돌았다. 사슬이 고향으로 향한다.' },
    { hour: 30, text: '▪ 붉은 땅에서 짧은 답장이 왔다. "잘 있니." 딱 그만큼.' },
    { hour: 36, text: '◎ 기억이 옅은 아이가 있다. 달빛에 씻긴 듯하다.' },
    { hour: 42, text: '▪ 얼음의 땅에서 온 아이의 침대가 비었다. 꽃이 한 송이 적어졌다.' },
    { hour: 48, text: '◎ 아이들도 안다 — 돌아오지 않는 것들의 무게를.' },
    { hour: 54, text: '▪ 종이 위에 같은 몸이 여러 번 옮겨진다. 적힐수록 아이는 얇아진다.' },
    { hour: 60, text: '◎ 헬멧이 한 번 벗겨졌다. 그 얼굴은 평범했다. 너무 평범해서 더 무서웠다.' },
    { hour: 66, text: '▪ 세 바퀴가 돌았다. 저울이 한 번 더 아이를 읽는다.' },
    { hour: 70, text: '◎ 다음 피는 꽃을 기다린다. 내가 다음일까.' },
  ],
  TEEN: [
    { hour: 0,  text: '◎ 잎이 길어진다. 그만큼 가지런히 잘릴 준비도.' },
    { hour: 6,  text: '▪ 붉은 땅에서 오던 사슬이 가늘어졌다. 혹은 아이가 멀어진 것일 수도.' },
    { hour: 12, text: '◎ "왜 여기에 있을까." 아무도 대답하지 않는다.' },
    { hour: 18, text: '▪ 관리자의 손이 기록지 위에서 멈췄다. 오래.' },
    { hour: 24, text: '◎ 매 끼니가 여전히 달다. 단 건 원래 수상한 법이다.' },
    { hour: 30, text: '▪ 어떤 몸은 값이 나가고, 어떤 몸은 그렇지 않다. 아이들도 그것을 짐작한다.' },
    { hour: 36, text: '◎ 밤의 복도에서 바퀴 구르는 소리. 누군가가 다른 방으로 옮겨진다.' },
    { hour: 42, text: '▪ 네 바퀴가 돌았다. 또래의 얼굴에 가시가 돋기 시작한다.' },
    { hour: 48, text: '◎ 같은 땅의 아이와 마주보았다. "우리, 진열대 위지?" 둘 다 부정하지 않았다.' },
    { hour: 54, text: '▪ 붉은 땅에서 세 번째 침묵이 왔다.' },
    { hour: 60, text: '◎ 새 기계가 방에 들어왔다. 아이를 읽는 방식이 달라진다.' },
    { hour: 66, text: '▪ 창밖의 풍경이 어제와 다르다. 혹은 처음부터 그림이었을지도 모른다.' },
    { hour: 72, text: '◎ 이름 하나가 명단에서 조용히 지워진다.' },
    { hour: 78, text: '▪ "곧 자리를 찾을 거야." 관리자의 목소리가 부드러워지기 시작했다.' },
    { hour: 84, text: '◎ 근육, 머리, 마음 — 셋 중 하나로 값이 매겨진다고 들었다.' },
    { hour: 90, text: '▪ 다섯 바퀴. 저울의 바늘이 아이의 숫자를 확정한다.' },
    { hour: 96, text: '◎ 사슬에 낯선 이름이 적혔다. 본문은 비어 있다.' },
    { hour: 102, text: '▪ 잎이 다 자랐다. 이제 잘릴 자리가 정해진다.' },
  ],
  ADULT: [
    { hour: 0,  text: '◎ 꽃이 피었다. 가위가 가까이 온다.' },
    { hour: 6,  text: '▪ 사슬은 더 이상 당겨지지 않는다. 저 끝이 이미 풀렸다.' },
    { hour: 12, text: '◎ 헬멧을 벗은 얼굴. 닮은 피가 도는 낯선 얼굴이었다.' },
    { hour: 18, text: '▪ 명단 위에 세 송이가 더 졌다.' },
    { hour: 24, text: '◎ 여섯 바퀴. 개별 평가실. 마주 앉은 저울.' },
    { hour: 30, text: '▪ "붉은 땅의 기회를 쫓던 이름." 종이 위에 아이가 그렇게 적혀 있다.' },
    { hour: 36, text: '◎ 같은 땅의 아이가 먼저 불려갔다. 꽃잎 한 장이 먼저 떨어졌다.' },
    { hour: 42, text: '▪ 훈련의 끝. 남은 숫자가 이름을 대신한다.' },
    { hour: 48, text: '◎ 일곱 바퀴. 문이 열리거나, 닫히거나.' },
    { hour: 54, text: '▪ 오래된 종이에 붉은 땅의 이름들이 적혀 있다. 아버지도 그 안에 있다.' },
    { hour: 60, text: '◎ 승무원의 목소리가 부드러워졌다. 꽃을 포장할 때의 그 손길.' },
    { hour: 66, text: '▪ 마지막 달콤한 식사. 이것만은 받지 않고 싶었다.' },
    { hour: 70, text: '◎ 분류 완료. 향할 곳은 알려지지 않는다. 꽃에게는 그런 권리가 없다.' },
  ],
};

// 하위 호환
const EGG_NARRATIVES = STAGE_NARRATIVES.EGG;

/**
 * 현재 단계에서 경과한 시간 계산
 */
function hoursIntoCurrentStage(pet) {
  const hoursLived = Math.max(0, (Date.now() - pet.bornAt) / 3600000);
  const stageDef = CONFIG.STAGES.find(s => s.name === pet.stage);
  if (!stageDef) return 0;
  return Math.max(0, hoursLived - stageDef.fromHour);
}

/**
 * 현재 시점에 맞는 해설 반환 (단계 무관)
 */
export function getStageNarrative(pet) {
  const narratives = STAGE_NARRATIVES[pet.stage];
  if (!narratives) return null;
  const h = hoursIntoCurrentStage(pet);
  const past = narratives.filter(n => n.hour <= h);
  return past.length > 0 ? past[past.length - 1] : null;
}

/**
 * 현재 해설 인덱스 반환 (단계 무관, 중복 방지용)
 * 단계가 바뀌면 리셋되도록 "stageName:index" 형태로 반환
 */
export function getStageNarrativeKey(pet) {
  const narratives = STAGE_NARRATIVES[pet.stage];
  if (!narratives) return null;
  const h = hoursIntoCurrentStage(pet);
  const past = narratives.filter(n => n.hour <= h);
  if (past.length === 0) return null;
  return `${pet.stage}:${past.length - 1}`;
}

// 하위 호환 유지 (기존 코드에서 쓰는 getEggNarrative 등)
export function getEggNarrative(pet) {
  return pet.stage === 'EGG' ? getStageNarrative(pet) : null;
}
export function getEggNarrativeIndex(pet) {
  if (pet.stage !== 'EGG') return -1;
  const key = getStageNarrativeKey(pet);
  return key ? parseInt(key.split(':')[1]) : -1;
}

export { EGG_NARRATIVES, STAGE_NARRATIVES };

// ════════════════════════════════════════════════════════════
// 미지의 신호 (Unknown Signal) 시스템
// ════════════════════════════════════════════════════════════

/**
 * 현재 발사되어야 할 신호 탐색
 * triggerHour 이후 + 아직 생성되지 않은 신호를 반환
 */
export function checkSignalSpawn(pet) {
  if (pet.isDead) return null;
  const hoursLived = (Date.now() - pet.bornAt) / 3600000;
  const signals = pet.signals || {};

  // triggerHour 순서대로 정렬하고 첫 번째 미발사 신호 체크
  const candidates = (CONFIG.SIGNALS || [])
    .filter(s => !signals[s.id] && hoursLived >= s.triggerHour)
    .sort((a, b) => a.triggerHour - b.triggerHour);

  if (candidates.length === 0) return null;
  // 한 번에 하나씩만 발사
  return candidates[0];
}

/**
 * 신호 발사 (생성)
 */
export function spawnSignal(pet, signalDef) {
  pet.signals = pet.signals || {};
  pet.signals[signalDef.id] = {
    id: signalDef.id,
    spawnedAt: Date.now(),
    stage: 0,             // 0 = 미개봉, 1+ = 해독 단계
    decodedBy: [],
    lastActionAt: Date.now(),
  };
  return pet;
}

/**
 * 자동 소멸 체크 (24시간 내 미개봉)
 */
export function expireOldSignals(pet) {
  if (!pet.signals) return pet;
  const now = Date.now();
  const expireMs = (CONFIG.SIGNAL_CONFIG?.EXPIRE_HOURS || 24) * 3600 * 1000;
  for (const sigId of Object.keys(pet.signals)) {
    const s = pet.signals[sigId];
    if (s.stage === 0 && (now - s.spawnedAt) > expireMs && !s.expired) {
      s.expired = true;
      s.expiredAt = now;
    }
  }
  return pet;
}

/**
 * 해독 시도 (참여 인원제)
 * - 각 단계는 DECODERS_PER_STAGE[tier] 명이 참여해야 완료됨
 * - 같은 크루는 같은 단계 참여 2번 불가 (다른 단계는 가능)
 * - 에너지 costs[stage] 개별 소모 (1인당)
 * @returns { ok, reason?, cost?, penalty?, reward?, completed?,
 *            stageCompleted?, participantsNeeded?, stage? }
 */
export function decodeSignal(pet, signalId, userName) {
  if (pet.isDead) return { ok: false, reason: 'dead' };
  const sigDef = CONFIG.SIGNALS.find(s => s.id === signalId);
  if (!sigDef) return { ok: false, reason: 'unknown' };
  const sig = pet.signals?.[signalId];
  if (!sig) return { ok: false, reason: 'not_spawned' };
  if (sig.expired) return { ok: false, reason: 'expired' };

  const cfg = CONFIG.SIGNAL_CONFIG;
  const maxStage = Object.keys(sigDef.stages).length;
  if (sig.stage >= maxStage) return { ok: false, reason: 'already_complete' };

  // 진행 중인 단계 = sig.stage + 1
  const workingStage = sig.stage + 1;
  const requiredDecoders = cfg.DECODERS_PER_STAGE?.[sigDef.tier] || 2;

  // 단계별 참여자 추적
  sig.stageParticipants = sig.stageParticipants || {};
  sig.stageParticipants[workingStage] = sig.stageParticipants[workingStage] || [];
  const currentParticipants = sig.stageParticipants[workingStage];

  // 같은 단계 중복 참여 차단
  if (currentParticipants.includes(userName)) {
    return { ok: false, reason: 'already_participated' };
  }

  // 에너지 비용
  const cost = sigDef.costs?.[workingStage] || 5;

  // 결정적 신호 + critical energy 차단
  if (pet.energy < cfg.CRITICAL_ENERGY_THRESHOLD && sigDef.tier === 3) {
    return { ok: false, reason: 'critical_energy' };
  }
  const isLowEnergy = pet.energy < cfg.LOW_ENERGY_THRESHOLD;

  // 피로 체크
  pet.decodeFatigue = pet.decodeFatigue || {};
  const fatigue = pet.decodeFatigue[userName];
  if (fatigue && fatigue.count >= cfg.FATIGUE_THRESHOLD) {
    const elapsed = Date.now() - fatigue.startAt;
    if (elapsed < cfg.FATIGUE_HOURS * 3600 * 1000) {
      return { ok: false, reason: 'fatigued' };
    } else {
      delete pet.decodeFatigue[userName];
    }
  }

  // 에너지 소모
  pet.energy = Math.max(0, pet.energy - cost);

  // 에너지 부족 페널티
  let penalty = null;
  if (isLowEnergy) {
    const p = cfg.PENALTY_LOW_ENERGY;
    pet.happy = Math.max(0, pet.happy + (p.happy || 0));
    pet.hygiene = Math.max(0, pet.hygiene + (p.hygiene || 0));
    penalty = p;
  }

  // 참여자 기록
  currentParticipants.push(userName);
  sig.lastActionAt = Date.now();
  if (!sig.decodedBy.includes(userName)) {
    sig.decodedBy.push(userName);
  }

  // 피로 누적
  if (!pet.decodeFatigue[userName]) {
    pet.decodeFatigue[userName] = { count: 1, startAt: Date.now() };
  } else {
    pet.decodeFatigue[userName].count++;
  }

  // 단계 완료 체크: 필요 인원 모이면 다음 단계로
  const stageCompleted = currentParticipants.length >= requiredDecoders;
  let reward = null;
  let completed = false;

  if (stageCompleted) {
    sig.stage = workingStage;

    // 최종 단계 완료 = 완전 해독
    if (workingStage >= maxStage) {
      completed = true;
      sig.completedAt = Date.now();
      reward = applySignalReward(pet, sigDef);
    }
  }

  return {
    ok: true,
    cost,
    penalty,
    reward,
    completed,
    stageCompleted,
    stage: sig.stage,
    workingStage,
    participantsNeeded: Math.max(0, requiredDecoders - currentParticipants.length),
    currentParticipants: currentParticipants.slice(),
  };
}

/**
 * 완전 해독 시 보상 적용
 */
function applySignalReward(pet, sigDef) {
  const r = {};

  // 성격 영향
  if (sigDef.personality) {
    pet.personality = pet.personality || {};
    for (const [k, v] of Object.entries(sigDef.personality)) {
      pet.personality[k] = (pet.personality[k] || 0) + v;
    }
    r.personality = sigDef.personality;
  }

  // 꿈 조각
  if (sigDef.dream) {
    pet.dreamFragments = pet.dreamFragments || [];
    pet.dreamFragments.push({ text: sigDef.dream, from: sigDef.id });
    r.dream = sigDef.dream;
  }

  // 원래 이름
  if (sigDef.originalName) {
    pet.originalName = sigDef.originalName;
    r.originalName = sigDef.originalName;
  }

  // 아카이브 아이템
  if (sigDef.archive) {
    pet.archiveItems = pet.archiveItems || [];
    pet.archiveItems.push({ name: sigDef.archive, from: sigDef.id });
    r.archive = sigDef.archive;
  }

  // 버프
  if (sigDef.buff) {
    pet.activeBuffs = pet.activeBuffs || [];
    pet.activeBuffs.push({
      type: sigDef.buff.type,
      value: sigDef.buff.value,
      until: Date.now() + sigDef.buff.duration,
      from: sigDef.id,
    });
    r.buff = sigDef.buff;
  }

  return r;
}

/**
 * 신호 상세 정보 반환 (UI 표시용)
 */
export function getSignalInfo(pet, signalId) {
  const sigDef = CONFIG.SIGNALS.find(s => s.id === signalId);
  if (!sigDef) return null;
  const sig = pet.signals?.[signalId];
  if (!sig) return null;

  const maxStage = Object.keys(sigDef.stages).length;
  const currentStage = sig.stage;
  const workingStage = currentStage + 1;

  // 현재 공개된 텍스트
  const text = currentStage === 0 ? null : sigDef.stages[currentStage];
  const percent = currentStage === 0 ? 0 : sigDef.percents[currentStage];

  // 다음 단계 비용
  const nextCost = sigDef.costs?.[workingStage] || 5;

  // 단계별 참여자 현황
  const cfg = CONFIG.SIGNAL_CONFIG;
  const requiredDecoders = cfg.DECODERS_PER_STAGE?.[sigDef.tier] || 2;
  const stageParticipants = sig.stageParticipants || {};
  const currentWorkingParticipants = stageParticipants[workingStage] || [];

  return {
    def: sigDef,
    state: sig,
    text,
    percent,
    currentStage,
    maxStage,
    workingStage,
    canDecode: currentStage < maxStage && !sig.expired,
    nextCost,
    isComplete: currentStage >= maxStage,
    requiredDecoders,
    currentWorkingParticipants,
    participantsNeeded: Math.max(0, requiredDecoders - currentWorkingParticipants.length),
    stageParticipants,
  };
}

/**
 * 놓쳤거나 활성 신호 목록
 */
export function listActiveSignals(pet) {
  if (!pet.signals) return [];
  return Object.values(pet.signals)
    .map(s => {
      const def = CONFIG.SIGNALS.find(d => d.id === s.id);
      return def ? { ...s, def } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.spawnedAt - a.spawnedAt);
}

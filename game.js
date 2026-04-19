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
  pet.hunger  = Math.max(0, pet.hunger  - decay.hunger  * hoursElapsed);
  pet.happy   = Math.max(0, pet.happy   - decay.happy   * hoursElapsed);
  pet.energy  = Math.max(0, pet.energy  - decay.energy  * hoursElapsed);
  pet.hygiene = Math.max(0, pet.hygiene - decay.hygiene * hoursElapsed);

  pet.lastTickAt = now;

  // 사망: 3개 이상 스탯이 0
  const zeroCount = [pet.hunger, pet.happy, pet.energy].filter(v => v <= 0).length;
  if (zeroCount >= 3) {
    pet.isDead = true;
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
export function applyAction(pet, action) {
  if (pet.isDead) return { ok: false, reason: 'dead' };
  if (pet.stage === 'EGG') return { ok: false, reason: 'egg' };

  const effect = CONFIG.ACTIONS[action];
  if (!effect) return { ok: false, reason: 'unknown' };

  if ((action === 'play' || action === 'train') && pet.energy < 15) {
    return { ok: false, reason: 'tired' };
  }

  for (const [key, val] of Object.entries(effect)) {
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
export function getProgress(pet) {
  const hoursLived = Math.max(0, (Date.now() - pet.bornAt) / 3600000);
  const totalHours = CONFIG.DURATION_DAYS * 24;
  return {
    hoursLived: Math.floor(hoursLived),
    totalHours,
    day: Math.max(1, Math.min(CONFIG.DURATION_DAYS, Math.floor(hoursLived / 24) + 1)),
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
    { hour: 0,  text: '◎ MANIFEST 업데이트 — SUBJECT-02847 승선 확인됨.' },
    { hour: 1,  text: '◎ 게이트 폐쇄. 뒤돌아본 승무원은 없었다.' },
    { hour: 3,  text: '◎ 닐라쿠린지호 출항. 방향 — 미상.' },
    { hour: 6,  text: '◎ 관리자 보고: 상품 상태 양호. 수송 정상.' },
    { hour: 9,  text: '◎ 첫 식사 배급. 이런 음식은 처음이다.' },
    { hour: 12, text: '◎ 팔뚝의 태그가 미약하게 빛난다.' },
    { hour: 15, text: '◎ 09-12시 검사 완료. 체중, 혈압, 호흡 기록됨.' },
    { hour: 18, text: '◎ 기내 조명 감소 — 야간 모드.' },
    { hour: 21, text: '◎ 소등. 누구의 숨소리도 들리지 않는다.' },
    { hour: 24, text: '◎ 항해 1일차 종료. 알 속에서 심장이 뛴다.' },
    { hour: 27, text: '◎ 07시 기상. 오늘도 동일한 일정이 반복된다.' },
    { hour: 30, text: '◎ 창 너머 먼 불빛. 도착지가 가까워지고 있다.' },
    { hour: 33, text: '◎ 헬멧 쓴 관리자가 알을 들여다본다. 고개를 끄덕인다.' },
    { hour: 35, text: '◎ 게이트 개방 준비. 하선 임박.' },
  ],
  BABY: [
    { hour: 0,  text: '◎ 하선 완료. 첫 호흡 — 공기가 낯설다.' },
    { hour: 3,  text: '◎ 흰 복도를 지나 지정된 구역으로 이송.' },
    { hour: 6,  text: '◎ 첫 정기 검사. 반응 양호.' },
    { hour: 9,  text: '◎ 식사량 초과. 기록에 남김.' },
    { hour: 12, text: '◎ 다른 아이들의 울음소리가 멀리 들린다.' },
    { hour: 18, text: '◎ 승무원 한 명이 이름을 불러주었다. 기억나지 않는다.' },
    { hour: 24, text: '◎ 첫 24시간 경과. 적응도 평균 이상.' },
    { hour: 30, text: '◎ 파트리시오라는 아이가 같은 방에 있다. 화성 출신이라 한다.' },
    { hour: 36, text: '◎ 꿈에서 아버지의 목소리를 들은 것 같다.' },
    { hour: 42, text: '◎ 활동 시간 14-17시. 장난감이 놓였다.' },
  ],
  CHILD: [
    { hour: 0,  text: '◎ 유년기 진입. 언어 학습 프로그램 시작.' },
    { hour: 6,  text: '◎ 동향 출신 아이와 짧은 대화. 이름을 교환했다.' },
    { hour: 12, text: '◎ 식사 거부 관측 — 다른 아이에게서 보고됨.' },
    { hour: 18, text: '◎ 개인 검사실 이동. 1시간 소요.' },
    { hour: 24, text: '◎ 2일차 종료. \'사슬\' 발신 준비됨.' },
    { hour: 30, text: '◎ 아버지로부터 답신 — 짧은 문장. "잘 지내고 있니."' },
    { hour: 36, text: '◎ 카탸가 달 출신이라는 소문을 들었다. 기억이 없다는 그 아이.' },
    { hour: 42, text: '◎ 시베리아에서 온 바시르의 침대가 비었다. \'파견\'됐다고 한다.' },
    { hour: 48, text: '◎ 누군가 돌아오지 않는다는 사실을 아이들도 안다.' },
    { hour: 54, text: '◎ 검사 횟수 증가. 매일 기록이 더해진다.' },
    { hour: 60, text: '◎ 관리자 한 명이 헬멧 없이 지나갔다. 얼굴은 보지 못했다.' },
    { hour: 66, text: '◎ 3일차 종료. 체중 정상 범위.' },
    { hour: 70, text: '◎ 유년기 종료 임박. 다음 단계 배정 대기.' },
  ],
  TEEN: [
    { hour: 0,  text: '◎ 청소년기 진입. 특별 프로그램 배정 예정.' },
    { hour: 6,  text: '◎ 아버지의 \'사슬\' 편지 간격이 벌어졌다.' },
    { hour: 12, text: '◎ 다른 아이에게 물었다 — "우리 왜 여기 있어?" 대답은 없었다.' },
    { hour: 18, text: '◎ 관리자 한 명이 기록 중 손을 멈추고 응시한다.' },
    { hour: 24, text: '◎ 식사의 질이 여전히 비정상적으로 좋다.' },
    { hour: 30, text: '◎ 훈련 강도 조정 — 상품군 분류에 필요한 자료 수집.' },
    { hour: 36, text: '◎ 밤중 복도에서 발소리. 누군가 옮겨진다.' },
    { hour: 42, text: '◎ 4일차 종료. 또래 집단 내 긴장도 상승.' },
    { hour: 48, text: '◎ 파트리시오와 대화 — "우리 다 상품이지?" 둘 다 부정하지 않았다.' },
    { hour: 54, text: '◎ 아버지 답신 없음. 3회차.' },
    { hour: 60, text: '◎ 개인 검사실 지정 횟수 증가. 새로운 장비.' },
    { hour: 66, text: '◎ 창 너머 풍경이 바뀐 것 같다. 혹은 처음부터 영상이었을지도.' },
    { hour: 72, text: '◎ 동료 한 명이 보이지 않는다. 실종 처리.' },
    { hour: 78, text: '◎ 관리자가 말했다 — "곧 분류될 거야. 긴장하지 마."' },
    { hour: 84, text: '◎ 분류 기준 확인. 근력/지능/유대감 — 시장 가치.' },
    { hour: 90, text: '◎ 5일차 종료. 수치가 상품 등급을 결정할 것이다.' },
    { hour: 96, text: '◎ 사슬 — 아버지 대신 모르는 이름의 답신. 내용은 공백.' },
    { hour: 102, text: '◎ 청소년기 종료 임박. 최종 평가 준비.' },
  ],
  ADULT: [
    { hour: 0,  text: '◎ 성년기 진입. 최종 분류 대상자 목록에 포함됨.' },
    { hour: 6,  text: '◎ 아버지의 \'사슬\'은 더 이상 연결되지 않는다.' },
    { hour: 12, text: '◎ 관리자 헬멧이 벗겨진 순간을 목격했다. 낯선 얼굴.' },
    { hour: 18, text: '◎ 동료 명단이 축소되었다. 실종 표시 3건 추가.' },
    { hour: 24, text: '◎ 6일차 종료. 개별 평가 진행 중.' },
    { hour: 30, text: '◎ "크림슨 오퍼튜니티 — 화성 광부의 후손." 기록에 적혀 있었다.' },
    { hour: 36, text: '◎ 파트리시오가 먼저 호출되었다. 돌아오지 않았다.' },
    { hour: 42, text: '◎ 훈련 종료. 남은 수치로 가치가 결정될 것이다.' },
    { hour: 48, text: '◎ 7일차. 하선 시점이 다가온다. 또는 시작.' },
    { hour: 54, text: '◎ 기록 열람 — \'1세 사망 원인: 광산 붕괴 / 계약 미이행\'.' },
    { hour: 60, text: '◎ 승무원들의 목소리가 부드러워졌다. 출하 직전의 예의.' },
    { hour: 66, text: '◎ 마지막 식사. 이것만은 거부하고 싶었다.' },
    { hour: 70, text: '◎ 분류 완료 통보. 목적지는 전달되지 않는다.' },
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

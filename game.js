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

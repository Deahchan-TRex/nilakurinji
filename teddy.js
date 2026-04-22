// ============================================================
// teddy.js - 테디베어 ASCII 아트 빌더 (OPTION C 기반)
//
// 각 단계마다 템플릿이 있고, 눈(EYES)과 입(MOUTH)을 
// 성격/스탯에 따라 동적으로 교체합니다.
// ============================================================

// ────────────────────────────────────────────────────────────
// 눈 표정 — 성격 + 상태
// ────────────────────────────────────────────────────────────
const EYES = {
  // 기본
  default:   { narrow: '. .',   wide: '• •',     baby: '• •' },
  // 행복/활발
  happy:     { narrow: '^ ^',   wide: '^   ^',   baby: '^ ^' },
  // 졸림
  sleepy:    { narrow: '- -',   wide: '-   -',   baby: '- -' },
  // 차분/내향
  calm:      { narrow: 'ᴗ ᴗ',   wide: 'ᴗ   ᴗ',   baby: 'ᴗ ᴗ' },
  // 호기심/활발
  curious:   { narrow: '◕ ◕',   wide: '◕   ◕',   baby: '◕ ◕' },
  // 아픔/배고픔
  unwell:    { narrow: '× ×',   wide: '×   ×',   baby: '× ×' },
  // 의심/성숙
  skeptical: { narrow: '- •',   wide: '-   •',   baby: '- •' },
  // 놀람
  surprised: { narrow: 'o o',   wide: 'o   o',   baby: 'o o' },
  // 사망
  dead:      { narrow: '+ +',   wide: '+   +',   baby: '+ +' },
};

// ────────────────────────────────────────────────────────────
// 입 표정 — 상태
// ────────────────────────────────────────────────────────────
const MOUTH = {
  default:   'ᴗ',   // 평범
  smile:     '⌣',   // 웃음 (happy 높음)
  grin:      'ᴗ',   // 활짝
  frown:     '﹏',   // 시무룩 (happy 낮음)
  hungry:    'o',   // 배고픔
  sleeping:  '~',   // 잠듦
  neutral:   '─',   // 무표정
  dead:      'x',   // 사망
};

// ────────────────────────────────────────────────────────────
// 단계별 템플릿 — {EYES}와 {MOUTH} 자리를 채워넣음
// OPTION C: 미니멀 라인아트
// ────────────────────────────────────────────────────────────
const TEMPLATES = {
  EGG: `
   ⌒⌒⌒
  ( {E} )
   \\ {M} /
    ‾‾‾`,

  BABY: `
   ◠   ◠
  (  {E}  )
   \\   /
    {M}{M}{M}`,

  CHILD: `
   ⌒   ⌒
  (  {E}  )
   \\___/
    | |`,

  TEEN: `
   ⌒     ⌒
  (  {E}  )
   \\___/
   (   )
   /   \\`,

  ADULT: `
   ⌒      ⌒
  (   {E}   )
   \\____/
  /      \\
  \\      /
   |    |`,
};

// BABY는 눈 사이 공백 한 칸, 나머지는 세 칸
function eyeWidthFor(stage) {
  return stage === 'EGG' || stage === 'BABY' ? 'baby' : 'wide';
}

// ────────────────────────────────────────────────────────────
// 성격 + 스탯 → 표정 결정
// ────────────────────────────────────────────────────────────
function decideExpression(pet) {
  if (pet.isDead) return { eyes: 'dead', mouth: 'dead' };

  // 긴급 상태 (스탯 위기)가 성격보다 우선
  if (pet.hunger < 15) return { eyes: 'unwell', mouth: 'hungry' };
  if (pet.hygiene < 15) return { eyes: 'unwell', mouth: 'frown' };
  if (pet.energy < 15) return { eyes: 'sleepy', mouth: 'sleeping' };
  if (pet.happy < 20) return { eyes: 'calm', mouth: 'frown' };

  // 단계별 기본 표정
  if (pet.stage === 'EGG') return { eyes: 'default', mouth: 'default' };
  if (pet.stage === 'BABY') return { eyes: 'surprised', mouth: 'default' };

  // 성격 축 기반
  const p = pet.personality || {};
  const active  = p.activeVsCalm || 0;
  const social  = p.socialVsIntro || 0;
  const diligent = p.diligentVsFree || 0;

  // ADULT 단계에서 성격이 뚜렷해지면 "의심" 표정 (세계관 반영)
  if (pet.stage === 'ADULT' && diligent > 30) {
    return { eyes: 'skeptical', mouth: 'neutral' };
  }

  // TEEN + 내향 → 차분
  if (social < -20) return { eyes: 'calm', mouth: 'default' };

  // 활발 → 호기심
  if (active > 20) return { eyes: 'curious', mouth: 'smile' };

  // 행복도 높으면 웃는 눈
  if (pet.happy > 75) return { eyes: 'happy', mouth: 'smile' };

  // 기본값
  return { eyes: 'default', mouth: 'default' };
}

// ────────────────────────────────────────────────────────────
// 공개 API: 현재 상태에 맞는 ASCII 아트 반환
// ────────────────────────────────────────────────────────────
export function renderTeddy(pet) {
  const template = TEMPLATES[pet.stage] || TEMPLATES.BABY;
  const { eyes, mouth } = decideExpression(pet);

  const eyeWidth = eyeWidthFor(pet.stage);
  const eyeStr = EYES[eyes]?.[eyeWidth] || EYES.default[eyeWidth];
  const mouthChar = MOUTH[mouth] || MOUTH.default;

  return template
    .replace(/\{E\}/g, eyeStr)
    .replace(/\{M\}/g, mouthChar);
}

// ────────────────────────────────────────────────────────────
// 눈 깜빡임 프레임 (closed = true면 눈 감은 상태)
// ────────────────────────────────────────────────────────────
export function renderTeddyBlink(pet) {
  const template = TEMPLATES[pet.stage] || TEMPLATES.BABY;
  const { mouth } = decideExpression(pet);

  const eyeWidth = eyeWidthFor(pet.stage);
  // 눈 감은 상태
  const closedEyes = {
    baby: '- -',
    wide: '-   -',
  };
  const eyeStr = closedEyes[eyeWidth];
  const mouthChar = MOUTH[mouth] || MOUTH.default;

  return template
    .replace(/\{E\}/g, eyeStr)
    .replace(/\{M\}/g, mouthChar);
}

// ────────────────────────────────────────────────────────────
// 단계별 팔 벌린 템플릿 — 클릭 시 순간적으로 표시
// ────────────────────────────────────────────────────────────
const TEMPLATES_HUG = {
  EGG: `
   ⌒⌒⌒
  ( {E} )
   \\ {M} /
    ‾‾‾`,  // EGG는 팔 없음, 기본과 동일

  BABY: `
  \\ ◠   ◠ /
  (  {E}  )
   \\   /
    {M}{M}{M}`,

  CHILD: `
  \\ ⌒   ⌒ /
  (  {E}  )
   \\___/
    | |`,

  TEEN: `
  \\⌒     ⌒/
  (  {E}  )
   \\___/
   (   )
   /   \\`,

  ADULT: `
  \\ ⌒      ⌒ /
  (   {E}   )
   \\____/
  /      \\
  \\      /
   |    |`,
};

// ────────────────────────────────────────────────────────────
// 팔 벌린 인터랙션 렌더 (클릭 시 잠깐 보여줄 용도)
// ────────────────────────────────────────────────────────────
export function renderTeddyHug(pet) {
  const template = TEMPLATES_HUG[pet.stage] || TEMPLATES_HUG.BABY;
  // 표정은 웃는 얼굴로 고정
  const eyeWidth = eyeWidthFor(pet.stage);
  const eyeStr = EYES.happy[eyeWidth];
  const mouthChar = MOUTH.smile;

  return template
    .replace(/\{E\}/g, eyeStr)
    .replace(/\{M\}/g, mouthChar);
}

// ────────────────────────────────────────────────────────────
// 디버그용: 모든 단계 × 표정 조합 출력
// ────────────────────────────────────────────────────────────
export function renderAllExpressions() {
  const result = {};
  for (const stage of Object.keys(TEMPLATES)) {
    result[stage] = {};
    for (const expr of Object.keys(EYES)) {
      const fake = {
        stage,
        personality: {},
        hunger: 80, happy: 80, energy: 80, hygiene: 80,
        isDead: expr === 'dead',
      };
      // 강제로 표정 지정
      const template = TEMPLATES[stage];
      const eyeWidth = eyeWidthFor(stage);
      const eyeStr = EYES[expr][eyeWidth];
      result[stage][expr] = template
        .replace(/\{E\}/g, eyeStr)
        .replace(/\{M\}/g, MOUTH.default);
    }
  }
  return result;
}

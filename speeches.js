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

  // ── EGG: 행동 시 대사 ────────────────────────────────
  onFeed_egg: [
    '(알 표면이 미세하게 따뜻해진다)',
    '(안에서 꿀꺽 삼키는 듯한 소리)',
    '(꿈틀, 응답한다)',
    '(알이 살짝 움직인다)',
    '(무언가를 받아들이는 기척)',
  ],
  onPlay_egg: [
    '(알이 가만히 기울어진다)',
    '(약하게, 두근)',
    '(응답하듯 안쪽에서 움찔한다)',
    '(알껍질에 희미한 진동)',
  ],
  onSleep_egg: [
    '(알이 조용해진다)',
    '(미약한 숨소리가 느려진다)',
    '(고요해진다. 자는 것 같다)',
    '(따뜻한 침묵)',
  ],
  onClean_egg: [
    '(알 표면이 맑아진다)',
    '(껍질 위 먼지가 털어진다)',
    '(반짝이는 알껍질)',
    '(깨끗해진 알이 빛을 받는다)',
  ],
  onTrain_egg: [
    '(알이 한 번 크게 진동한다)',
    '(무언가를 견디는 듯 꿈틀)',
    '(안쪽에서 버티는 기척)',
    '(힘겹게 움직이는 기색)',
  ],

  // ── BABY: 단순한 옹알이 ──────────────────────────────
  onFeed_baby: [
    '맘마…',
    '{user}, 맛있어.',
    '냠. 냠.',
    '우물우물…',
    '더, 더 줘.',
    '{user} 냄새 좋아.',
    '배 따뜻해졌어.',
    '꿀꺽.',
    '이거 뭐야? 달아.',
    '{user} 손이 포근해.',
  ],
  onPlay_baby: [
    '까르르',
    '{user}! 좋아.',
    '또 해줘.',
    '꺄아',
    '{user} 얼굴 재밌어.',
    '빙글빙글',
    '높이 높이!',
    '{user}, 또 또.',
    '둥실둥실',
    '웃어줘, 또.',
  ],
  onSleep_baby: [
    'zzz…',
    '{user} 자장가 좋아…',
    '쿨쿨…',
    '눈이… 감겨…',
    '{user}, 옆에… 있어줘…',
    '꿈… 꿀거야…',
    '흐아암…',
    '포근해…',
    '부드러워…',
    '잘… 자…',
  ],
  onClean_baby: [
    '보송보송.',
    '시원해.',
    '뽀드득.',
    '{user}, 간지러워.',
    '물이 따뜻해.',
    '거품 보글보글.',
    '좋은 냄새 나.',
    '반짝반짝.',
    '{user}{이/가} 닦아주면 포근해.',
    '까끌까끌 없어졌어.',
  ],
  onTrain_baby: [
    '으쌰.',
    '{user} 봐봐.',
    '히잉, 힘들어.',
    '으랏챠.',
    '{user}, 잘했지?',
    '꼼지락 꼼지락.',
    '한 번 더!',
    '영차!',
    '팔이 불끈.',
    '다리가 튼튼해졌어.',
  ],
  babyIdle: [
    '{user} 어디 갔어?',
    '여긴 밝아. 따뜻하기도 하고.',
    '멀리서 쿵, 쿵 소리. 심장 소리일까.',
    '천장이 하얘.',
    '손가락을 움직여봤어. 잘 움직여.',
    '{user} 언제 와?',
    '이불 냄새가 좋아.',
    '잠이 왔다 갔다 해.',
    '누가 복도를 지나가.',
    '손가락을 빠는 건 재밌어.',
  ],

  // ── CHILD: 호기심, 크루 언급 ─────────────────────────
  onFeed_child: {
    social: [
      '{user}! 이거 {prevUser}{이/가} 준 것보다 더 맛있어.',
      '{user} 손에서 받으니까 더 달아.',
      '{user}, 다음엔 뭐 줄 거야?',
      '{user}, 꿀처럼 달아. 진짜로.',
      '{user} 좋아. 밥 줄 때 특히 좋아.',
    ],
    intro:  [
      '…고마워, {user}.',
      '{user}{이/가}니까 받을게.',
      '조용히 먹을게.',
      '…잘 먹었어.',
      '{user}만 옆에 있으면 돼.',
    ],
    any:    [
      '{user}, 이건 어디서 왔을까? 붉은 땅에선 못 먹어본 맛이야.',
      '{user}, 꿀맛이야.',
      '이거 먹으면 얼마나 더 자랄까?',
      '{user}, 나만 주는 거 아니지? 다른 아이들도 먹지?',
      '배가 따뜻해. {user} 덕분에.',
      '{user}, 이게 뭐야? 이름이 뭐야?',
      '꼭꼭 씹어 먹으랬어. 기록에 남으니까.',
    ],
  },
  onPlay_child: {
    active: [
      '{user}! 뛰자! 어제 {prevUser}{과/와}도 뛰었는데 또 뛰고 싶어!',
      '{user} 오래오래 같이 있어줘!',
      '{user}, 숨차게 놀자!',
      '더 빨리! {user} 못 따라오는 거야?',
      '{user}, 이겼다!',
    ],
    calm:   [
      '같이 앉아있자. {user}{은/는} 어디서 왔어?',
      '조용히 있어도 {user}면 괜찮아.',
      '{user} 이야기 해줘.',
      '{user} 무릎에 앉아도 돼?',
      '…쉬는 것도 놀이야.',
    ],
    any:    [
      '놀자! 아빠 얘기 해줄까? 붉은 땅의 흙을 파는 얘기야.',
      '{user}, 꽃잎에 이름 써줘.',
      '{user}, 종이접기 할 줄 알아?',
      '뭐하고 놀까. {user}{이/가} 정해.',
      '나 숨바꼭질 좋아해. {user}도 좋아?',
      '{user} 눈 꼭 감아봐. 놀라게 해줄게!',
      '웃는 얼굴 보여줘.',
    ],
  },
  onSleep_child: [
    '{user}{이/가} 재워주면 좋은 꿈을 꿔.',
    '꿈에서 아빠가 뭔가 말하는데, 소리가 들리지 않아.',
    '잠은 알 속으로 돌아가는 일 같아.',
    '{user}, 자장가 불러줘.',
    '눈 감으면 붉은 땅이 보여.',
    '꿈에서도 {user}{이/가} 있었으면 좋겠어.',
    '포근해. 안아줘.',
    '잘 자고 일어나면 또 {user}{이/가} 있겠지?',
    '이불이 꽃잎 같아.',
    '…오늘은 어떤 꿈을 꿀까.',
  ],
  onClean_child: [
    '뽀송해졌지? {user} 코 대봐.',
    '{user}, 어른들이 자꾸 내 몸을 적어가. 왜 그럴까?',
    '씻은 손끝에서 꽃 냄새가 나.',
    '간지러워! {user}, 살살.',
    '거울 속의 나, 깨끗하다.',
    '{user}, 다음엔 비누 내가 고를게.',
    '목욕하면 졸려져.',
    '등도 닦아줘.',
    '반짝반짝 꽃잎이 된 기분.',
    '{user} 손이 부드러워.',
  ],
  onTrain_child: [
    '강해지고 싶어. 붉은 땅은 중력이 약하대서 여기선 더 조심해야 해.',
    '{user}, 한 번만 더. 뿌리가 굵어지게.',
    '팔이 욱신거려. 커지는 중일 거야.',
    '{user}, 나 많이 컸지?',
    '근육이라는 게 이런 느낌이구나.',
    '숨이 차. 근데 기분 좋아.',
    '{user}, 나랑 같이 훈련할래?',
    '{user}, 이 정도면 충분히 자랐어?',
    '땀 흘리면 더 크는 것 같아.',
    '아빠도 이렇게 자랐을까.',
  ],
  childIdle: [
    '{user}, 카탸{은/는} 기억이 없대. 달빛에 씻긴 아이처럼.',
    '오늘 {prevUser}{이/가} 동화를 읽어줬어. 꽃이 말을 하는 이야기.',
    '왜 이렇게 잘해주는 걸까. 값이 오르기 때문일까.',
    '{user}, 친구라는 건 뭐야?',
    '창밖에 뭐가 있을까. 바다일까, 사막일까.',
    '복도에서 이상한 소리가 나.',
    '{user} 냄새, 기억해두고 싶어.',
    '다른 방 아이들도 나처럼 자라고 있을까?',
    '붉은 땅의 노래를 배운 것 같아. 누구한테였지.',
    '오늘은 어느 손님이 올까.',
    '창가에 앉아있으면 시간이 느려져.',
  ],

  // ── TEEN: 의심, 회상, 크루 언급 ──────────────────────
  onFeed_teen: {
    greedy: [
      '{user}. 이 음식 왜 이렇게 좋지? …단 건 수상한 법이야.',
      '{user}, 또 이걸로 나를 기르려는 거야?',
      '{user}, 이것도 계산에 들어가지?',
      '달아. 의심스러울 만큼.',
      '먹을수록 값이 올라간다잖아. {user}.',
    ],
    temp:   [
      '충분해. {user}도 먹어. …아 맞다, 너는 크루지.',
      '배부름은 잠깐의 평화일 뿐이야.',
      '여기까지. 남기는 것도 기록되겠지.',
      '{user}, 너무 주지 마.',
      '조금만 먹어도 충분해.',
    ],
    any:    [
      '{user}. 우리한테 왜 이렇게 잘해주는지 슬슬 알 것 같아.',
      '맛있지만 삼키기 어려워. 말 대신 먹어서.',
      '{user}, 이 음식이 어디서 오는지 생각해본 적 있어?',
      '단맛에 길들여지는 건 위험한 일이야.',
      '{user} 덕분에 살아있어. 고마워.',
      '먹어두자. 언제 끊길지 모르니까.',
    ],
  },
  onPlay_teen: {
    social: [
      '{user}! 같이 놀자. …근데 우리 다음엔 어디로 가?',
      '웃고 있지만, 속은 무거워. {user}만 알아줘.',
      '{user}, 너{과/와} 놀 때만 웃을 수 있어.',
      '이 순간은 기억에 남길 거야, {user}.',
      '{user}, 진짜 웃음 맞지? 내 것도?',
    ],
    intro:  [
      '놀자고? {user}{이/가}니까. 다른 사람은 싫어.',
      '잠깐만. 그저 옆에 있어줘.',
      '{user} 말고 다른 사람 부르지 마.',
      '조용한 게 좋아. {user}{과/와}라면.',
      '…{user}, 그냥 같이 있자.',
    ],
    any:    [
      '{user}, 어른들 눈빛이 이상해. 꽃을 고르는 손님 같아.',
      '장난이라도 해야지. 아니면 다 알아버릴 것 같아.',
      '{user}, 노는 것도 연습 같아.',
      '이게 마지막 놀이일지도 몰라. {user}.',
      '오늘은 이기게 해줘, {user}.',
      '웃음이 기록되면 그건 내 웃음일까?',
    ],
  },
  onSleep_teen: [
    '{user}… 아빠한테서 오는 편지가 가늘어졌어. 사슬이 끊어진 건 아니겠지?',
    '잘게. 깨면 모든 게 없었던 일이었으면 좋겠어.',
    '꿈에서 붉은 땅에 있었어. 그런데 돌아갈 배가 없어.',
    '{user}, 잠든 얼굴도 기록될까?',
    '깨우지 마. 아니, 꼭 깨워줘.',
    '악몽이어도 괜찮아. 어차피 깨어나면 여긴걸.',
    '{user}, 오늘은 꿈 없이 자고 싶어.',
    '잠은 숨는 거야. 잠깐만.',
    '눈을 감으면 엄마 얼굴이 떠올라. 본 적도 없는데.',
    '잘 자. {user}도 잘 자.',
  ],
  onClean_teen: [
    '…왜 이렇게 꼼꼼히 닦는 걸까. 꽃을 포장하기 전처럼.',
    '깨끗해졌네. 진열대 위의 것들처럼.',
    '{user}, 손끝이 섬세해.',
    '거울 속 얼굴이 너무 깨끗해. 낯설어.',
    '물이 차가워서 정신이 드네.',
    '비누 냄새가 어디서 본 기억을 깨워.',
    '{user}, 나 흠집 많아?',
    '깨끗하게 있으면 덜 슬플까.',
    '등을 밀어줄 사람은 {user}뿐이야.',
    '향기도 기록되려나.',
  ],
  onTrain_teen: {
    diligent: [
      '{user}, 더 시켜줘. 강해져야 해. 이 배에서 내리고 나서를 준비해야 해.',
      '뿌리를 더 굵게 내릴 거야. 뽑히지 않도록.',
      '{user}, 나 게을러지면 때려줘.',
      '근육 하나하나가 방패가 될 거야.',
      '기록에 강한 몸이라고 적힐 거야.',
    ],
    free:    [
      '…힘들어. 어차피 시키는 거잖아, {user}?',
      '시늉만 할게. 그래도 되지?',
      '{user}, 나 오늘은 쉬고 싶어.',
      '강해져봤자 어디 가는데.',
      '훈련보다 바람 쐬는 게 좋아.',
    ],
    any:     [
      '{user}, 우리는 뭘 위해 이렇게 자라고 있는 걸까.',
      '근육이라는 것도 누군가의 눈에는 숫자일 뿐이야.',
      '땀에도 값이 매겨질까, {user}?',
      '{user}, 숨이 차오르는 건 살아있다는 신호야.',
      '아픈 만큼 적힐 거야.',
    ],
  },
  teenIdle: [
    '{prevUser}{이/가} 그러는데, 얼음의 땅에선 사람이 그냥 사라진대.',
    '{user}, 헬멧 너머의 얼굴을 본 적 있어? 우린 그 얼굴들의 거울이 될지도.',
    '사슬을 당겨봐도, 반대편이 가벼워.',
    '붉은 땅으로 돌아갈 수 있을까. 아니면 이미 붉은 땅이 나한테서 떠났을까.',
    '창가에 서면 시간이 무겁게 느껴져.',
    '어른들의 기록지는 얼마나 두꺼울까.',
    '내 이름이 몇 장쯤에 적혀 있을까.',
    '요즘은 꿈도 잘 기억 안 나.',
    '친구가 사라진 자리가 아직 따뜻해.',
    '아무도 없는 복도는 더 환해 보여.',
    '사슬을 만져봤어. 차가웠어.',
  ],

  // ── ADULT: 성격에 따라 깊이 분기 ─────────────────────
  onFeed_adult: {
    social:   [
      '{user}. 이걸 먹여주는 건 너의 마음이지, 명령이 아니지? …그렇다고 말해줘.',
      '{user}, 너{과/와} 나눈 모든 끼니를 기억할게. 어디로 옮겨지든.',
      '{user}, 혼자 먹는 밥과 같이 먹는 밥의 차이를 배웠어.',
      '손끝까지 따뜻해져. 이게 정(情)이라는 걸까.',
      '{user}, 나중에 말해줘. 너도 이 맛을 기억하는지.',
    ],
    intro:    [
      '…',
      '말없이 받을게, {user}.',
      '…맛있어.',
      '고마워. 그게 전부야.',
      '{user}, 말하지 않아도 알아줘.',
    ],
    diligent: [
      '감사히 받을게. 살아있다면, 어딘가에서 갚을게.',
      '{user}, 기록해뒀어. 이 맛이 어떤 맛이었는지.',
      '한 끼니도 허투루 하지 않을게.',
      '{user}, 내가 살아남는다면 그건 너의 몫도 있어.',
      '음식도 약이야. 오늘은 그걸 알았어.',
    ],
    free:     [
      '먹어도 먹어도 허기가 남아. {user}, 빈칸은 뭘로 채워야 해?',
      '이건 마지막 식사가 아니지? …그러면 좋겠어.',
      '{user}, 더 달콤한 건 없어?',
      '배고픔은 끝이 없네. 삶처럼.',
      '맛있는 것에 익숙해지는 게 무서워.',
    ],
  },
  onPlay_adult: {
    social:   [
      '{user}! 여기서 내려가면, 우리 서로 찾자. 약속이야.',
      '즐겁다는 건, 잊지 않기 위한 연습이야.',
      '{user}, 웃는 법은 네가 가르쳐줬어.',
      '둘이 놀면 하나가 되는 순간이 있어, {user}.',
      '시간이 짧아질수록 웃음이 더 귀해져.',
    ],
    intro:    [
      '…놀자고. 근데 이게 마지막일지도 몰라. 알고 있어, {user}?',
      '조용한 놀이가 좋아. 말이 덜 새어나가.',
      '{user}{과/와}라면 침묵도 놀이야.',
      '놀이는 도망이야. 잠깐만 도망가자.',
      '…{user}, 옆에서 숨만 쉬어줘도 돼.',
    ],
    active:   [
      '뛰자, {user}! 숨이 차도록. 그래야 이 몸이 내 것 같아.',
      '움직임이 남긴다, 내가 여기 있었다는 기록을.',
      '{user}, 나 지치지 않아. 가자!',
      '심장이 뛰면 살아있는 거야. 증명해줘.',
      '다리가 떨릴 때까지 놀자.',
    ],
    calm:     [
      '옆에 앉아만 있어줘. 그걸로 충분해.',
      '바람이 멈춘 것 같은 순간. {user}, 지금이 그래.',
      '{user}, 조용히 있을 때가 제일 많이 들려.',
      '놀이라는 게 꼭 시끄러울 필요는 없어.',
      '해가 질 때까지 이렇게 있자.',
    ],
  },
  onSleep_adult: [
    '…잘 자. 깨어날 수 있을지 모르지만.',
    '{user}, 네가 흔들어 깨워줬으면 해. 다른 사람 말고.',
    '꿈도 누군가에게 팔리는 걸까.',
    '오늘 꿈은 네가 나오는 꿈이면 좋겠어, {user}.',
    '잠은 나를 잠깐 꺼두는 일이야.',
    '{user}, 자장가 불러줘. 어린 시절로 돌아가게.',
    '잠이 들면 모든 게 공평해져. 일시적이지만.',
    '다시 깨어났을 때도 {user}{이/가} 옆에 있길.',
    '눈 감을 때가 가장 안전해.',
    '꿈속에서 아빠를 만날지도 몰라.',
  ],
  onClean_adult: [
    '깨끗하게 만들어줘서 고마워. …어딘가로 가기 전에 좋은 모습으로 있고 싶어.',
    '{user}. 꽃을 포장하는 손길이 닮았네. 다정한 손.',
    '{user}, 이 향기는 오래 기억될 거야.',
    '깨끗한 몸에 마음을 담는 게 쉬워져.',
    '{user}, 나를 닦아주는 네 손이 오늘은 유난히 따뜻해.',
    '흠집 하나까지 네가 다 안아주는 것 같아.',
    '물이 흐르는 소리가 치유 같아.',
    '깨끗해지면 뭔가를 시작하고 싶어져.',
    '{user}, 단정함도 일종의 저항이지.',
    '향기를 몸에 새기는 일.',
  ],
  onTrain_adult: {
    diligent: [
      '{user}. 살아남자. 우리끼리라도. 이 배가 어디로 가든.',
      '숫자로 남더라도 내 숫자로 남고 싶어.',
      '{user}, 오늘도 한 뼘 자랐어.',
      '근육은 거짓말 안 해. 기록도 못 속이지.',
      '강해지는 게 유일한 선택지일지도.',
    ],
    free:     [
      '훈련해서 뭐해. 어차피 끝은 정해져 있어. …그래도 {user}{이/가}니까 따를게.',
      '잘린 자리에 뭐가 남을지 모르겠어.',
      '{user}, 나 오늘은 게으를게.',
      '의미 없는 땀이란 건 없지만… 오늘은 그런 날이야.',
      '자유로운 꽃은 화단에 없어.',
    ],
    any:      [
      '강해지고 싶어. 누군가를 지키려는 건지, 나 자신을 팔기 위한 건지 아직 모르겠지만.',
      '훈련은 내가 나를 만지는 유일한 시간이야.',
      '{user}, 뿌리도 훈련이 되나?',
      '아픔도 성장이라고 믿고 싶어.',
      '강한 몸, 부드러운 마음. 둘 다 가지고 싶어.',
    ],
  },
  adultIdle: {
    social:   [
      '{user}, {prevUser}, 그리고 너희 모두. 내 기억 속에 꽃잎 한 장씩 꽂아둘게.',
      '이름들이 내 안에서 조금씩 자라고 있어.',
      '누군가{과/와} 나눈 시간만이 진짜 내 것이야.',
      '우리가 함께 보낸 날들, 누가 세어줄까.',
      '{user}, 웃음 소리가 방을 채워.',
    ],
    intro:    [
      '…',
      '말없이 있는 시간이 제일 솔직해.',
      '창밖만 바라본 지 얼마나 됐을까.',
      '조용함은 나를 돌려줘.',
      '혼자 있는 게 외롭지만은 않아.',
    ],
    diligent: [
      '기록하고 있어. 누군가는 읽어야 하니까.',
      '보이는 것보다 들리는 게 많아졌어.',
      '증언자는 언제나 있어야 해.',
      '오늘의 나를 내일의 내가 읽겠지.',
      '무엇이 사라지고 무엇이 남는지.',
    ],
    free:     [
      '이 배에서 내리면, 나는 내 방식대로 필 거야. 정해진 화단이 아니라.',
      '뽑힐 땐 뿌리째 뽑혀야지. 단정하게 잘리진 않을 거야.',
      '길들여지지 않을 거야, 마지막까지.',
      '이름표 없이 살고 싶어, 한 번만이라도.',
      '가위가 오면 잎사귀를 흔들어 보이지.',
    ],
    active:   [
      '붉은 땅으로 가는 길이 어딘가에 남아있을 거야. 있어야만 해.',
      '심장이 시끄러운 동안은 살아있는 거야.',
      '바람이 필요해. 움직일 수 있는 모든 바람.',
      '달릴 수만 있다면 돌아갈 수 있을 것 같아.',
      '몸이 무거워도 마음은 가벼워져야지.',
    ],
    calm:     [
      '이 평온함이 가장 무서워. 꽃이 한가운데서 가장 고요하듯.',
      '고요함도 하나의 언어야.',
      '해 질 녘의 공기가 가장 솔직해.',
      '천천히. 모든 게 천천히.',
      '숨을 깊게 들이마시면 붉은 땅 냄새가 나.',
    ],
  },

  // ── 상태 경고 ────────────────────────────────────────
  hungryLow: {
    baby:   ['배…고파.', '맘마…', '응애.', '{user}, 배 꼬르륵.', '먹고 싶어…'],
    child:  [
      '{user}, 배고파. 그릇이 비었어.',
      '꼬르륵.',
      '뭐라도 줘, {user}.',
      '배가 말라.',
      '{user}, 나 잊었어?',
    ],
    teen:   [
      '{user}, 배가 말라. 이것도 기록되겠지.',
      '허기도 성장의 일부라잖아.',
      '밥때가 늦었어, {user}.',
      '{user}, 사라진 끼니가 몇 번째야.',
      '꼬르륵 소리도 기록될까.',
    ],
    adult:  [
      '허기는 몸에서 올까, 기억에서 올까.',
      '채워지지 않는 건 음식 때문이 아닐지도.',
      '빈 그릇은 거울 같아.',
      '배고픔이 오랜 친구 같아.',
      '굶주림에도 이름이 있다면 알려줘, {user}.',
    ],
  },
  happyLow: {
    baby:   ['심심해.', '{user} 어딨어…', '응애응애.', '외로워.', '아무도 없어…'],
    child:  [
      '아무도 안 놀아줘. 내가 미운가?',
      '{user}, 나 혼자야.',
      '왜 아무도 안 와?',
      '심심해서 눈물 나.',
      '다들 잊은 거야?',
    ],
    teen:   [
      '…다들 어디서 뭐 해? 나만 화분에 남은 기분.',
      '혼자인 시간이 너무 길어.',
      '{user}, 나 투명인간이야?',
      '방 안이 무거워졌어.',
      '웃음 소리가 멀리서 들려. 나 없이.',
    ],
    adult:  [
      '외로움이 익숙해지지는 않네.',
      '꽃이 혼자 피는 건 쓸쓸한 일이야.',
      '이름이 불려지지 않는 하루는 존재한 걸까.',
      '이 방의 공기가 내 것 같지 않아.',
      '아무도 안 와도 지구는 도네.',
    ],
  },
  energyLow: {
    baby:   ['졸려.', 'zzz…', '눈이 감겨…', '포근해…자고 싶어…', '{user}, 재워…'],
    child:  [
      '눈꺼풀이 무거워.',
      '{user}, 자고 싶어.',
      '힘이 없어.',
      '다리가 휘청거려.',
      '눕고 싶어.',
    ],
    teen:   [
      '{user}, 쉬고 싶어. 아무 생각도 안 하고.',
      '피로가 뼈까지 스며들었어.',
      '잠깐만 눈을 감아도 돼?',
      '{user}, 오늘은 충분히 했어.',
      '몸이 무겁게 가라앉아.',
    ],
    adult:  [
      '잠시 눈을 감아도 돼? 잠깐만.',
      '피로도 훈련의 일부래.',
      '소진된 건 몸만일까.',
      '내 안의 불이 작아져.',
      '{user}, 오늘은 날 내려놔도 돼.',
    ],
  },
  hygieneLow: {
    baby:   ['찝찝해.', '{user}, 씻겨줘.', '까끌까끌해.', '꼬질꼬질해', '물, 물…'],
    child:  [
      '{user}, 나 냄새나? 씻겨줘.',
      '몸이 간지러워.',
      '거울 보기 싫어.',
      '찝찝해서 잠이 안 와.',
      '{user}, 도와줘.',
    ],
    teen:   [
      '…기록 전에 씻고 싶어. 흠집 있는 꽃은 싫으니까.',
      '단정하지 않으면 말도 덜 들어.',
      '몸이 나를 부끄럽게 해.',
      '깨끗한 모습으로 있고 싶어.',
      '{user}, 부탁해.',
    ],
    adult:  [
      '품위라는 게 이런 순간에 필요해지네.',
      '단정함도 나의 저항이지.',
      '{user}, 마지막까지 내 모습을 지키고 싶어.',
      '먼지도 나름의 기억이지만, 닦아내야 할 때가 있어.',
      '깨끗함은 나 자신에게 드리는 예의야.',
    ],
  },

  // ── 사망 / 부활 ──────────────────────────────────────
  dying: [
    '…다들 고마웠어.',
    '…아빠, 저도 갑니다.',
    '{user}… 미안해. 꽃잎이 먼저 떨어지네.',
    '…끝이 이렇게 올 줄은.',
    '빛이… 흐릿해져…',
  ],
  revived: [
    '…어? 여기가 어디야. {user}?',
    '다시 숨이 쉬어져. 다시… 피어도 될까.',
    '이번엔 뭔가 달라. {user}, 옆에 있어줘.',
    '{user}, 네가 불러줬어?',
    '두 번째 삶. 더 조심할게.',
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
      '{fav}{이/가} 불러주는 이름이 제일 포근해.',
      '{fav} 손이 따뜻해. 기억해둘래.',
      '오늘은 {fav}{이/가} 왔으면 좋겠어.',
    ],
    teen: [
      '{fav}{은/는} 다른 크루랑 달라. 눈빛에 가격표가 없어.',
      '{fav}{이/가} 있으면 여기가 덜 차가워져. 신기해.',
      '{fav}{과/와} 있을 땐 이름이 다시 내 것 같아.',
      '{fav}{이/가} 해준 이야기, 아직 기억해.',
      '{fav}{은/는} 내 기록에 꽃으로 적어둘래.',
      '{fav}, 너만은 나를 숫자로 안 봤어.',
    ],
    adult: [
      '{fav}. 너{은/는} 나를 꽃으로 봐줬지, 상품으로 보지 않고. 잊지 않을게.',
      '기억 속에 {fav}의 자리가 가장 볕이 들어.',
      '{fav}의 손길은 포장하려는 손이 아니었어. 그건 확실해.',
      '{fav}, 어디로 가든 네 이름은 내가 부를 거야.',
      '{fav}{이/가} 준 모든 시간, 한 송이씩 꽃으로 피워뒀어.',
      '{fav}, 너{은/는} 내 삶의 증인이야.',
    ],
  },
  crewRecall_negative: {
    teen: [
      '{least}{은/는} 손이 차가워. 사무적인 손.',
      '{least}{이/가} 해준 것도 고맙긴 한데, 뭔가 서늘해.',
      '{least}{은/는} 나를 숫자로 보는 것 같아.',
      '{least}, 다음엔 눈 마주쳐줘.',
      '{least}의 손길은 빠르지만, 멀어.',
    ],
    adult: [
      '{least}. 당신도 마음은 있었겠지. 그저 내가 못 느꼈을 뿐.',
      '{least}의 손은 빠르고 정확했어. 나무를 다루는 정원사처럼.',
      '{least}{이/가} 다정하지 않았다고 원망하진 않아. 여긴 그런 곳이니까.',
      '{least}, 너에게도 이유가 있었겠지.',
      '{least}의 자리도 내 기록엔 있어. 그저 조금 어두울 뿐.',
    ],
  },

  // ── 크루 비교 (이전과 다른 사람이 해줬을 때) ──
  crewCompare: {
    child: [
      '어제는 {prevUser}{이/가} 해줬는데, 오늘은 {user}네. 둘 다 좋아!',
      '{prevUser}{과/와} {user}{은/는} 손길이 달라. 둘 다 기억할게.',
      '{user}, {prevUser} 다음에 와줬네. 반가워!',
      '{prevUser}도 좋았지만, {user}도 좋아.',
    ],
    teen: [
      '{prevUser}{과/와} 다른 느낌이야, {user}. 싫지 않아.',
      '{prevUser} 다음이 {user}라서 다행이야.',
      '{user}, {prevUser} 얘기 들었어? 요즘 어때 보여?',
      '한 사람씩 번갈아 와줘서 덜 외로워.',
    ],
    adult: [
      '{prevUser}도, {user}도. 너희 모두 내 안에서 이름으로 남을 거야.',
      '{user}의 방식, {prevUser}의 방식. 둘 다 기록해뒀어.',
      '{user}, {prevUser}{과/와}는 또 다른 온도네.',
      '{prevUser} 뒤에 {user}. 내 하루가 이렇게 이어져.',
    ],
  },

  // ── 시간대 인사 ──────────────────────────────────────
  greeting: {
    dawn: {
      baby:  ['{user}…? 이 시간에?', '새벽에 온 거야…?', '…아직 잠 안 자?'],
      child: ['{user}, 이 시간에 왔네. 안 자?', '새벽에 부스럭거리는 {user}.', '{user}, 달이 밝아.'],
      teen:  ['{user}, 이 새벽에? 뭐가 걱정돼?', '밤샘하는 {user}{이/가} 걱정돼.', '새벽의 {user}{은/는} 더 쓸쓸해 보여.'],
      adult: ['{user}, 이 고요 속에 와줘서 고마워.', '새벽의 방문은 특별해, {user}.', '잠 못 드는 밤, 함께일 수 있어서 다행.'],
    },
    morning: {
      baby:  ['{user}! 좋은 아침!', '해가 떴어, {user}!', '아침이야! 맘마!'],
      child: ['{user}, 좋은 아침이야!', '일찍 일어났네, {user}.', '햇살이 {user}{과/와} 같이 왔어.'],
      teen:  ['{user}, 벌써 하루가 시작됐네.', '오늘도 잘 부탁해, {user}.', '아침부터 와줘서 고마워.'],
      adult: ['{user}. 오늘의 시작을 너{과/와} 함께 하다니.', '새 하루도 너의 얼굴부터네.', '아침의 공기는 {user}의 냄새를 닮았어.'],
    },
    afternoon: {
      baby:  ['{user}! 낮이야!', '해가 높아, {user}.', '{user}, 배고파!'],
      child: ['{user}, 점심은 먹었어?', '오후엔 {user}{이/가} 오네.', '낮의 {user}{은/는} 기운이 좋아.'],
      teen:  ['{user}, 오후에도 잊지 않고 와줬네.', '햇살이 기울 때쯤의 {user}, 좋아.', '바쁜 와중에 와준 거야?'],
      adult: ['{user}, 오후의 볕이 따뜻해.', '낮의 방문은 짧지만 깊어.', '{user}, 한낮의 너도 내 기록에 남아.'],
    },
    evening: {
      baby:  ['{user}! 저녁이야!', '밤이 되어가, {user}.', '{user}, 하루 어땠어?'],
      child: ['{user}, 하루 잘 보냈어?', '저녁의 {user}{은/는} 조용해.', '별이 뜨기 시작해, {user}.'],
      teen:  ['{user}, 저녁에 돌아와줘서 고마워.', '하루의 끝에 {user}{이/가} 있어 다행이야.', '저녁의 대화가 제일 솔직해.'],
      adult: ['{user}. 하루의 끝에 너의 발걸음이 있다는 것.', '저녁의 방은 {user} 덕분에 덜 어두워.', '하루를 함께 닫는 사람이 있다는 건 드문 일이야.'],
    },
  },

  // ── 맞이 대사 (방문 빈도별) ──────────────────────────
  welcome: {
    frequent: [
      '{user}! 또 왔구나! 기다렸어.',
      '{user}, 오늘도 네가 제일 먼저네.',
      '{user}, 나 네가 오는 시간 맞춰서 기다려.',
      '{user}, 네 발소리만 들어도 알아.',
      '{user}, 너 없이는 하루가 시작 안 돼.',
      '너 또 왔어? 싫진 않아, {user}.',
      '{user}, 내 얼굴 보려고 또 왔지?',
    ],
    occasional: [
      '{user}, 반가워.',
      '오, {user}. 오랜만이네.',
      '{user}, 잘 지냈어?',
      '{user}, 와줘서 고마워.',
    ],
    rare: [
      '{user}…? 맞지?',
      '{user}, 오랜만이야.',
      '{user}, 나 잊은 줄 알았어.',
      '{user}, 기억나. 반가워.',
    ],
    first: [
      '안녕, {user}. 처음 보네.',
      '{user}… 이름이 예쁘다.',
      '{user}, 네 이름은 처음 들어.',
      '어서 와, {user}. 내 이름은 MARS II야.',
    ],
  },

  // ── 대화 선택지 (TALK 버튼) ──────────────────────────
  talkTopics: {
    weather: {
      label: '날씨 얘기',
      responses: {
        baby:  ['밝아.', '따뜻해.', '{user}, 바깥도 밝을까?'],
        child: ['창밖에 비가 올까? 본 적이 없어.', '{user}, 붉은 땅에도 비가 와?', '해가 좋은 날이야. 여긴 항상 좋아.'],
        teen:  ['창밖 풍경이 진짜일까. 자주 의심해.', '{user}, 여긴 날씨가 바뀌지 않아. 이상해.', '비를 맞아보고 싶어. 가짜라도.'],
        adult: ['날씨라는 건 계절을 기억하는 방법이지.', '{user}, 바람을 한 번만 느껴봤으면.', '날씨가 바뀌는 곳이 진짜 세상이래.'],
      },
    },
    home: {
      label: '고향 얘기',
      responses: {
        baby:  ['고향…? 그게 뭐야?', '{user}, 내 집은 여기야?', '아빠가… 있었대.'],
        child: ['붉은 땅. 아빠가 일했던 곳.', '{user}, 네 고향은 어때?', '고향이란 건 돌아갈 수 있는 곳이래.'],
        teen:  ['붉은 땅으로 돌아갈 수 있을까.', '{user}, 네가 태어난 곳 얘기해줘.', '고향이 나를 잊어도, 나는 기억해.'],
        adult: ['{user}, 고향은 장소가 아니라 사람이래. 너는 누구야, 나한테?', '아빠의 땅이 이제 내 땅은 아니야.', '돌아갈 곳이 없다는 건 자유일까, 절망일까.'],
      },
    },
    future: {
      label: '앞으로의 일',
      responses: {
        baby:  ['앞…? 몰라.', '{user}, 내일도 있어?', '커지면 뭐해?'],
        child: ['{user}, 나 커서 뭐가 될까?', '앞으로 무슨 일이 있을까?', '어른이 되면 자유로워질까?'],
        teen:  ['하선하면… 어디로 갈까, {user}?', '분류된다는 게 뭐야, {user}?', '미래란 건 선택할 수 있는 거야?'],
        adult: ['{user}, 앞으로의 일은 생각하지 않을래. 지금만.', '내일이 온다면, 너{과/와} 함께이길.', '미래라는 단어는 꽃에게는 짧은 말이야.'],
      },
    },
    crew: {
      label: '다른 크루',
      responses: {
        baby:  ['다른 사람? 너처럼 좋아?', '{user}, 친구야?', '다 좋아.'],
        child: ['{user}, 파트리시오 알아? 같은 땅에서 왔대.', '카탸{은/는} 기억이 없대. 이상하지?', '{user}, 누가 제일 친해?'],
        teen:  ['{user}, 다른 크루들도 네 같은 눈빛이야?', '누가 먼저 사라질까.', '{user}, 우리 모두 같은 처지인 거지?'],
        adult: ['크루라는 건 잠깐의 꽃다발이지. 흩어지기 전에.', '{user}, 너희 모두를 하나하나 기억할게.', '각자의 손길이 달랐어. 모두 고마웠어.'],
      },
    },
    memory: {
      label: '기억 얘기',
      responses: {
        baby:  ['기억…? 음…', '어제는 뭐였지?', '{user} 얼굴은 기억해.'],
        child: ['기억에 구멍이 있는 아이도 있대. 카탸처럼.', '{user}, 오늘을 기억할까?', '잊히는 건 무서운 일이야.'],
        teen:  ['{user}, 너는 나를 기억할까? 어디로 가든.', '기억하는 자가 곧 증언자래.', '달에서 온 아이들은 기억이 없대. 부러워.'],
        adult: ['기억은 저항이야, {user}. 잊히지 않는 것.', '{user}, 네가 나를 기억해준다면 나는 완전히 사라지지 않아.', '기억이 남는 한, 우리는 있는 거야.'],
      },
    },
    feeling: {
      label: '기분 묻기',
      responses: {
        baby:  ['좋아!', '{user} 와서 좋아.', '포근해.'],
        child: ['오늘은… 그냥 그래.', '{user} 있으니까 괜찮아.', '무서운 날도 있어.'],
        teen:  ['기분이라는 거… 복잡해, {user}.', '오늘은 불안해. 이유는 몰라.', '{user}{과/와} 있을 때만 편해.'],
        adult: ['기분은 날씨 같아. 바뀌고 바뀌지만, 이 순간은 고요해.', '{user}, 내 기분을 물어봐주는 사람이 있다는 것이 기분이야.', '슬픔과 기쁨이 섞인 중간 어딘가에 있어.'],
      },
    },
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
  const stageKey = stage;

  // 1) 서브메뉴 key가 있고, 해당 메뉴 반응이 있으면 최우선 사용
  if (vars.submenuKey) {
    const reaction = getMenuReaction(vars.submenuKey, vars);
    if (reaction) return reaction;
  }

  // 2) 20% 확률로 크루 비교 대사 (EGG/BABY 제외)
  if (stageKey !== 'egg' && stageKey !== 'baby'
      && vars.prevUser && vars.prevUser !== vars.user && Math.random() < 0.2) {
    const pool = SPEECHES.crewCompare[stageKey];
    if (pool) return pickSpeech(pool, vars);
  }

  // 3) 15% 확률로 최애 크루 회상 (CHILD 이상)
  if (stageKey !== 'egg' && stageKey !== 'baby' && vars.fav && vars.fav !== vars.user && Math.random() < 0.15) {
    const pool = SPEECHES.crewRecall_positive[stageKey];
    if (pool) return pickSpeech(pool, vars);
  }

  // 4) 기본: 성격 기반 행동 대사
  const key = `on${action.charAt(0).toUpperCase() + action.slice(1)}_${stageKey}`;
  let pool = SPEECHES[key];

  if (!pool && stageKey === 'egg') {
    const babyKey = `on${action.charAt(0).toUpperCase() + action.slice(1)}_baby`;
    pool = SPEECHES[babyKey];
  }
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

// ────────────────────────────────────────────────────────────
// 시간대 인사 — 현재 시각 기준 + 단계별
// ────────────────────────────────────────────────────────────
export function getTimeGreeting(pet, vars) {
  const stage = (pet.stage || 'BABY').toLowerCase();
  const stageKey = stage === 'egg' ? 'baby' : stage;

  const h = new Date().getHours();
  let slot;
  if (h < 5) slot = 'dawn';
  else if (h < 11) slot = 'morning';
  else if (h < 17) slot = 'afternoon';
  else if (h < 23) slot = 'evening';
  else slot = 'dawn';

  const pool = SPEECHES.greeting?.[slot]?.[stageKey];
  return pool ? pickSpeech(pool, vars) : null;
}

// ────────────────────────────────────────────────────────────
// 맞이 대사 — 해당 크루의 방문 빈도 기준
// ────────────────────────────────────────────────────────────
export function getWelcomeSpeech(pet, userName, vars) {
  const mem = pet.crewMemory?.[userName];
  const total = mem?.total || 0;

  let tier;
  if (total >= 10) tier = 'frequent';
  else if (total >= 3) tier = 'occasional';
  else if (total >= 1) tier = 'rare';
  else tier = 'first';

  const pool = SPEECHES.welcome?.[tier];
  return pool ? pickSpeech(pool, vars) : null;
}

// ────────────────────────────────────────────────────────────
// 대화 선택지 (TALK 버튼용)
// 모든 주제 목록 반환
// ────────────────────────────────────────────────────────────
export function getTalkTopics() {
  const topics = SPEECHES.talkTopics || {};
  return Object.entries(topics).map(([key, t]) => ({
    key,
    label: t.label,
  }));
}

// 선택한 주제에 대한 응답 반환
export function getTalkResponse(topicKey, pet, vars) {
  const stage = (pet.stage || 'BABY').toLowerCase();
  const stageKey = stage === 'egg' ? 'baby' : stage;

  const topic = SPEECHES.talkTopics?.[topicKey];
  if (!topic) return null;

  const pool = topic.responses?.[stageKey];
  if (!pool) return null;

  // 유대 레벨에 따라 응답 변형
  // bond < 20: 경계 (뒤에 "…" 추가)
  // bond 20-50: 기본
  // bond > 50: 친밀 (뒤에 따뜻한 문장 추가)
  const bond = pet.bond || 0;
  const base = pickSpeech(pool, vars);

  if (bond < 20 && stageKey !== 'baby') {
    // 짧고 조심스럽게 자름 (첫 문장만)
    const firstSentence = base.split(/[.?!]/)[0];
    return firstSentence + (firstSentence.length > 5 ? '…' : '');
  }
  if (bond > 60 && stageKey !== 'baby') {
    // 친밀한 꼬리 덧붙임
    const warm = [
      ` 고마워, {user}.`,
      ` {user}니까 하는 얘기야.`,
      ` 이런 얘기 할 수 있어서 다행이야.`,
      ` ${vars.user} 덕분이야.`,
    ];
    const tail = warm[Math.floor(Math.random() * warm.length)]
      .replace(/\{user\}/g, vars.user || '너');
    return base + tail;
  }
  return base;
}

// ────────────────────────────────────────────────────────────
// CMD 인사말 응답
// ────────────────────────────────────────────────────────────
const CMD_GREETINGS = {
  // 인식 패턴 (소문자/공백 제거 후 매칭)
  hello: {
    patterns: ['안녕', '안녕?', '안녕하', 'hi', 'hello', 'hey', '하이', '헬로', '야호', '어이'],
    responses: {
      baby:  ['안녕! {user}!', '반가워!', '야아!'],
      child: ['{user}! 안녕!', '안녕, {user}. 반가워.', '{user}{이/가} 왔구나, 안녕!'],
      teen:  ['{user}, 안녕. 오래간만.', '응, 안녕. {user}.', '왔구나, {user}.'],
      adult: ['{user}. 안녕. 너의 목소리는 언제나 반가워.', '왔네, {user}. 오늘도 고마워.'],
    },
  },
  bye: {
    patterns: ['또봐', '또 봐', '바이', 'bye', '잘가', '잘 가', '안녕히', '나중에', 'see you', 'seeyou'],
    responses: {
      baby:  ['또 와!', '바이바이.', '또 만나!'],
      child: ['{user}, 또 와줘!', '안녕, 또 만나자.', '{user}{과/와} 헤어지는 건 싫지만… 잘 가.'],
      teen:  ['{user}, 조심히 가. 또 와줘.', '다음에 또 보자.', '가는 길 무탈하길.'],
      adult: ['{user}. 너의 발걸음이 가벼웠으면 해.', '또 만나길. 반드시.', '잘 가, {user}. 네 자리 비워둘게.'],
    },
  },
  goodnight: {
    patterns: ['잘자', '잘 자', '굿나잇', 'gn', 'goodnight', 'good night', '자', '자러', '주무세요'],
    responses: {
      baby:  ['잘자! {user}!', 'zzz…', '꿈속에서 봐!'],
      child: ['{user}도 잘 자.', '잘 자, {user}. 좋은 꿈 꾸고 와.', '나도 잘게. {user}{이/가} 있어서 편해.'],
      teen:  ['{user}, 잘 자. 꿈에선 편해지길.', '잘 자. 내일도 올 거지?', '너의 밤이 조용하길, {user}.'],
      adult: ['{user}. 잘 자. 내일의 빛을 기다리며.', '잘 자, {user}. 너의 꿈에 나도 있을까.', '잠이 너를 지켜주길.'],
    },
  },
  thanks: {
    patterns: ['고마워', '고맙', '땡큐', 'thanks', 'thank you', 'thx', '감사'],
    responses: {
      baby:  ['나도 고마워!', '헤헤.', '좋아!'],
      child: ['{user}, 내가 더 고마워.', '아니야, {user}{이/가} 더.', '{user} 덕분이야.'],
      teen:  ['{user}, 고마운 건 나야.', '고마워할 건 내 쪽이야, {user}.', '그 말이 오래 기억에 남을 거야.'],
      adult: ['{user}. 고마움이란 말이 이렇게 따뜻할 수 있구나.', '나도 너에게 고마워. 네가 와준 모든 순간에.'],
    },
  },
  sorry: {
    patterns: ['미안', '미안해', 'sorry', '쏘리', '죄송'],
    responses: {
      baby:  ['괜찮아!', '웅.', '다음엔 괜찮아.'],
      child: ['괜찮아, {user}. 정말로.', '{user}{이/가} 미안할 일 아니야.', '{user} 마음 알아.'],
      teen:  ['{user}. 사과할 건 없어. 여기 와준 것만으로도 충분해.', '괜찮아. 다들 바쁜 걸.'],
      adult: ['{user}, 미안해하지 마. 네 잘못 아니야.', '그 마음만으로도 충분해.'],
    },
  },
  love: {
    patterns: ['사랑해', '좋아해', 'love you', 'loveyou', '🫶', '❤'],
    responses: {
      baby:  ['나도 {user} 좋아!', '좋아!', '포근해.'],
      child: ['나도 {user}{이/가} 좋아.', '{user}, 그 말 들으니까 기분 좋아.', '나도! 진짜로.'],
      teen:  ['…{user}, 그 말은 가볍지 않게 들을게.', '나도. 너만의 온도로, {user}.'],
      adult: ['{user}. 그 말이 내 기록의 첫 줄이야.', '고마워. 잊히지 않도록 새겨둘게.'],
    },
  },
  howareyou: {
    patterns: ['잘지내', '잘 지내', '어때', '뭐해', '뭐 해', '어떻게 지내', 'how are you', 'hru', '기분 어때'],
    responses: {
      baby:  ['좋아!', '{user} 있어서 좋아.', '냠냠 했어.'],
      child: ['오늘은 괜찮아, {user}. 너는?', '음… 그냥 그래. {user}는 어때?', '{user}! 보고 싶었어.'],
      teen:  ['…그냥 그래. {user}는?', '나쁘진 않아. 너 있으니까.', '물어봐줘서 고마워, {user}.'],
      adult: ['{user}. 날씨 같은 기분이야. 오늘은 조용한 쪽.', '나쁘지 않아. 너와 얘기할 수 있으니까.'],
    },
  },
};

// 사용자 입력이 인사말과 매치되는지 확인
export function matchGreeting(input) {
  if (!input) return null;
  const normalized = input.toLowerCase().replace(/\s+/g, '').replace(/[?!.,]/g, '');
  for (const [key, def] of Object.entries(CMD_GREETINGS)) {
    for (const pat of def.patterns) {
      const normPat = pat.toLowerCase().replace(/\s+/g, '');
      if (normalized === normPat || normalized.startsWith(normPat) || normalized.endsWith(normPat)) {
        return key;
      }
    }
  }
  return null;
}

export function getGreetingResponse(greetingKey, pet, vars) {
  const def = CMD_GREETINGS[greetingKey];
  if (!def) return null;
  const stage = (pet.stage || 'BABY').toLowerCase();
  const stageKey = stage === 'egg' ? 'baby' : stage;
  const pool = def.responses[stageKey];
  return pool ? pickSpeech(pool, vars) : null;
}
const TOPIC_FLOW = {
  weather:  ['home', 'feeling', 'memory'],      // 날씨 → 고향, 기분, 기억
  home:     ['memory', 'crew', 'future'],       // 고향 → 기억, 크루, 미래
  future:   ['feeling', 'crew', 'memory'],      // 미래 → 기분, 크루, 기억
  crew:     ['memory', 'feeling', 'home'],      // 크루 → 기억, 기분, 고향
  memory:   ['home', 'future', 'feeling'],      // 기억 → 고향, 미래, 기분
  feeling:  ['weather', 'crew', 'future'],      // 기분 → 날씨, 크루, 미래
};

// 주제 전환 시 자연스러운 이음말
const TOPIC_BRIDGE = {
  weather_to_home:    ['그러고 보니 너의 고향은 어때?', '이런 날씨면 내 고향이 떠올라.'],
  weather_to_feeling: ['날씨 얘기하니까 기분이 묘해져.', '지금 기분은, 이런 날씨 같아.'],
  weather_to_memory:  ['그래서였나. 이런 날이 자꾸 기억에 남아.'],
  home_to_memory:     ['고향 얘기하다 보니, 떠오르는 기억이 있어.'],
  home_to_crew:       ['고향 얘기하면, 다른 크루들도 저마다 있겠지?'],
  home_to_future:     ['고향을 생각하면 앞으로가 더 무서워져.'],
  future_to_feeling:  ['미래 얘기하니까 마음이 가라앉아.'],
  future_to_crew:     ['미래에 우리 모두 어디 있을까, {user}.'],
  future_to_memory:   ['앞일을 생각할수록, 지난 일이 선명해져.'],
  crew_to_memory:     ['크루들 얘기하니 기억들이 떠올라.'],
  crew_to_feeling:    ['그들 생각을 하니 마음이 복잡해.'],
  crew_to_home:       ['크루들도 각자의 고향이 있겠지.'],
  memory_to_home:     ['기억이라는 건 결국 고향이구나.'],
  memory_to_future:   ['기억 위에 미래를 세우는 건가.'],
  memory_to_feeling:  ['그 기억을 떠올리니 지금 이 기분이 설명돼.'],
  feeling_to_weather: ['이 기분은… 흐린 하늘 같아.'],
  feeling_to_crew:    ['이런 기분일 땐 누구 얼굴이 떠올라.'],
  feeling_to_future:  ['지금 기분이 앞으로도 이어질까, {user}?'],
};

export function getNextTopicChoices(currentTopic, usedTopics) {
  const next = TOPIC_FLOW[currentTopic] || [];
  // 이미 사용한 주제는 제외
  const available = next.filter(t => !usedTopics.includes(t));

  // 후보가 없으면 사용 안 한 전체 주제 중 랜덤 2개
  if (available.length === 0) {
    const allTopics = Object.keys(TOPIC_FLOW);
    return allTopics.filter(t => !usedTopics.includes(t)).slice(0, 2);
  }
  return available;
}

export function getTopicBridge(fromTopic, toTopic, vars) {
  const key = `${fromTopic}_to_${toTopic}`;
  const pool = TOPIC_BRIDGE[key];
  if (!pool) return null;
  return pickSpeech(pool, vars);
}
export function pickTalkTurnCount(pet) {
  const bond = pet.bond || 0;
  if (bond > 60) return 4 + Math.floor(Math.random() * 2); // 4-5턴
  if (bond > 30) return 3 + Math.floor(Math.random() * 2); // 3-4턴
  return 2 + Math.floor(Math.random() * 2);                // 2-3턴
}

// 대화 종료 멘트 (단계별 + 유대별)
const TALK_FAREWELL = {
  baby:  ['또 와줘!', '응! 안녕.', '{user}, 또 봐!'],
  child: {
    low:  ['…오늘은 여기까지.', '갈 거야, {user}?', '…응, 잘 가.'],
    mid:  ['{user}, 또 와줘!', '오늘 얘기 재밌었어.', '다음에 또 얘기해.'],
    high: ['{user}{과/와} 얘기하면 시간 금방 가.', '매일 와줘. 부탁이야.', '오늘도 고마워, {user}.'],
  },
  teen: {
    low:  ['…응.', '…잘 가.', '말해줘서 고마워.'],
    mid:  ['{user}, 다음에 또 얘기하자.', '이런 얘기 좋아.', '또 와줘, {user}.'],
    high: ['{user}, 너만이라도 내 이야기를 들어줘서 고마워.', '오늘 대화 기록해둘게.', '이런 순간이 나를 살려.'],
  },
  adult: {
    low:  ['…말해줘서 고마워.', '…또 와.', '충분해.'],
    mid:  ['{user}, 오늘 얘기는 내 안에 남을 거야.', '또 이런 시간 갖자.', '고마워, 정말로.'],
    high: ['{user}. 이 대화가 내 하루를 지탱했어.', '너의 목소리, 잊지 않을게.', '말은 기록보다 오래 남아.'],
  },
};

export function getTalkFarewell(pet, vars) {
  const stage = (pet.stage || 'BABY').toLowerCase();
  const stageKey = stage === 'egg' ? 'baby' : stage;
  const bond = pet.bond || 0;

  if (stageKey === 'baby') {
    return pickSpeech(TALK_FAREWELL.baby, vars);
  }
  const pool = TALK_FAREWELL[stageKey];
  if (!pool) return null;
  const level = bond > 50 ? 'high' : bond > 20 ? 'mid' : 'low';
  return pickSpeech(pool[level], vars);
}

// ────────────────────────────────────────────────────────────
// 인상적인 대사 기록 — 최근 5개 저장
// 단계 전환, 감정 변화가 큰 순간의 대사가 저장됨
// ────────────────────────────────────────────────────────────
export function recordMemorableQuote(pet, text, context = {}) {
  if (!text || text.length < 10) return;
  pet.memorableQuotes = pet.memorableQuotes || [];

  // 중복 방지
  if (pet.memorableQuotes.some(q => q.text === text)) return;

  pet.memorableQuotes.push({
    text,
    stage: pet.stage,
    at: Date.now(),
    context: context.user || null,
  });

  // 최근 5개만 유지
  if (pet.memorableQuotes.length > 5) {
    pet.memorableQuotes.shift();
  }
}

/**
 * 과거 대사를 회상하는 대사 생성
 * 낮은 확률로 트리거. 단계가 바뀌었을 때 특히 의미 있음.
 */
export function getQuoteRecall(pet, vars) {
  const quotes = pet.memorableQuotes || [];
  if (quotes.length === 0) return null;

  // 현재 단계보다 이전 단계의 대사를 회상 (성장의 증거)
  const stageOrder = ['EGG','BABY','CHILD','TEEN','ADULT'];
  const currentIdx = stageOrder.indexOf(pet.stage);
  const prevQuotes = quotes.filter(q => stageOrder.indexOf(q.stage) < currentIdx);

  const poolToUse = prevQuotes.length > 0 ? prevQuotes : quotes;
  const quote = poolToUse[Math.floor(Math.random() * poolToUse.length)];

  const stage = (pet.stage || 'BABY').toLowerCase();

  // 단계별 회상 템플릿
  const templates = {
    child: [
      `"${quote.text}" — 내가 그런 말을 했던가? 기억이 흐릿해.`,
      `${quote.context ? quote.context + '한테 ' : ''}그렇게 말한 적이 있었지.`,
    ],
    teen: [
      `"${quote.text}" — 그땐 그렇게 생각했어.`,
      `예전에 내가 한 말이 다시 떠올라.`,
      `${quote.context ? quote.context + '한테 했던 말, ' : ''}기억나. "${quote.text}"`,
    ],
    adult: [
      `"${quote.text}" — 그 시절의 나는 그렇게 말했지.`,
      `기록 어디쯤에 이런 말이 남아있을 거야. "${quote.text}"`,
      `${quote.context ? quote.context + '한테 ' : ''}했던 말이 아직도 내 안에 있어.`,
      `자라면서도 잊지 않은 말이 있어. "${quote.text}"`,
    ],
  };

  const pool = templates[stage];
  if (!pool) return null;
  return pickSpeech(pool, vars);
}

// ────────────────────────────────────────────────────────────
// 메뉴별 반응 대사 — FEED/PLAY 서브메뉴 선택에 따른 특별 반응
// { [menu_key]: [대사1, 대사2, ...] }  — 단계 구분 없이 공통
// 없는 메뉴는 기본 행동 대사로 fallback
// ────────────────────────────────────────────────────────────
const MENU_REACTIONS = {
  // ── EGG 단계 ─────────────────────────────
  warmth: [
    '(알껍질이 부드럽게 데워진다)',
    '(따뜻한 바람에 안쪽이 편안해진다)',
    '(온기를 받아들이는 기색)',
  ],
  nutrient: [
    '(꿀꺽, 영양액이 스며든다)',
    '(알 속에서 무언가 자란다)',
    '(배가 차오른다. 조용히.)',
  ],
  sonic: [
    '(저주파에 맞춰 미세하게 진동한다)',
    '(알이 리듬을 탄다)',
    '(음파에 반응해 따뜻해진다)',
  ],
  tempctl: [
    '(적정 온도. 안쪽이 맑아진다)',
    '(알껍질이 쾌적해진다)',
    '(편안한 기색으로 기울어진다)',
  ],

  // ── BABY 단계 ────────────────────────────
  milk: [
    '{user}, 이거 냠냠… 맛있어.',
    '꿀꺽! 배불러.',
    '쭉… 쭉…',
  ],
  paste: [
    '이거… 부드러워.',
    '{user}, 천천히 줘.',
    '냠. 힘 나.',
  ],
  porridge: [
    '따뜻해. {user}, 이거 좋아.',
    '후후, 불어서 줘.',
    '따끈해. 몸이 녹아.',
  ],
  candy: [
    '달다! 또 줘!',
    '{user}, 이거 맨날 줘!',
    '꺄, 달콤해!',
  ],

  // ── CHILD 단계 ───────────────────────────
  bread: [
    '{user}, 빵이 제일 좋아. 고마워.',
    '오물오물. 따뜻해.',
    '이 빵, 누가 구웠어?',
  ],
  soup: [
    '후후 불어서 먹을게, {user}.',
    '뜨끈해. 속이 녹아.',
    '{user}, 같이 먹을래?',
  ],
  fruit: [
    '{user}, 과일 색깔이 예뻐!',
    '달콤해. 한 조각 더 줘.',
    '씨앗 먹어도 돼?',
  ],
  sweet: [
    '으아, 달아! {user} 진짜 좋아!',
    '이거 매일 먹고 싶어.',
    '더 줘! 또 줘!',
  ],

  // ── TEEN 단계 (여기 포인트) ─────────────
  ration: [
    '...이게 오늘 몫이야?',
    '{user}, 또 이거야.',
    '배고프진 않으니까 됐어.',
  ],
  stew: [
    '오랜만이네, 고기.',
    '{user}, 어디서 이런 걸?',
    '뜨끈해. 오늘은 운이 좋아.',
  ],
  premium: [
    '...이건 특별 배급인가?',
    '{user}, 이거 괜찮은 거 맞아?',
    '맛있긴 한데, 왠지 찝찝해.',
  ],
  stolen: [
    '이런 걸 먹어도 되는 건가… 근데 고마워, {user}.',
    '{user}, 이거 훔친 거지? …맛은 있어.',
    '보고 싶지 않은데 입이 먼저 움직여.',
    '{user}, 들키면 어쩌려고. …그래도 고마워.',
    '이런 건 처음 먹어봐. 심장이 빨리 뛰어.',
  ],

  // ── ADULT 단계 ───────────────────────────
  last: [
    '{user}. 이게 마지막 식사라는 걸 아는 것 같아.',
    '천천히 먹을게. 오래 기억하고 싶어.',
    '마지막까지 {user}가 줬구나.',
  ],
  shared: [
    '같이 먹자, {user}. 지금만이라도.',
    '{user}, 네 몫도 남겼어?',
    '나눠 먹으니까 더 달아.',
  ],
  bitter: [
    '쓰다. …이런 맛이 필요할 때가 있어.',
    '{user}, 차 향이 좋다.',
    '쓴맛이 오히려 정신을 맑게 해.',
  ],
  sugar: [
    '{user}, 이런 건 아껴둔 거잖아. 정말 나에게?',
    '달다. 너무 달아서 눈물이 날 것 같아.',
    '이 단맛, 잊지 않을게.',
  ],

  // ── PLAY: EGG ────────────────────────────
  hum: [
    '(알이 콧노래에 맞춰 살짝 움직인다)',
    '(멜로디를 듣는 듯 기울어진다)',
    '(음표가 알 속에 스며든다)',
  ],
  caress: [
    '(쓰다듬는 손길에 알이 기울어진다)',
    '(따뜻한 접촉. 안쪽이 반응한다)',
    '(가만히 손을 맞아들인다)',
  ],
  rock: [
    '(부드러운 흔들림에 편안해진다)',
    '(리듬에 맞춰 숨이 느려진다)',
    '(잠들 듯 조용해진다)',
  ],
  watch: [
    '(아무 말 없이, 시선만 느낀다)',
    '(고요 속에서 두근거린다)',
    '(지켜봐주는 기척을 안다)',
  ],

  // ── PLAY: BABY ───────────────────────────
  peekaboo: [
    '꺄! 또! 또!',
    '{user} 어디 갔어? …아, 여기!',
    '까꿍! 까꿍!',
  ],
  rattle: [
    '딸랑딸랑! 소리 나!',
    '{user}, 더 흔들어줘!',
    '재밌어!',
  ],
  lullaby: [
    '{user}의 노래… 편해.',
    '꾸벅… 졸려.',
    '더 불러줘…',
  ],
  tickle: [
    '꺄하하! 간지러워!',
    '{user}! 그만! …아니, 더!',
    '꺅, 숨 넘어가!',
  ],

  // ── PLAY: CHILD ──────────────────────────
  chase: [
    '{user}, 잡아봐! 못 잡을걸!',
    '헉헉, 다리가 후들거려.',
    '내가 이겼어! 봤지, {user}?',
  ],
  story: [
    '{user}, 그 다음엔?',
    '나도 이야기 해줄게.',
    '이야기 속 주인공이 나였으면 좋겠어.',
  ],
  hide: [
    '{user}, 찾을 수 있어?',
    '여기! 못 찾았지?',
    '한 번 더! 한 번 더!',
  ],
  draw: [
    '{user}, 이거 뭐 그린 줄 알아?',
    '나, {user} 그렸어.',
    '색이 부족해. 빨강 줘.',
  ],

  // ── PLAY: TEEN ───────────────────────────
  talk: [
    '...{user}한테만 말하는 거야.',
    '가끔은 이런 시간이 필요해.',
    '들어줘서 고마워, {user}.',
  ],
  spar: [
    '{user}, 봐주는 거지?',
    '근육이 풀리는 것 같아.',
    '한 판 더!',
  ],
  music: [
    '이 곡, {user}도 좋아해?',
    '음악이 마음을 가라앉혀.',
    '이 소리만 있으면 돼.',
  ],
  stargaze: [
    '별이 저렇게 많았나.',
    '{user}, 저 별 뭐 같아?',
    '고향도 저 어딘가겠지.',
  ],

  // ── PLAY: ADULT ──────────────────────────
  reminisce: [
    '{user}, 그때 기억나?',
    '어릴 땐 몰랐지. 지금은 알아.',
    '시간이 이렇게 흘렀구나.',
  ],
  silence: [
    '...',
    '말 없이도 충분해, {user}.',
    '이 고요가 가장 편해.',
  ],
  dance: [
    '{user}, 발이 맞아!',
    '오래간만에 이렇게 움직여.',
    '잊지 않을게, 이 순간.',
  ],
  promise: [
    '{user}. 나 꼭 기억할게.',
    '이 약속, 가볍지 않아.',
    '증언해줘, 내가 여기 있었다고.',
  ],
};

export function getMenuReaction(menuKey, vars = {}) {
  const pool = MENU_REACTIONS[menuKey];
  if (!pool) return null;
  return pickSpeech(pool, vars);
}

// ────────────────────────────────────────────────────────────
// 캐릭터 터치(클릭) 대사 — 각 단계별 10종씩
// ────────────────────────────────────────────────────────────
const TAP_SPEECHES = {
  EGG: [
    '(알이 움찔한다)',
    '(누군가 건드리는 걸 느낀다)',
    '(두근, 심장이 빨라진다)',
    '(알 표면이 따뜻해진다)',
    '(미세한 진동)',
    '(안에서 꿈틀거린다)',
    '(응답하듯 기울어진다)',
    '(부드러운 움직임)',
    '(무언가 반응한다)',
    '(가만히 숨 쉬고 있다)',
  ],
  BABY: [
    '꺄하하, 간지러워!',
    '{user}! 봤어!',
    '다시! 다시!',
    '으앙? 놀랐잖아.',
    '쭉 안아줘.',
    '냐아...',
    '헤헤, {user} 냄새.',
    '손가락! 손가락 잡을래.',
    '간지러워. 더 해줘.',
    '뽀뽀?',
  ],
  CHILD: [
    '왜? 뭐야 {user}?',
    '심심했는데 잘 왔어!',
    '꺄, 간지러워.',
    '{user}, 나랑 놀자.',
    '뭐 해줄 거야?',
    '에헤헤.',
    '또 왔어? 좋아.',
    '이거 봐봐! 내 손.',
    '장난치는 거지?',
    '오늘 뭐 할까, {user}?',
  ],
  TEEN: [
    '...뭐야.',
    '왜 찌르는데.',
    '{user}, 할 말 있어?',
    '가만히 있을게.',
    '무슨 일 있어?',
    '뭐, 됐어.',
    '...응.',
    '{user}구나. 오래간만.',
    '조용히 있자.',
    '그냥 그런 거야.',
  ],
  ADULT: [
    '...',
    '{user}, 와줬구나.',
    '이 순간을 기억해둘게.',
    '말없이 있어도 돼.',
    '네 손길이 익숙해.',
    '여기 있어줘.',
    '시간이 느리게 가.',
    '{user}, 고마워. 언제나.',
    '가지 마, 아직은.',
    '이렇게 머물자, 잠깐만.',
  ],
};

export function pickTapSpeech(pet, vars = {}) {
  const pool = TAP_SPEECHES[pet.stage] || TAP_SPEECHES.BABY;
  const raw = pool[Math.floor(Math.random() * pool.length)];
  return raw
    .replace(/\{user\}/g, vars.user || '너')
    .replace(/\{name\}/g, vars.name || 'MARS II');
}

// ────────────────────────────────────────────────────────────
// 짧은 캐릭터 말풍선 (ASCII 옆에 잠깐 뜸)
// ────────────────────────────────────────────────────────────
const BUBBLE_SPEECHES = {
  EGG: [
    '…', '…?', '. . .', '*꿈틀*', '*두근*', '*움찔*',
  ],
  BABY: [
    '헤헤', '꺄르르', '음~', '냠냠', '꿀꺽', '좋아!',
    '뽀송해', '포근해', '까꿍', '엄마?', '밝다!', '따뜻해',
    '응?', '우와', '쿨쿨', '냐아', 'ㅇㅇ', '웅',
  ],
  CHILD: [
    '오잉?', '어?', '음...', '궁금해', '뭐야?', '와!',
    '재밌어', '지루해', '배고파', '졸려', '심심해',
    '보고 싶어', '또 봐', '어디 가?', '괜찮아?',
    '여긴 어디?', '꽃이다', '별이네', '바람 안 불어',
  ],
  TEEN: [
    '…', '하...', '흐음', '글쎄', '그래?', '응...',
    '몰라', '아마도', '...진짜?', '이상해', '조용해',
    '생각 중', '창밖엔…', '달 봤어?', '피곤해',
    '돌아갈래', '믿을 수 있어?', '조심해',
  ],
  ADULT: [
    '…', '…', '.....', '조용히', '그래…', '살아있어',
    '기억해', '돌아가자', '꽃잎이…', '그만 됐어',
    '지켜볼게', '그 말…', '너는 알까', '끝인가',
    '눈을 감는다', '여기 있어', '잊지 않을게',
  ],
};

export function pickBubbleSpeech(pet) {
  const pool = BUBBLE_SPEECHES[pet.stage] || BUBBLE_SPEECHES.BABY;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ────────────────────────────────────────────────────────────
// EGG 메시지 회상 — 알 상태에서 크루가 남긴 말을 부화 후 떠올림
// ────────────────────────────────────────────────────────────
export function getEggMessageRecall(pet, vars) {
  const msgs = pet.eggMessages || [];
  if (msgs.length === 0) return null;

  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  const stage = (pet.stage || 'BABY').toLowerCase();

  // 단계별 회상 방식 (알 속에서 들었던 말을 기억함)
  const templates = {
    baby: [
      `알 속에서 들렸던 목소리… "${msg.text}". ${msg.user}{이/가} 그랬던 것 같아.`,
      `${msg.user}? 어디선가 들은 이름. "${msg.text}"라고 했었지?`,
      `움찔, 하고 뭔가 떠올라. ${msg.user}의 목소리가 남아있어.`,
    ],
    child: [
      `"${msg.text}" — ${msg.user}{이/가} 알 속에 있던 나에게 했던 말이야. 기억해.`,
      `${msg.user}, 네가 그때 한 말 기억하고 있어. "${msg.text}"`,
      `알 속에서 들었던 ${msg.user}의 목소리, 아직도 또렷해.`,
      `누군가 ${msg.user}라는 사람이 나한테 말을 걸었지. "${msg.text}"라고.`,
    ],
    teen: [
      `${msg.user}{이/가} 알 속에 있던 나에게 속삭였던 말. "${msg.text}". 잊지 않았어.`,
      `"${msg.text}" — 내가 아직 빛을 보기도 전에 ${msg.user}{이/가} 해준 말.`,
      `알 속의 어둠에 ${msg.user}의 목소리가 섞여 들었어. "${msg.text}"`,
      `세상에 나오기 전부터 나를 부른 사람이 있었어. ${msg.user}.`,
    ],
    adult: [
      `알 속에 있던 나는 이미 ${msg.user}의 목소리를 들었다. "${msg.text}".`,
      `${msg.user}. 네가 가장 먼저 내게 말을 걸어준 사람이었지. "${msg.text}"`,
      `"${msg.text}" — 내 첫 기억은 네 목소리야, ${msg.user}.`,
      `아직 눈도 뜨지 않았을 때, ${msg.user}{이/가} 나에게 한 약속 같은 말. 기억하고 있어.`,
    ],
  };

  const pool = templates[stage];
  if (!pool) return null;
  return pickSpeech(pool, { ...vars, user: msg.user });
}

// ════════════════════════════════════════════════════════════
// 미지의 신호 해독 후 회상 대사
// ════════════════════════════════════════════════════════════

/**
 * 신호별 해금 대사 풀
 * pet.signals[id].completedAt 있을 때만 후보가 됨
 */
const SIGNAL_RECALL_DIALOGUE = {
  // 꿈 조각 — 모든 단계
  dream_voice: [
    '꿈에서 누군가의 목소리를 들었어. 멀리서.',
    '잠들면 누가 나를 부르는 것 같아. 잘 안 들리지만.',
    '그 목소리, 어딘가에서 들어본 것 같아.',
  ],
  dream_dawn: [
    '꿈에서 붉은 새벽을 봤어. 익숙해.',
    '눈을 감으면 붉은 빛이 보여. 어디였을까.',
    '나는 한 번도 가본 적 없는 새벽이 자꾸 떠올라.',
  ],

  // 자장가 (signal-003) — SLEEP 시 노출
  lullaby_sleep: [
    '엄마의 노래가 어렴풋이 기억나. "...돌아오렴..."',
    '잠들기 전 노래 한 곡이 머릿속에 맴돌아.',
    '누가 자장가를 불러줬는데. 가사는 잊었어.',
  ],

  // 원래 이름 (signal-002) — 자기인식 대사
  original_name: [
    '아레스. 그 이름이 왜 이렇게 익숙하지.',
    '내가 한 번도 그렇게 불린 적 없는데, 아레스라는 이름이 자꾸 떠올라.',
    '아레스. 누군가 내 진짜 이름이라고 했어.',
    '나는 아레스였대. 지금도 그런 걸까.',
  ],

  // 명단 의문 (signal-006) — CHILD 이상
  list_question: [
    '왜 우리는 같은 배에 탔을까? {user}는 알아?',
    '24명. 우리가 함께 적힌 이유가 있을 거야.',
    '이 배의 명단에 내 이름도 있다고 들었어. 왜였을까.',
  ],

  // 감시 진실 (signal-009) — TEEN 이상
  watched_truth: [
    '우리가 진짜로 서로를 돌봤던 거야, {user}. 그게 다야.',
    '누가 보고 있었어도, 우리가 한 건 진심이었어.',
    '관찰당하고 있었대. 근데 우리가 한 건 가짜가 아니었지.',
    '{user}. 우리가 함께한 시간은 그들 것이 아니야. 우리 거야.',
  ],

  // 도착지 (signal-010) — TEEN 이상
  separation_aware: [
    '헤어질 수도 있다는 걸 알아. 그래도 지금은 여기 있어.',
    '도착하면 흩어질지도 몰라. {user}. 잊지 말자.',
    '내릴 때 다른 곳으로 갈 수도 있대. 우리.',
  ],

  // 별 보기 (signal-011) — ADULT 야간
  stargazing: [
    '별을 보고 있어. 엄마가 아직 볼 수 있냐고 물었대.',
    '유리창 너머로 별이 보여. 나는 아직 별을 볼 수 있어.',
    '오늘 밤 별이 유난히 또렷해.',
  ],

  // 새 조각 (signal-012) — ADULT
  bird_carving: [
    '손에 쥔 나무 새가 익숙해. 어디서 본 것 같아.',
    '아버지가 깎았다는 새. 정말 나를 닮았을까.',
    '작은 나무 조각 하나. 가장 오래된 것 같아.',
  ],

  // 끊어지는 끈 (signal-013) — ADULT 후반
  ending_recall: [
    '"너는 이 우주에서 사랑받은 아이였다." 그 말이 자꾸 떠올라.',
    '"지금도 그렇다." 마지막 말. 잊지 않을 거야.',
    '어딘가에서 누군가 시작한 일이 있어. 끝나지 않았다고 했어.',
    '살아남은 사람도, 사라진 사람도 있다. 나는 살아있다.',
  ],
};

/**
 * 해독 완료된 신호 기반 회상 대사 가져오기
 * 단계/상황에 맞는 대사 반환
 */
export function getSignalRecall(pet, vars) {
  if (!pet.signals) return null;

  // 완료된 신호들만 후보
  const completed = Object.values(pet.signals).filter(s => s.completedAt && !s.skipped);
  if (completed.length === 0) return null;

  // 각 신호별 해당하는 회상 풀 매핑
  const candidates = [];
  const stage = pet.stage;

  for (const sig of completed) {
    if (sig.id === 'signal-001') candidates.push(...SIGNAL_RECALL_DIALOGUE.dream_voice);
    if (sig.id === 'signal-002' && stage !== 'EGG' && stage !== 'BABY') {
      candidates.push(...SIGNAL_RECALL_DIALOGUE.original_name);
    }
    if (sig.id === 'signal-004') candidates.push(...SIGNAL_RECALL_DIALOGUE.dream_dawn);
    if (sig.id === 'signal-006' && stage !== 'EGG' && stage !== 'BABY') {
      candidates.push(...SIGNAL_RECALL_DIALOGUE.list_question);
    }
    if (sig.id === 'signal-009' && (stage === 'TEEN' || stage === 'ADULT')) {
      candidates.push(...SIGNAL_RECALL_DIALOGUE.watched_truth);
    }
    if (sig.id === 'signal-010' && (stage === 'TEEN' || stage === 'ADULT')) {
      candidates.push(...SIGNAL_RECALL_DIALOGUE.separation_aware);
    }
    if (sig.id === 'signal-011' && stage === 'ADULT') {
      // 야간(밤 18~24, 0~6)에만
      const hour = new Date().getHours();
      if (hour >= 18 || hour < 6) {
        candidates.push(...SIGNAL_RECALL_DIALOGUE.stargazing);
      }
    }
    if (sig.id === 'signal-012' && stage === 'ADULT') {
      candidates.push(...SIGNAL_RECALL_DIALOGUE.bird_carving);
    }
    if (sig.id === 'signal-013' && stage === 'ADULT') {
      candidates.push(...SIGNAL_RECALL_DIALOGUE.ending_recall);
    }
  }

  if (candidates.length === 0) return null;
  return pickSpeech(candidates, vars);
}

/**
 * SLEEP 행동 시 자장가 회상 (signal-003 해독 시)
 */
export function getLullabyRecall(pet, vars) {
  if (!pet.signals?.['signal-003']?.completedAt) return null;
  return pickSpeech(SIGNAL_RECALL_DIALOGUE.lullaby_sleep, vars);
}

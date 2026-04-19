# NILAKURINJI-01 // CRIMSON OPPORTUNITY MARS II

24명의 승무원이 2주간 공동으로 관리하는 텍스트 기반 테디베어 육성 시스템.
세계관 『퀀텀 다이브 RE』의 닐라쿠린지호 승선 기간을 위한 미니 이벤트.

## 현재 상태

**MVP 1단계 완성**: 로컬 테스트 모드로 혼자 플레이 가능.
**다음 단계**: Firebase 연동 (24명 공유)

## 파일 구조

```
shared-pet/
├── index.html        진입점
├── style.css         DOS 터미널 스타일 (#03B352 강조색)
├── config.js         24명 명단 + 게임 설정 ★ 운영자가 수정
├── backend.js        DB 추상화 (localStorage ↔ Firebase)
├── game.js           스탯/진화/성격 순수 로직
├── teddy.js          테디베어 ASCII 아트 (성격에 따라 표정 변화)
├── speeches.js       성장 단계별 대사 데이터베이스
├── app.js            UI 렌더링 + 이벤트 + 관리자 모드
└── README.md         이 파일
```

## 빠른 시작 (로컬 테스트)

### 1. 서버 띄우기

ES Module을 쓰기 때문에 `file://`로 직접 열면 안 되고 HTTP 서버가 필요합니다.

```bash
cd shared-pet
python3 -m http.server 8000
# → http://localhost:8000 접속
```

또는 Node.js 환경:
```bash
npx http-server -p 8000 -c-1
```

### 2. 로그인

등록된 이름 중 하나 입력: 
`마레`, `무진`, `카탸`, `에이`, `줄리안`, `볼크`, `요로나`, `메이`, `바시르`, `파트리시오`, `유진`, `칼`, `소콜로바`, `체이스`, `앤디`, `켈시`, `시마`, `레프`, `딘메이`, `콜튼`, `카나`, `소냐`, `필립`, `토요`

### 3. 관리자

`OBJECT` 입력 시 관리자 모드. RESET/EDIT/REVIVE/BACKUP 등 사용 가능.

### 4. 플레이

- 버튼 클릭 또는 단축키 `[F][P][S][C][T][L]`
- 프롬프트에 직접 명령어 입력 (예: `feed`, `help`, `lore`)
- 관리자 명령: `reset`, `revive`, `kill`, `set hunger 80`, `evolve teen` 등

## 게임 규칙

### 시간
- **총 기간**: 14일 (336시간)
- **스탯 감소**: 실시간 (시간당)
  - hunger -4, happy -3, energy -3, hygiene -2
- **한 번도 안 들어오면**: ~25시간 안에 위험 상태 진입

### 진화 단계
| 단계 | 시간 | 특징 |
|---|---|---|
| EGG | 0-6시간 | 행동 불가, 부화 대기 |
| BABY | 6-48시간 | 순진한 옹알이 |
| CHILD | 2-5일 | 호기심, 다른 크루 이야기 |
| TEEN | 5-10일 | 의심 시작, 세계관 인지 |
| ADULT | 10-14일 | 성격에 따른 깊은 분기 |

### 사망 / 부활
- 스탯 3개 이상이 0 → 사망
- 일반 유저: 최대 **3회** 부활 가능
- 관리자: 무제한 부활 (`/revive`, 카운트 소모 없음)

### 성격 (4축)
- 활발 ↔ 차분 (play vs sleep)
- 탐욕 ↔ 절제 (feed 횟수)
- 사교 ↔ 내향 (play 횟수)
- 성실 ↔ 자유 (train 횟수)

성격이 형성되면 ASCII 아트의 **눈 표정**이 변하고, 
대사의 **깊이/분기**가 달라집니다.

## Firebase 연동 (24명 공유)

### 1. Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. "프로젝트 추가" → 이름 `nilakurinji` (또는 원하는 이름)
3. Google Analytics는 꺼도 됨
4. 프로젝트 생성 후 → **Firestore Database** → **데이터베이스 만들기**
5. **테스트 모드로 시작** 선택
6. 위치: `asia-northeast3 (서울)` 추천

### 2. 웹 앱 등록

1. 프로젝트 개요 → 웹 아이콘 (`</>`) 클릭
2. 앱 닉네임 입력 → **앱 등록**
3. 설정값 복사 (apiKey, authDomain, projectId, ...)

### 3. config.js 수정

```javascript
FIREBASE: {
  apiKey: "AIza...복사한값",
  authDomain: "nilakurinji.firebaseapp.com",
  projectId: "nilakurinji",
  storageBucket: "nilakurinji.appspot.com",
  messagingSenderId: "123456...",
  appId: "1:123456:web:abc..."
},
LOCAL_TEST_MODE: false,   // ← 반드시 false로
```

### 4. Firestore 보안 규칙

Firebase Console → Firestore Database → 규칙 탭:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pet/main {
      allow read, write: if true;
    }
    match /logs/{logId} {
      allow read, create: if true;
      allow update, delete: if false;
    }
  }
}
```

> 2주간 이벤트용이므로 MVP에서는 오픈 규칙 사용. 종료 후 프로젝트 삭제 권장.

### 5. 요금

Firebase **무료(Spark 플랜)** 내에서 100% 처리 가능:
- 일일 무료 한도: 쓰기 20,000 / 읽기 50,000
- 실제 사용량 추정: 쓰기 ~300 / 읽기 ~4,000 (한도의 1~8%)
- 신용카드 등록 불필요

## GitHub Pages 배포

### 1. 저장소 만들기

1. https://github.com/new
2. Repository name: `nilakurinji` (또는 원하는 이름)
3. **Public** 선택
4. Create repository

### 2. 파일 업로드

**웹 브라우저 방법 (간편)**:
- 저장소 페이지 → Add file → Upload files
- 이 폴더의 모든 파일 드래그앤드롭
- Commit changes

**Git 명령어 방법**:
```bash
cd shared-pet
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/{username}/nilakurinji.git
git push -u origin main
```

### 3. Pages 활성화

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` / `/ (root)` → Save
4. 1~2분 후 URL 표시: `https://{username}.github.io/nilakurinji/`

참가자에게 이 URL 공유.

## 운영 팁

### 시작 시점 설정
`config.js`의 `PET_BIRTH`는 **처음 생성 시점**에만 사용됩니다. 
- 이벤트 시작일에 맞추려면: 그 날짜로 설정 후 배포
- 즉시 시작하려면: 기본값(현재 시각) 유지
- 도중에 리셋하려면: 관리자 로그인 → `/reset`

### 스탯 조정
너무 쉽거나 어려우면 `config.js`의 `DECAY_PER_HOUR` 수정:
- 수치 올리면 자주 관리 필요 (긴장감 ↑)
- 수치 내리면 여유로움 (긴장감 ↓)

### 대사 추가
`speeches.js` 수정 후 재배포. 단계별로 `babyIdle`, `childIdle` 같은 
배열에 추가하면 됩니다.

### 긴급 상황 대응
관리자 로그인 후:
- 스탯 회복: `/set hunger 100`
- 강제 진화: `/evolve adult`
- 강제 부활: `/revive`
- 백업: `/backup` (JSON 파일 다운로드)
- 복원: `/restore` (백업 파일 업로드)

### 이벤트 끝난 후
- `/backup` 으로 최종 상태 저장
- Firebase 프로젝트 삭제 (보안)
- GitHub 저장소는 archive 또는 private 전환

## 트러블슈팅

**Q. 로그인이 안 됨**
→ `config.js`의 `MEMBERS` 배열에 이름이 정확히 있는지 확인. 관리자는 `OBJECT`(대소문자 무관).

**Q. 브라우저에서 흰 화면**
→ F12 개발자 도구 → Console 에러 확인. 
ES Module은 `file://` 프로토콜에서 안 돌아감 → HTTP 서버 사용.

**Q. 다른 사람 행동이 안 보임**
→ `LOCAL_TEST_MODE: true` 상태인지 확인. 공유하려면 Firebase 연동 필수.

**Q. Firebase 연결 실패**
→ 콘솔 에러 확인. 주로 API 키 오타 또는 Firestore 규칙에서 write 막혀있음.

**Q. 캐릭터가 죽어버렸는데 복구 불가**
→ 관리자(`OBJECT`) 로그인 → 하단 프롬프트에 `revive` 입력.

## 라이선스

내부 이벤트용. 자유롭게 수정/재배포 가능.

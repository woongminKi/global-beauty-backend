# Global Beauty 프로덕션 배포 가이드

이 문서는 Global Beauty 프로젝트를 프로덕션 환경에 배포하는 방법을 설명합니다.

## 아키텍처 개요

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│     Railway     │────▶│   MongoDB Atlas │
│   (Frontend)    │     │    (Backend)    │     │    (Database)   │
│   Next.js App   │     │   Fastify API   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 사전 준비

### 필요한 계정
- [x] GitHub 계정 (이미 있음)
- [ ] Vercel 계정 (https://vercel.com)
- [ ] Railway 계정 (https://railway.app)
- [x] MongoDB Atlas 계정 (이미 있음)
- [x] Google Cloud Console (이미 설정됨)
- [ ] SendGrid 계정 (선택사항, 이메일 발송용)

---

## 1단계: Railway 백엔드 배포

### 1.1 Railway 가입 및 프로젝트 생성

1. https://railway.app 접속
2. "Login with GitHub" 클릭하여 GitHub 계정으로 로그인
3. 대시보드에서 **"New Project"** 클릭
4. **"Deploy from GitHub repo"** 선택
5. `global-beauty-backend` 저장소 선택
6. Railway가 자동으로 Node.js 프로젝트를 감지합니다

### 1.2 환경 변수 설정

Railway 프로젝트 대시보드에서:
1. 배포된 서비스 클릭
2. **"Variables"** 탭 클릭
3. **"New Variable"** 또는 **"RAW Editor"** 클릭
4. 다음 환경 변수 추가:

```env
# MongoDB (Atlas에서 복사)
MONGODB_URI=mongodb+srv://globalbeauty:YOUR_PASSWORD@global-beauty.xxxxx.mongodb.net/globalbeauty?retryWrites=true&w=majority

# Google OAuth (Google Cloud Console에서 복사)
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET

# 서버 설정
PORT=4000
NODE_ENV=production

# 세션 (랜덤 문자열 생성: openssl rand -hex 32)
SESSION_SECRET=your-random-secret-string-change-this

# 프론트엔드 URL (Vercel 배포 후 업데이트)
FRONTEND_URL=https://your-app.vercel.app

# SendGrid (선택사항)
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@globalbeauty.com
FROM_NAME=Global Beauty

# Ops 관리자 시크릿
OPS_ADMIN_SECRET=your-ops-admin-secret
```

### 1.3 배포 확인

1. **"Deployments"** 탭에서 배포 상태 확인
2. 배포 완료 후 **"Settings"** → **"Networking"** → **"Generate Domain"** 클릭
3. 생성된 URL 복사 (예: `https://global-beauty-backend-production.up.railway.app`)
4. 브라우저에서 `https://YOUR_URL/health` 접속하여 `{"status":"ok"}` 확인

### 1.4 Railway 요금

- **무료 티어**: 월 $5 크레딧 제공 (약 500시간 실행 가능)
- 소규모 프로젝트는 무료로 운영 가능
- 사용량 초과 시 자동으로 중지됨 (요금 청구 없음)

---

## 2단계: Vercel 프론트엔드 배포

### 2.1 Vercel 가입 및 프로젝트 생성

1. https://vercel.com 접속
2. "Sign Up with GitHub" 클릭
3. 대시보드에서 **"Add New..."** → **"Project"** 클릭
4. **"Import Git Repository"**에서 `global-beauty-frontend` 선택
5. **"Import"** 클릭

### 2.2 프로젝트 설정

Import 화면에서:

1. **Framework Preset**: `Next.js` (자동 감지됨)
2. **Root Directory**: `.` (기본값)
3. **Build Command**: `npm run build` (기본값)
4. **Output Directory**: (비워둠, Next.js 자동 처리)

### 2.3 환경 변수 설정

**"Environment Variables"** 섹션에서 추가:

```env
NEXT_PUBLIC_API_URL=https://YOUR_RAILWAY_URL
```

예시:
```
NEXT_PUBLIC_API_URL=https://global-beauty-backend-production.up.railway.app
```

### 2.4 배포

1. **"Deploy"** 버튼 클릭
2. 빌드 로그 확인 (약 1-2분 소요)
3. 배포 완료 후 제공된 URL 확인 (예: `https://global-beauty-frontend.vercel.app`)

### 2.5 Vercel 요금

- **Hobby (무료)**: 개인 프로젝트용, 충분한 무료 사용량
- 상업용은 Pro 플랜 필요 ($20/월)

---

## 3단계: 배포 후 설정

### 3.1 Railway 환경 변수 업데이트

Vercel 배포 완료 후:
1. Railway 대시보드 → Variables
2. `FRONTEND_URL`을 실제 Vercel URL로 업데이트:
```
FRONTEND_URL=https://global-beauty-frontend.vercel.app
```
3. 자동으로 재배포됨

### 3.2 Google OAuth 리다이렉트 URI 추가

Google Cloud Console에서:
1. https://console.cloud.google.com → API 및 서비스 → 사용자 인증 정보
2. OAuth 2.0 클라이언트 ID 클릭
3. **"승인된 리디렉션 URI"**에 추가:
```
https://YOUR_RAILWAY_URL/v1/auth/google/callback
```
4. **"저장"** 클릭

### 3.3 MongoDB Atlas IP 허용

MongoDB Atlas에서:
1. Network Access → Add IP Address
2. **"Allow Access from Anywhere"** (0.0.0.0/0) 선택
   - 또는 Railway의 고정 IP 사용 (Pro 플랜)
3. **"Confirm"** 클릭

---

## 4단계: 테스트

### 4.1 기본 테스트

1. **프론트엔드 접속**: `https://your-app.vercel.app`
2. **클리닉 검색**: 검색 페이지에서 클리닉 목록 확인
3. **Google 로그인**: 로그인 버튼 클릭하여 OAuth 테스트
4. **예약 요청**: 클리닉 선택 → 예약 요청 제출

### 4.2 Ops 대시보드 테스트

1. `https://your-app.vercel.app/en/ops/login` 접속
2. 로그인: `admin@globalbeauty.com` / `admin123!`
3. 예약 목록 및 상태 변경 테스트

### 4.3 API 직접 테스트

```bash
# 헬스 체크
curl https://YOUR_RAILWAY_URL/health

# 클리닉 목록
curl https://YOUR_RAILWAY_URL/v1/clinics
```

---

## 5단계: 커스텀 도메인 설정 (선택사항)

### Vercel 커스텀 도메인

1. Vercel 프로젝트 → Settings → Domains
2. 도메인 입력 (예: `globalbeauty.com`)
3. DNS 설정 안내에 따라 도메인 등록기관에서 설정:
   - A 레코드: `76.76.19.19`
   - 또는 CNAME: `cname.vercel-dns.com`

### Railway 커스텀 도메인

1. Railway 프로젝트 → Settings → Networking → Custom Domain
2. 도메인 입력 (예: `api.globalbeauty.com`)
3. DNS 설정: CNAME을 Railway 제공 값으로 설정

---

## 트러블슈팅

### 빌드 실패

**증상**: Vercel/Railway 빌드 중 에러
**해결**:
1. 로컬에서 `npm run build` 실행하여 에러 확인
2. Node.js 버전 확인 (22+ 필요)
3. 환경 변수 누락 확인

### CORS 에러

**증상**: 브라우저에서 API 호출 시 CORS 에러
**해결**:
1. Railway의 `FRONTEND_URL` 환경 변수 확인
2. 정확한 Vercel URL인지 확인 (끝에 `/` 없이)

### Google 로그인 실패

**증상**: OAuth 리다이렉트 에러
**해결**:
1. Google Cloud Console에서 리다이렉트 URI 확인
2. Railway URL이 정확히 등록되어 있는지 확인
3. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 환경 변수 확인

### MongoDB 연결 실패

**증상**: 서버 시작 시 MongoDB 연결 에러
**해결**:
1. MongoDB Atlas Network Access에서 IP 허용 확인
2. `MONGODB_URI` 환경 변수의 비밀번호 확인
3. 특수문자가 있으면 URL 인코딩 필요

### 이메일 발송 실패

**증상**: 예약 시 이메일이 안 옴
**해결**:
1. `SENDGRID_API_KEY` 환경 변수 확인
2. SendGrid 대시보드에서 API Key 활성 상태 확인
3. Sender 인증 완료 여부 확인

---

## 배포 체크리스트

### Railway (백엔드)
- [ ] GitHub 저장소 연결
- [ ] 환경 변수 설정 (9개)
- [ ] 도메인 생성
- [ ] 헬스 체크 확인

### Vercel (프론트엔드)
- [ ] GitHub 저장소 연결
- [ ] 환경 변수 설정 (1개)
- [ ] 배포 완료 확인

### Google Cloud Console
- [ ] 프로덕션 리다이렉트 URI 추가

### MongoDB Atlas
- [ ] IP 허용 설정

### 테스트
- [ ] 클리닉 검색 동작
- [ ] Google 로그인 동작
- [ ] 예약 요청 동작
- [ ] Ops 로그인 동작

---

## 유용한 명령어

```bash
# 로컬 빌드 테스트
cd frontend && npm run build
cd backend && npm run build

# 환경 변수 확인 (로컬)
cat backend/.env

# 시크릿 키 생성
openssl rand -hex 32

# Railway CLI (선택사항)
npm install -g @railway/cli
railway login
railway logs
```

---

## 참고 링크

- [Vercel 공식 문서](https://vercel.com/docs)
- [Railway 공식 문서](https://docs.railway.app)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [MongoDB Atlas 문서](https://docs.atlas.mongodb.com)

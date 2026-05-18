# 온스코어링 (OnScoring)

볼링원(Bowling One) 스코어링 시스템 사용자 매뉴얼 기반 볼링장 관리 웹 애플리케이션입니다.

## 기능

- **볼링장 관리**: 영업일 설정, 16레인 관리, 락커 관리
- **마감 관리**: 요금표, 일일 마감, 통계 차트
- **대회 관리**: 대회 등록·레인배정·점수집계
- **회원 관리**: 회원/클럽 CRUD, 통계
- **환경설정**: 기본설정, 공지, 스킨, 라이선스

## Supabase 설정 (필수)

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. **SQL Editor**에서 `server/supabase/schema.sql` 전체 실행
3. `server/.env` 파일 생성 (`server/.env.example` 참고):

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service_role (비밀키, 클라이언트에 노출 금지)
PORT=3001
```

4. API 서버 시작 시 레인·요금·설정 등 초기 데이터가 없으면 자동 시드됩니다.

## 실행

```bash
# 루트에서 의존성 설치
npm install
cd server && npm install
cd ../client && npm install
cd ..

# server/.env 설정 후 개발 서버 (API :3001, UI :5173)
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

## 기술 스택

- Frontend: React 19, TypeScript, Vite, React Router, Recharts
- Backend: Express, Supabase (PostgreSQL)

## Vercel 배포 (프론트엔드만)

저장소 루트의 `vercel.json`이 `client` 폴더를 빌드합니다.

1. [Vercel](https://vercel.com)에서 GitHub 저장소 `bowl` 연결
2. **Root Directory**는 비워 두거나 `.` (루트) — `vercel.json`이 경로를 지정함
3. 환경 변수 (백엔드를 다른 곳에 띄운 경우): `VITE_API_URL` = `https://your-api.example.com/api`

Express API는 Render, Railway, Vercel Serverless 등에 `server`를 배포하고, 환경 변수에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 설정하세요. 프론트(Vercel)에는 `VITE_API_URL`로 API 주소를 연결합니다.

## 참고

실제 핀셋터·오버헤드 모니터 연동은 하드웨어 API가 필요합니다. 본 프로젝트는 매뉴얼 UI/업무 흐름을 구현한 관리자 데모입니다.

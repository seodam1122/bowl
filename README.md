# 온스코어링 (OnScoring)

볼링원(Bowling One) 스코어링 시스템 — **Next.js 15** + **Supabase**.

프론트엔드가 Supabase에 직접 연결됩니다. 별도 Express API 없이 **Vercel + Supabase**만으로 배포할 수 있습니다.

## 기능

- 볼링장 관리 (영업/레인/락커)
- 마감 관리 (요금/마감/통계)
- 대회·회원·환경설정

## Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 `server/supabase/schema.sql` 전체 실행
3. API 키: **Project URL**, **anon public**

## 로컬 실행

```bash
cd client
npm install
```

`client/.env.local` 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

http://localhost:3000

## Vercel 배포

1. Vercel 프로젝트 → **Settings** → **Build and Deployment** → 아래로 스크롤 → **Root Directory** → `client` 입력 → **Save**  
   (Settings 상단 검색창에 `Root Directory` 입력해도 이동됩니다. **General** 탭에는 없습니다.)
2. **Environment Variables** — **Production**과 **Preview** 모두 체크:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon** `public` 키 (JWT `eyJ...` 형태) |

`SUPABASE_SERVICE_ROLE_KEY`는 프론트 배포에 **필요 없습니다** (서버 `server/` 전용). anon 키에 넣지 마세요.

3. 변수 저장 후 **Deployments → Redeploy** (환경 변수는 재배포해야 반영됩니다)

Next.js 앱은 `client/package.json`에 있습니다. Root Directory를 비워 두면 `No Next.js version detected` 오류가 납니다.

## 기술 스택

- **Next.js 15** (App Router)
- React 19, TypeScript
- Supabase, Recharts

## (선택) Express API

`server/` — 이전 백엔드. `npm run dev:legacy-api` (루트)

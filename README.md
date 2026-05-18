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

1. Vercel 프로젝트 → **Settings** → **General** → **Root Directory** → `client` 입력 후 저장
2. **Environment Variables** (Production / Preview):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public |

3. **Redeploy** (환경 변수·Root Directory 변경 후 필수)

Next.js 앱은 `client/package.json`에 있습니다. Root Directory를 비워 두면 `No Next.js version detected` 오류가 납니다.

## 기술 스택

- **Next.js 15** (App Router)
- React 19, TypeScript
- Supabase, Recharts

## (선택) Express API

`server/` — 이전 백엔드. `npm run dev:legacy-api` (루트)

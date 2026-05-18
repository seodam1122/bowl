import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api, ClosingStats } from '../api';

export default function ClosingStatsPage() {
  const [stats, setStats] = useState<ClosingStats | null>(null);
  useEffect(() => { api.getClosingStats().then(setStats); }, []);

  const monthly = stats?.monthly || [];
  const byCat = stats?.byCategory || [];

  return (
    <>
      <h1 className="page-title">마감 관리 - 마감통계</h1>
      <p className="page-desc">최근 마감자료 통계를 그래프로 표시합니다</p>

      <div className="stats-grid">
        <div className="card chart-card">
          <h3>최근 6개월간 마감금액</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()}원`, '매출금액']} />
              <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#93c5fd" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart-card">
          <h3>고객종류별 마감금액</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCat}>
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()}원`, '매출금액']} />
              <Bar dataKey="amount" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart-card">
          <h3>고객종류별 게임 수</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCat}>
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v}게임`, '게임 수']} />
              <Bar dataKey="games" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
        .chart-card h3 { font-size: 14px; margin-bottom: 12px; color: var(--gray-600); }
      `}</style>
    </>
  );
}

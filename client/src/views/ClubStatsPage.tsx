'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api, ClubStat } from '@/lib/api';

export default function ClubStatsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [list, setList] = useState<ClubStat[]>([]);
  useEffect(() => { api.getClubStats(month).then(setList); }, [month]);

  return (
    <>
      <h1 className="page-title">회원 관리 - 클럽통계</h1>
      <p className="page-desc">월별 클럽별 게임 통계</p>
      <div className="toolbar card" style={{ padding: 16 }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <table>
        <thead><tr><th>클럽명</th><th>게임수</th><th>게임비</th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.club_name}><td>{r.club_name}</td><td>{r.game_count}</td><td>{r.game_fee?.toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>게임 수 그래프</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={list}>
            <XAxis dataKey="club_name" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="game_count" stroke="#22c55e" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

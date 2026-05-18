import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api, MemberStat } from '../api';

export default function MemberStatsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [list, setList] = useState<MemberStat[]>([]);

  useEffect(() => { api.getMemberStats(month).then(setList); }, [month]);

  const top15 = list.slice(0, 15);

  return (
    <>
      <h1 className="page-title">회원 관리 - 회원통계</h1>
      <p className="page-desc">월별 회원 게임 통계 및 상위 15명 그래프</p>

      <div className="toolbar card" style={{ padding: 16 }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <table>
        <thead><tr><th>성명</th><th>게임수</th><th>게임비</th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.name}><td>{r.name}</td><td>{r.game_count}</td><td>{r.game_fee?.toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>상위 15명 게임 수</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={top15}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="game_count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

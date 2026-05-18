'use client';

import { useEffect, useState } from 'react';
import { api, Tournament, TournamentParticipant } from '@/lib/api';

export default function TournamentScoresPage() {
  const [list, setList] = useState<Tournament[]>([]);
  const [selId, setSelId] = useState<number | null>(null);
  const [parts, setParts] = useState<TournamentParticipant[]>([]);

  useEffect(() => { api.getTournaments().then(setList); }, []);
  useEffect(() => {
    if (selId) api.getParticipants(selId).then(setParts);
  }, [selId]);

  const exportCsv = () => {
    const header = '순위,성명,팀명,핸디,합계\n';
    const rows = parts.map((p, i) => {
      const sum = (p.scores || []).reduce((a, b) => a + b, 0);
      return `${i + 1},${p.name},${p.team_name},${p.handicap},${sum}`;
    });
    const blob = new Blob(['\uFEFF' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '경기결과.csv';
    a.click();
  };

  return (
    <>
      <h1 className="page-title">대회 관리 - 점수집계</h1>
      <p className="page-desc">경기결과 집계 및 다운로드 (Excel/CSV)</p>

      <div className="toolbar card" style={{ padding: 16 }}>
        <select value={selId ?? ''} onChange={(e) => setSelId(e.target.value ? +e.target.value : null)}>
          <option value="">대회 선택</option>
          {list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="button" className="btn-primary" onClick={exportCsv} disabled={!selId}>다운로드</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>순위</th><th>성명</th><th>팀명</th><th>핸디</th>
            <th>1게임</th><th>2게임</th><th>3게임</th><th>4게임</th><th>합계</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p, i) => {
            const scores = p.scores?.length ? p.scores : [0, 0, 0, 0];
            const sum = scores.reduce((a, b) => a + b, 0);
            return (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{p.name}</td>
                <td>{p.team_name}</td>
                <td>{p.handicap}</td>
                {scores.slice(0, 4).map((s, j) => <td key={j}>{s}</td>)}
                <td><strong>{sum + p.handicap}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

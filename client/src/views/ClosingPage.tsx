'use client';

import { useEffect, useState } from 'react';
import { api, ClosingData } from '@/lib/api';

export default function ClosingPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ClosingData | null>(null);

  const load = () => api.getClosing(date).then(setData);
  useEffect(() => { load(); }, [date]);

  const closeDay = async () => {
    if (!confirm('마감하시겠습니까? 마감 후 기준일이 다음 날로 넘어갑니다.')) return;
    const r = await api.postClosing(date) as { nextDate?: string };
    alert('마감 완료');
    if (r.nextDate) setDate(r.nextDate);
    load();
  };

  return (
    <>
      <h1 className="page-title">마감 관리 - 마감관리</h1>
      <p className="page-desc">일일 마감합계·시간별 이용·상세내역 조회 및 마감 처리</p>

      <div className="toolbar card" style={{ padding: 16 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" className="btn-secondary" onClick={load}>조회</button>
        <button type="button" className="btn-primary" onClick={closeDay} disabled={!!data?.closed}>마감하기</button>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>일일마감출력</button>
        {data?.closed && <span style={{ color: 'var(--success)', marginLeft: 8 }}>마감완료 {data.closed.closed_at}</span>}
      </div>

      <h3 style={{ margin: '16px 0 8px' }}>마감합계</h3>
      <table>
        <thead>
          <tr><th>구분</th><th>수량</th><th>현금</th><th>카드</th><th>합계</th></tr>
        </thead>
        <tbody>
          {(data?.summary || []).map((s) => (
            <tr key={s.category}>
              <td>{s.category}</td>
              <td>{s.qty}</td>
              <td>{(s.cash || 0).toLocaleString()}</td>
              <td>{(s.card || 0).toLocaleString()}</td>
              <td>{(s.total_fee || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ margin: '16px 0 8px' }}>상세내역</h3>
      <table>
        <thead>
          <tr>
            <th>레인</th><th>이름</th><th>구분</th><th>게임</th><th>대화</th><th>요금</th>
          </tr>
        </thead>
        <tbody>
          {(data?.settlements || []).map((s) => (
            <tr key={s.id}>
              <td>{s.lane_id}</td>
              <td>{s.player_name}</td>
              <td>{s.category}</td>
              <td>{s.game_count}</td>
              <td>{s.shoe_rental ? 'Y' : 'N'}</td>
              <td>{s.fee?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

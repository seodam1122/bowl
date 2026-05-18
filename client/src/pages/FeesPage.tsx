import { useEffect, useState } from 'react';
import { api, FeeSetting } from '../api';

const PERIODS = ['morning', 'afternoon', 'night'] as const;
const DAYS = ['weekday', 'weekend', 'special'] as const;
const DAY_LABELS: Record<string, string> = { weekday: '평일', weekend: '주말', special: '특일' };
const PER_LABELS: Record<string, string> = { morning: '오전', afternoon: '오후', night: '야간' };

export default function FeesPage() {
  const [fees, setFees] = useState<FeeSetting[]>([]);
  const [shoeFee, setShoeFee] = useState(1000);

  const load = () => api.getFees().then((rows) => {
    setFees(rows);
    if (rows[0]?.shoe_fee) setShoeFee(rows[0].shoe_fee!);
  });
  useEffect(() => { load(); }, []);

  const updatePrice = (idx: number, day: string, per: string, val: number) => {
    setFees((prev) => {
      const next = [...prev];
      const p = { ...next[idx].pricing };
      (p as Record<string, Record<string, number>>)[day][per] = val;
      next[idx] = { ...next[idx], pricing: p };
      return next;
    });
  };

  const addRow = () => {
    setFees([
      ...fees,
      {
        name: '',
        payment_type: '후불',
        game_count: 0,
        pricing: {
          weekday: { morning: 5000, afternoon: 6000, night: 7000 },
          weekend: { morning: 6000, afternoon: 7000, night: 8000 },
          special: { morning: 7000, afternoon: 8000, night: 9000 },
        },
      },
    ]);
  };

  const save = async () => {
    await api.putFees({ fees, shoe_fee: shoeFee });
    alert('저장되었습니다.');
    load();
  };

  return (
    <>
      <h1 className="page-title">마감 관리 - 요금관리</h1>
      <p className="page-desc">요금명·결제방법·평일/주말/특일·시간대별 게임 요금 및 대화료 설정</p>

      <div className="card toolbar">
        <label>대화료(원)</label>
        <input type="number" value={shoeFee} onChange={(e) => setShoeFee(+e.target.value)} style={{ width: 120 }} />
        <button type="button" className="btn-secondary" onClick={addRow}>추가</button>
        <button type="button" className="btn-primary" onClick={save}>저장</button>
      </div>

      <div className="fee-table-wrap card" style={{ overflowX: 'auto' }}>
        <table className="fee-table">
          <thead>
            <tr>
              <th rowSpan={2}>요금명</th>
              <th rowSpan={2}>결제</th>
              <th rowSpan={2}>게임수</th>
              {DAYS.map((d) => (
                <th key={d} colSpan={3}>{DAY_LABELS[d]}</th>
              ))}
            </tr>
            <tr>
              {DAYS.flatMap((d) => PERIODS.map((p) => <th key={`${d}-${p}`}>{PER_LABELS[p]}</th>))}
            </tr>
          </thead>
          <tbody>
            {fees.map((f, i) => (
              <tr key={f.id ?? `new-${i}`}>
                <td><input value={f.name} onChange={(e) => { const n = [...fees]; n[i] = { ...n[i], name: e.target.value }; setFees(n); }} /></td>
                <td>
                  <select value={f.payment_type} onChange={(e) => { const n = [...fees]; n[i] = { ...n[i], payment_type: e.target.value }; setFees(n); }}>
                    <option value="선불">선불</option>
                    <option value="후불">후불</option>
                  </select>
                </td>
                <td><input type="number" style={{ width: 50 }} value={f.game_count} onChange={(e) => { const n = [...fees]; n[i] = { ...n[i], game_count: +e.target.value }; setFees(n); }} /></td>
                {DAYS.flatMap((d) =>
                  PERIODS.map((p) => (
                    <td key={`${d}-${p}`}>
                      <input
                        type="number"
                        style={{ width: 64 }}
                        value={f.pricing[d as keyof typeof f.pricing][p]}
                        onChange={(e) => updatePrice(i, d, p, +e.target.value)}
                      />
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

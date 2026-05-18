import { useEffect, useState } from 'react';
import { api } from '../api';

export default function NoticesPage() {
  const [items, setItems] = useState<string[]>(['']);

  useEffect(() => {
    api.getNotices().then((rows) => setItems(rows.length ? rows.map((r) => r.content) : ['']));
  }, []);

  const save = async () => {
    await api.putNotices(items.filter((x) => x.trim()));
    alert('모니터에 반영되었습니다.');
  };

  return (
    <>
      <h1 className="page-title">환경설정 - 공지관리</h1>
      <p className="page-desc">오버헤드 모니터 하단에 표시할 공지 문구</p>
      <div className="card">
        <div className="toolbar">
          <button type="button" className="btn-secondary" onClick={() => setItems([...items, ''])}>추가</button>
          <button type="button" className="btn-primary" onClick={save}>저장</button>
        </div>
        {items.map((text, i) => (
          <div key={i} className="toolbar" style={{ marginTop: 8 }}>
            <input style={{ flex: 1 }} value={text} placeholder="공지 문구" onChange={(e) => {
              const n = [...items]; n[i] = e.target.value; setItems(n);
            }} />
            <button type="button" className="btn-danger" onClick={() => setItems(items.filter((_, j) => j !== i))}>삭제</button>
          </div>
        ))}
      </div>
    </>
  );
}

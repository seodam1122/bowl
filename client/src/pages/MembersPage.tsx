import { useEffect, useState } from 'react';
import { api, Member, Club } from '../api';
import Modal from '../components/Modal';

export default function MembersPage() {
  const [list, setList] = useState<Member[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<Partial<Member> | null>(null);

  const load = () => api.getMembers(q).then(setList);
  useEffect(() => { load(); api.getClubs().then(setClubs); }, []);

  const save = async () => {
    if (!modal?.name) return;
    if (modal.id) await api.updateMember(modal.id, modal);
    else await api.createMember(modal);
    setModal(null);
    load();
  };

  const del = async () => {
    if (!modal?.id || !confirm('삭제?')) return;
    await api.deleteMember(modal.id);
    setModal(null);
    load();
  };

  return (
    <>
      <h1 className="page-title">회원 관리 - 회원관리</h1>
      <p className="page-desc">회원 등록·수정. 레인관리 플레이어 입력 시 자동완성에 연동됩니다.</p>

      <div className="toolbar card" style={{ padding: 16 }}>
        <input placeholder="이름/클럽 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn-secondary" onClick={load}>검색</button>
        <button type="button" className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModal({ name: '', category: '일반', contact: '', remarks: '' })}>등록</button>
      </div>

      <table>
        <thead><tr><th>번호</th><th>성명</th><th>구분</th><th>연락처</th><th>클럽</th><th>등록일</th></tr></thead>
        <tbody>
          {list.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td><button type="button" className="link-btn" onClick={() => setModal(m)}>{m.name}</button></td>
              <td>{m.category}</td>
              <td>{m.contact}</td>
              <td>{m.club_name}</td>
              <td>{m.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <Modal title={modal.id ? '회원상세' : '회원등록'} onClose={() => setModal(null)}
          actions={<><button type="button" className="btn-danger" onClick={del}>삭제</button><button type="button" className="btn-primary" onClick={save}>저장</button></>}>
          <div className="form-row"><label>회원명</label><input value={modal.name || ''} onChange={(e) => setModal({ ...modal, name: e.target.value })} /></div>
          <div className="form-row"><label>구분</label><input value={modal.category || ''} onChange={(e) => setModal({ ...modal, category: e.target.value })} /></div>
          <div className="form-row"><label>연락처</label><input value={modal.contact || ''} onChange={(e) => setModal({ ...modal, contact: e.target.value })} /></div>
          <div className="form-row"><label>클럽</label>
            <select value={modal.club_id ?? ''} onChange={(e) => setModal({ ...modal, club_id: e.target.value ? +e.target.value : null })}>
              <option value="">없음</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-row"><label>비고</label><textarea rows={3} value={modal.remarks || ''} onChange={(e) => setModal({ ...modal, remarks: e.target.value })} /></div>
        </Modal>
      )}
      <style>{`.link-btn{background:none;color:var(--lane-active);padding:0}`}</style>
    </>
  );
}

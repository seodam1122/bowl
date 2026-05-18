import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

const nav = [
  {
    label: '볼링장 관리',
    items: [
      { to: '/bowling/business', label: '영업관리' },
      { to: '/bowling/lanes', label: '레인관리' },
      { to: '/bowling/lockers', label: '락커관리' },
    ],
  },
  {
    label: '마감 관리',
    items: [
      { to: '/closing/fees', label: '요금관리' },
      { to: '/closing/daily', label: '마감관리' },
      { to: '/closing/stats', label: '마감통계' },
    ],
  },
  {
    label: '대회 관리',
    items: [
      { to: '/tournaments/manage', label: '대회관리' },
      { to: '/tournaments/scores', label: '점수집계' },
    ],
  },
  {
    label: '회원 관리',
    items: [
      { to: '/members/list', label: '회원관리' },
      { to: '/members/stats', label: '회원통계' },
      { to: '/members/clubs', label: '클럽관리' },
      { to: '/members/club-stats', label: '클럽통계' },
    ],
  },
  {
    label: '환경설정',
    items: [
      { to: '/settings/basic', label: '기본설정' },
      { to: '/settings/notices', label: '공지관리' },
      { to: '/settings/skins', label: '스킨관리' },
      { to: '/settings/license', label: '라이선스' },
    ],
  },
];

export default function Layout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">●</span>
          <div>
            <strong>볼링원</strong>
            <small>온스코어링</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">www.bowlingone.com</div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

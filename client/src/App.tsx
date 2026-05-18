import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import BusinessPage from './pages/BusinessPage';
import LanesPage from './pages/LanesPage';
import LockersPage from './pages/LockersPage';
import FeesPage from './pages/FeesPage';
import ClosingPage from './pages/ClosingPage';
import ClosingStatsPage from './pages/ClosingStatsPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentScoresPage from './pages/TournamentScoresPage';
import MembersPage from './pages/MembersPage';
import MemberStatsPage from './pages/MemberStatsPage';
import ClubsPage from './pages/ClubsPage';
import ClubStatsPage from './pages/ClubStatsPage';
import SettingsPage from './pages/SettingsPage';
import NoticesPage from './pages/NoticesPage';
import SkinsPage from './pages/SkinsPage';
import LicensePage from './pages/LicensePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/bowling/lanes" replace />} />
        <Route path="bowling/business" element={<BusinessPage />} />
        <Route path="bowling/lanes" element={<LanesPage />} />
        <Route path="bowling/lockers" element={<LockersPage />} />
        <Route path="closing/fees" element={<FeesPage />} />
        <Route path="closing/daily" element={<ClosingPage />} />
        <Route path="closing/stats" element={<ClosingStatsPage />} />
        <Route path="tournaments/manage" element={<TournamentsPage />} />
        <Route path="tournaments/scores" element={<TournamentScoresPage />} />
        <Route path="members/list" element={<MembersPage />} />
        <Route path="members/stats" element={<MemberStatsPage />} />
        <Route path="members/clubs" element={<ClubsPage />} />
        <Route path="members/club-stats" element={<ClubStatsPage />} />
        <Route path="settings/basic" element={<SettingsPage />} />
        <Route path="settings/notices" element={<NoticesPage />} />
        <Route path="settings/skins" element={<SkinsPage />} />
        <Route path="settings/license" element={<LicensePage />} />
      </Route>
    </Routes>
  );
}

import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import RegisterPage from './RegisterPage';
import LoginPage from './LoginPage';
import NotFound404 from './components/NotFound404';
import ProtectedRoute from './components/ProtectedRoute';
import StudentInvitationPage from './StudentInvitationPage';
import ParentInvitationPage from './ParentInvitationPage';
import Dashboard from './components/Dashboard';
import SubjectsPage from './components/SubjectsPage';
import SessionPlanningPage from './components/SessionPlanningPage';
import PomodoroTimer from './components/PomodoroTimer';
import SessionCompletePage from './components/SessionCompletePage';
import StatisticsPage from './components/StatisticsPage';
import ProfilePage from './components/ProfilePage';
import AchievementsPage from './components/AchievementsPage';
import AIPlannerPage from './components/AIPlannerPage';
import ParentCabinetPage from './components/ParentCabinetPage';
import AdminPanelPage from './components/AdminPanelPage';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import LandingPage from './components/LandingPage';
import PawPrints from './components/ui/PawPrints';


// при переходе на другую страницу листаем наверх
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <PawPrints />
      <Routes>
        <Route path="/student-invitation" element={<StudentInvitationPage />} />
        <Route path="/parent-invitation" element={<ParentInvitationPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/parent" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['parent']}><ParentCabinetPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']}><AdminPanelPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><Dashboard /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><SubjectsPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><SessionPlanningPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/pomodoro" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><PomodoroTimer /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/session-complete" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><SessionCompletePage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/statistics" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><StatisticsPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><AchievementsPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/ai-planner" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><AIPlannerPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    </Router>
  );
}

export default App;
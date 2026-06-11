import { Route, Routes } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import PremiumShell from './components/Layout/PremiumShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ExpenseDetail from './pages/ExpenseDetail.jsx';
import Friends from './pages/Friends.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import Groups from './pages/Groups.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import Signup from './pages/Signup.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';




function AppShell() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify/:token" element={<VerifyEmail />} />
        
        {/* Protected Routes inside PremiumShell */}
        <Route element={<ProtectedRoute><PremiumShell><Routes>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:id" element={<GroupDetail />} />
          <Route path="groups/:groupId/expenses/:expenseId" element={<ExpenseDetail />} />
          <Route path="friends" element={<Friends />} />
          <Route path="profile" element={<Profile />} />
        </Routes></PremiumShell></ProtectedRoute>} path="/*" />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <AppShell />
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

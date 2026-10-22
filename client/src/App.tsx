import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { NotificationProvider, useNotifications } from './context/NotificationContext.js';
import { Navbar } from './components/common/Navbar.js';
import { Footer } from './components/common/Footer.js';

import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { CitizenDashboard } from './pages/CitizenDashboard.js';
import { OfficerDashboard } from './pages/OfficerDashboard.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { AboutHelpPage } from './pages/AboutHelpPage.js';
import { ReceiptView } from './pages/ReceiptView.js';
import { DemandNoticeView } from './pages/DemandNoticeView.js';
import { Bell, X } from 'lucide-react';

// Role Guard Component
const ProtectedRoute: React.FC<{
  allowedRoles: string[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-500">Checking municipal authorization...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If wrong role, navigate to their own dashboard
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'WARD_OFFICER') return <Navigate to="/officer" replace />;
    return <Navigate to="/citizen" replace />;
  }

  return <>{children}</>;
};

// Global Live Toast Component
const GlobalLiveToast: React.FC = () => {
  const { latestToast, dismissToast } = useNotifications();

  if (!latestToast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-start gap-3 animate-in slide-in-from-bottom-5">
      <div className="p-2 bg-blue-600 rounded-xl shrink-0 mt-0.5">
        <Bell className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 text-xs">
        <p className="font-bold text-white truncate">{latestToast.title}</p>
        <p className="text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">{latestToast.message}</p>
      </div>
      <button onClick={dismissToast} className="text-slate-400 hover:text-white p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
              <Navbar />

              <main className="flex-1">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/about" element={<AboutHelpPage />} />
                  <Route path="/receipt/:receiptNumber" element={<ReceiptView />} />
                  <Route path="/notice/:noticeNumber" element={<DemandNoticeView />} />

                  {/* Citizen Role Protected */}
                  <Route
                    path="/citizen"
                    element={
                      <ProtectedRoute allowedRoles={['CITIZEN']}>
                        <CitizenDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Ward Officer Role Protected */}
                  <Route
                    path="/officer"
                    element={
                      <ProtectedRoute allowedRoles={['WARD_OFFICER']}>
                        <OfficerDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Role Protected */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              <Footer />
              <GlobalLiveToast />
            </div>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

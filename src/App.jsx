import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Reports from '@/pages/Reports';
import Budget from '@/pages/Budget';
import PhoneRegistration from '@/pages/PhoneRegistration';
import Assistant from '@/pages/Assistant';
import IVRSetup from '@/pages/IVRSetup';
import Admin from '@/pages/Admin';
import FixedItems from '@/pages/FixedItems';
import PendingApprovals from '@/pages/PendingApprovals';
import T9Guide from '@/pages/T9Guide';
import SavingsGoals from '@/pages/SavingsGoals';
import IdentityGate from '@/components/IdentityGate';
import Debts from '@/pages/Debts';
import Coach from '@/pages/Coach';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/coach" element={<Coach />} />
        <Route element={<IdentityGate><Layout /></IdentityGate>}>
          <Route path="/" element={<Home />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/fixed" element={<FixedItems />} />
          <Route path="/pending" element={<PendingApprovals />} />
          <Route path="/phone-setup" element={<PhoneRegistration />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/ivr-setup" element={<IVRSetup />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/t9-guide" element={<T9Guide />} />
          <Route path="/savings" element={<SavingsGoals />} />
          <Route path="/debts" element={<Debts />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
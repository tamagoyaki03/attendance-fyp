import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './SupabaseProvider'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

// Import page components
import ManageClassesPage from './pages/ManageClasses';
import FraudDetection from "./pages/FraudDetection";
import AttendanceManagement from "./pages/AttendanceManagement";
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ProfilePage from './pages/ProfilePage';
import Overview from './pages/Overview';
import AbsenceManagement from './pages/AbsenceManagement';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import SubmitAbsenceDocumentPage from './pages/SubmitAbsenceDocumentPage';

const AppRoutes = () => {
//  const auth = useAuth();
// if (!auth) return null;
// const { session, supabase } = auth;

  // if (!session) {
  //   return (
  //     <Auth
  //       supabaseClient={supabase}
  //       appearance={{ theme: ThemeSupa }}
  //       theme="dark"
  //       providers={['google']}
  //     />
  //   );
  // }

  return (
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/manage-classes" element={<ManageClassesPage />} />
            <Route path="/fraud-detection" element={<FraudDetection />} />
            <Route path="/attendance-management" element={<AttendanceManagement />} />
            <Route path="/absence-management" element={<AbsenceManagement />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/student-absence/submit" element={<SubmitAbsenceDocumentPage />} />
          </Routes>
  );
};

export default AppRoutes;

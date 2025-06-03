import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import ManageClassesPage from './pages/ManageClasses';
import FraudDetection from "./pages/FraudDetection";
import AttendanceManagement from "./pages/AttendanceManagement";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/manage-classes" element={<ManageClassesPage />} />
        <Route path="/fraud-detection" element={<FraudDetection />} />
        <Route path="/attendance-management" element={<AttendanceManagement />} />
        <Route path="/" element={<ManageClassesPage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
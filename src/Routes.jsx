import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import ManageClassesPage from './pages/ManageClasses';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/manage-classes" element={<ManageClassesPage />} />
        <Route path="/" element={<ManageClassesPage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
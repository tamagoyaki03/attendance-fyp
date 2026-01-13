import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ element }) => {
  // Check if user is logged in from sessionStorage
  const user = JSON.parse(sessionStorage.getItem("user"));

  if (!user) {
    // User not logged in, redirect to login page
    return <Navigate to="/" replace />;
  }

  // User is logged in, render the element
  return element;
};

export default ProtectedRoute;

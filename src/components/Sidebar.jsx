import React, { useState, useEffect } from 'react';
import { FaBell, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { GoBook } from "react-icons/go";
import { MdOutlineAnalytics } from "react-icons/md";
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiPieChart,
  FiShield,
  FiCalendar,
  FiUserX,
  FiFileText
} from 'react-icons/fi';

// ...existing code...
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  const userRole = user.role || "";
  const userName = user.name || "";
  const currentPath = location.pathname;
  
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(isOpen));
    const width = isOpen ? "250px" : "80px";
    document.documentElement.style.setProperty("--sidebar-width", width);
    window.dispatchEvent(new Event('sidebar-toggle'));
  }, [isOpen]);

  useEffect(() => {
    const width = isOpen ? "250px" : "80px";
    document.documentElement.style.setProperty("--sidebar-width", width);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseMenuItems = [
    { icon: <FiPieChart className="w-[16px] h-[16px]" />, label: 'Overview',  path: '/dashboard' },
    { icon: <FiFileText className="w-[16px] h-[16px]" />, label: 'Reports', path: '/reports' }
  ];

  const lecturerExtras = [
    { icon: <FiCalendar className="w-[16px] h-[16px]" />, label: 'Attendance Management', path: '/attendance-management' },
    { icon: <FiUserX className="w-[16px] h-[16px]" />, label: 'Absence Management', path: '/absence-management' }
  ];

  const adminItems = [
    { icon: <GoBook className="w-[16px] h-[16px]" />, label: 'Manage Classes', path: '/manage-classes', active: true },
    { icon: <FiShield className="w-[16px] h-[16px]" />, label: 'Fraud Detection', path: '/fraud-detection', active: false },
    { icon: <MdOutlineAnalytics className="w-[16px] h-[16px]" />, label: 'Analytics', path: '/analytics', active: false }
  ];

  // Admins should see base + admin items; others see base + lecturer extras
  const menuItems = userRole === "admin"
    ? baseMenuItems
    : [...baseMenuItems, ...lecturerExtras];

  return (
    <div
      className="h-screen flex flex-col justify-between relative transition-all duration-300"
      style={{
        width: isOpen ? "250px" : "80px",
        background: "#ffffff",
        borderRight: "1px solid #e6edf3",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 20,
      }}
    >
      <div className="p-[15px]">
        <div className="flex items-center justify-between">
          {isOpen && (
            <div className="flex items-center">
              <FaBell style={{ color: '#0f172a', marginRight: 8 }} />
              <h1 className="text-[20px] font-inter font-bold leading-[25px]" style={{ color: "#0f172a" }}>
                Attendance
              </h1>
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="ml-auto p-2 rounded hover:bg-gray-100 transition-colors"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0f172a' }}
            title={isOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isOpen ? <FaChevronLeft size={16} /> : <FaChevronRight size={16} />}
          </button>
        </div>

        {isOpen && (
          <div className="px-8 mt-4 mb-1">
            <h2 className="text-[14px] font-inter font-medium" style={{ color: "#475569" }}>
              Dashboard
            </h2>
          </div>
        )}

        <div className="px-4">
          {menuItems.map((item, index) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="flex items-center space-x-[10px] w-full rounded-lg my-1 transition-colors"
                style={{
                  color: '#0f172a',
                  border: 'none',
                  borderLeft: isActive ? '8px solid #0f172a' : '8px solid transparent',
                  padding: 0,
                  cursor: 'pointer',
                  background: isActive ? '#f1f5f9' : 'transparent',
                  paddingLeft: 8,
                  paddingTop: 8,
                  paddingBottom: 8,
                  justifyContent: isOpen ? 'flex-start' : 'center',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
                aria-current={isActive ? "page" : undefined}
                title={!isOpen ? item.label : ""}
              >
                {item.icon}
                {isOpen && (
                  <span className="text-[14px] font-inter font-normal text-left" style={{ color: "#0f172a", margin: 10 }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {userRole === 'admin' && (
          <>
            {isOpen && (
              <div className="px-8 mt-6 mb-1">
                <h2 className="text-[14px] font-inter font-medium" style={{ color: "#475569" }}>
                  Administration
                </h2>
              </div>
            )}
            <div className="px-4">
              {adminItems.map((item, index) => {
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={index}
                    onClick={() => navigate(item.path)}
                    className="flex items-center space-x-[10px] w-full rounded-lg my-1 transition-colors"
                    style={{
                      color: '#0f172a',
                      border: 'none',
                      borderLeft: isActive ? '8px solid #0f172a' : '8px solid transparent',
                      padding: 0,
                      cursor: 'pointer',
                      background: isActive ? '#f1f5f9' : 'transparent',
                      paddingLeft: 8,
                      paddingTop: 8,
                      paddingBottom: 8,
                      justifyContent: isOpen ? 'flex-start' : 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "#f8fafc";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                    aria-current={isActive ? "page" : undefined}
                    title={!isOpen ? item.label : ""}
                  >
                    {item.icon}
                    {isOpen && (
                      <span className="text-[14px] font-inter font-normal text-left" style={{ color: "#0f172a", margin: 10 }}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <button
        className="flex items-center p-[20px] w-full"
        onClick={() => navigate("/profile")}
        style={{ border: "none", borderTop: '1px solid #e6edf3', background: 'transparent', cursor: 'pointer', justifyContent: isOpen ? 'flex-start' : 'center' }}
        title={isOpen ? "Profile" : userName || "Profile"}
      >
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontWeight: 'bold', marginRight: isOpen ? 10 : 0 }}>
          {userName?.charAt(0) || "U"}
        </div>
        {isOpen && (
          <div className="flex flex-col text-left">
            <span className="text-[14px] font-inter font-medium" style={{ color: "#0f172a" }}>
              {userName || "Loading..."}
            </span>
            <span className="text-[12px] font-inter font-normal pt-[5px]" style={{ color: "#64748b" }}>
              {userRole === "admin"
                ? "Administrator"
                : userRole === "lecturer"
                ? "Lecturer"
                : userRole || ""}
            </span>
          </div>
        )}
      </button>
    </div>
  );
};

export default Sidebar;
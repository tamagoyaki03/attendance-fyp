import React from 'react';
import { FaBell } from "react-icons/fa";
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

  const menuItems = userRole === "admin" ? baseMenuItems : [...baseMenuItems, ...lecturerExtras];

  return (
    <div
      className="h-screen w-[250px] flex flex-col justify-between relative"
      style={{
        background: "#ffffff",
        borderRight: "1px solid #e6edf3",
      }}
    >
      <div className="p-[15px]">
        <div className="flex items-center">
          <FaBell style={{ color: '#0f172a', marginRight: 8 }} />
          <h1 className="text-[20px] font-inter font-bold leading-[25px]" style={{ color: "#0f172a" }}>
            Attendance
          </h1>
        </div>

        <div className="px-8 mt-4 mb-1">
          <h2 className="text-[14px] font-inter font-medium" style={{ color: "#475569" }}>
            Dashboard
          </h2>
        </div>

        <div className="px-4">
          {menuItems.map((item, index) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="flex items-center space-x-[10px] w-full rounded-lg my-1"
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
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#f8fafc";
                    // do NOT change left border on hover
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderLeft = "8px solid transparent";
                  }
                }}
                aria-current={isActive ? "page" : undefined}
              >
                {item.icon}
                <span className="text-[14px] font-inter font-normal text-left" style={{ color: "#0f172a", margin: 10 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {userRole === 'admin' && (
          <>
            <div className="px-8 mt-6 mb-1">
              <h2 className="text-[14px] font-inter font-medium" style={{ color: "#475569" }}>
                Administration
              </h2>
            </div>
            <div className="px-4">
              {adminItems.map((item, index) => {
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={index}
                    onClick={() => navigate(item.path)}
                    className="flex items-center space-x-[10px] w-full rounded-lg my-1"
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
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "#f8fafc";
                        // do NOT change left border on hover
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderLeft = "8px solid transparent";
                      }
                    }}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.icon}
                    <span className="text-[14px] font-inter font-normal text-left" style={{ color: "#0f172a", margin: 10 }}>
                      {item.label}
                    </span>
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
        style={{ border: "none", borderTop: '1px solid #e6edf3', background: 'transparent' }}
      >
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
        <div className="ml-auto"></div>
      </button>
    </div>
  );
};

export default Sidebar;
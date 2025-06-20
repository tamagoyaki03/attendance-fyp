import React from 'react';
import { FaBell } from "react-icons/fa";
import { GoBook } from "react-icons/go";
import { MdOutlineAnalytics } from "react-icons/md";
import { useNavigate } from 'react-router-dom';
import {
  FiPieChart,
  FiShield,
  FiCalendar,
  FiUserX,
  FiFileText
} from 'react-icons/fi';

// Get user info from sessionStorage (set this on login)
const getUserInfo = () => {
  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  return {
    userRole: user.role ,
    userName: user.name ,
  };
};

const Sidebar = () => {
  const navigate = useNavigate();
  const { userRole, userName } = getUserInfo();

  const baseMenuItems = [
  { icon: <FiPieChart className="w-[16px] h-[16px]" />, label: 'Overview',  path: '/dashboard' },
  { icon: <FiFileText className="w-[16px] h-[16px]" />, label: 'Reports', path: '/reports' }
];

const lecturerExtras = [
  { icon: <FiCalendar className="w-[16px] h-[16px]" />, label: 'Attendance Management', path: '/attendance-management' },
  { icon: <FiUserX className="w-[16px] h-[16px]" />, label: 'Absence Management', path: '/absence-management' }
];

  // Admin-only menu items (not including Attendance/Absence Management)
  const adminItems = [
    { icon: <GoBook className="w-[16px] h-[16px]" />, label: 'Manage Classes', path: '/manage-classes', active: true },
    { icon: <FiShield className="w-[16px] h-[16px]" />, label: 'Fraud Detection', path: '/fraud-detection', active: false },
    { icon: <MdOutlineAnalytics className="w-[16px] h-[16px]" />, label: 'Analytics', path: '/analytics', active: false }
  ];

  const menuItems = userRole === "Administrator" ? baseMenuItems : [...baseMenuItems, ...lecturerExtras];

  return (
    <div className="bg-[#18181b] h-screen w-[250px] flex flex-col justify-between relative">
      {/* Top: Logo and Title */}
      <div className="p-[15px]">
        <div className="flex items-center" >
          <FaBell style={{ color: 'white', marginRight: '8px' }} />
          <h1 className="text-[20px] font-inter font-bold leading-[25px] text-[#f4f4f5]">
            Attendance
          </h1>
        </div>

        {/* Dashboard Section */}
        <div className="px-8 mt-2 mb-1">
          <h2 className="text-[14px] font-inter font-medium text-[#f4f4f5]">
            Dashboard
          </h2>
        </div>

        {/* Menu Items */}
        <div className="px-4">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="flex items-center space-x-[10px] w-full transition-colors bg-[#18181b]
                hover:bg-[#444] hover:border-l-4 hover:border-[#a1a1aa] active:bg-[#222] rounded-lg my-1"
              style={{
                color: 'white',
                border: 'none',
                borderLeft: '10px solid transparent',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {item.icon}
              <span className="text-[14px] font-inter font-normal text-left text-[#f4f4f5] m-[10px]">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Administration Section (Admin Only) */}
        {userRole === 'Administrator' && (
          <>
            <div className="px-8 mt-6 mb-1">
              <h2 className="text-[14px] font-inter font-medium text-[#f4f4f5]">
                Administration
              </h2>
            </div>
            <div className="px-4">
              {adminItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  className="flex items-center space-x-[10px] w-full transition-colors bg-[#18181b]
                    hover:bg-[#444] hover:border-l-4 hover:border-[#a1a1aa] active:bg-[#222] rounded-lg my-1"
                  style={{
                    color: 'white',
                    border: 'none',
                    borderLeft: '10px solid transparent',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {item.icon}
                  <span className="text-[14px] font-inter font-normal text-left text-[#f4f4f5] m-[10px]">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* User Profile Section */}
      <button
        className="flex items-center p-[20px] w-full "
        onClick={() => navigate("/profile")}
        style={{ border: "none", borderTop: '1px solid #fff', background: 'none' }}
      >
        <div className="flex flex-col text-left">
          <span className="text-[14px] font-inter font-medium text-[#f4f4f5]">
            {userName}
          </span>
          <span className="text-[12px] font-inter font-normal text-[#a1a1aa] pt-[5px]">
            {userRole}
          </span>
        </div>
        <div className="ml-auto"></div>
      </button>
    </div>
  );
};

export default Sidebar;
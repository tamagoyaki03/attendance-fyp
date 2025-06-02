import React from 'react';
import { FaBell } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import {
  FiPieChart,
  FiShield,
  FiCalendar,
  FiUserX,
  FiFileText
} from 'react-icons/fi';

const Sidebar = () => {
  const navigate = useNavigate();
  const menuItems = [
    { icon: <FiPieChart className="w-[16px] h-[16px]" />, label: 'Overview', active: false },
    { icon: <FiShield className="w-[16px] h-[16px]" />, label: 'Fraud Detection', active: false },
    { icon: <FiCalendar className="w-[16px] h-[16px]" />, label: 'Attendance Management', active: false },
    { icon: <FiUserX className="w-[16px] h-[16px]" />, label: 'Absence Management', active: false },
    { icon: <FiFileText className="w-[16px] h-[16px]" />, label: 'Reports', active: false }
  ];

  const adminItems = [
    { icon: <FiUserX className="w-[16px] h-[16px]" />, label: 'Manage Classes', active: true },
    { icon: <FiFileText className="w-[16px] h-[16px]" />, label: 'Analytics', active: false }
  ];

  return (
    <div className="bg-[#18181b] h-[940px] w-[220px] flex-shrink-0 relative flex flex-col">
      {/* Logo and Title */}
      <div className="flex items-center absolute left-[30px] top-[8px]">
          <FaBell style={{ color: 'white', marginRight: '8px' }} />
        <h1 className="text-[20px] font-inter font-bold leading-[25px] text-[#f4f4f5]">
          Attendance
        </h1>
      </div>

      {/* Dashboard Section */}
      <div className="absolute left-[16px] top-[61px]">
        <h2 className="text-[14px] font-inter font-medium leading-[15px] text-left text-[#f4f4f5]">
          Dashboard
        </h2>
      </div>

       {/* Menu Items */}
      <div className="absolute left-[16px] space-y-[24px]" style={{ marginTop: '110px' }}>
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            className="flex items-center space-x-[10px] text-left focus:outline-none w-full transition-colors hover:bg-[#27272a]"
            style={{ color: 'white', background: 'none', border: 'none', padding: 0 }}
          >
            {item.icon}
            <span className="text-[14px] font-inter font-normal leading-[17px] text-left text-[#f4f4f5]">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Administration Section */}
      <div className="absolute left-[16px] top-[320px]">
        <h2 className="text-[14px] font-inter font-medium leading-[15px] text-left text-[#f4f4f5]">
          Administration
        </h2>
      </div>

      {/* Admin Items */}
      <div className="absolute left-[16px] top-[326px] space-y-[24px]" style={{marginTop:'40px'}}>
        {adminItems.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            className="flex items-center space-x-[10px] text-left focus:outline-none w-full transition-colors hover:bg-[#27272a]"
            style={{ color: 'white', background: 'none', border: 'none', padding: 0 }}
          >
            {item.icon}
            <span className="text-[14px] font-inter font-normal leading-[17px] text-left text-[#f4f4f5]">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* User Profile Section */}
      {/* <div className="absolute left-[0px] top-[867px] border border-[#e5e7eb] h-[73px] w-[220px]">
        <div className="absolute left-[16px] top-[17px]">
          <img
            src="/images/img_placeholdersvg.png"
            alt="user avatar"
            className="w-[40px] h-[40px] rounded-[20px]"
          />
        </div>
        <div className="absolute left-[68px] top-[20px]">
          <p className="text-[14px] font-inter font-medium leading-[17px] text-left text-[#f4f4f5]">
            Organizer User
          </p>
          <p className="text-[12px] font-inter font-normal leading-[15px] text-left text-[#a1a1aa]">
            Admin
          </p>
        </div>
        <div className="absolute left-[199px] top-[17px] bg-[#09090b] border border-[#27272a] rounded-[6px] h-[40px] w-[40px]">
          <img
            src="/images/img_vector_gray_100.svg"
            alt="settings"
            className="absolute left-[14px] top-[14px] w-[12px] h-[12px]"
          />
        </div>
      </div> */}
    </div>
  );
};

export default Sidebar;
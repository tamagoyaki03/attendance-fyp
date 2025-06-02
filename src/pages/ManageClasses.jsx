import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { FaSearch } from "react-icons/fa";
import { IoIosAdd } from "react-icons/io";
import { BsThreeDots } from "react-icons/bs";
import { GoPeople } from "react-icons/go";

const ManageClasses = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [classes] = useState([
    {
      id: 1,
      code: 'CS101',
      name: 'Introduction to Programming',
      department: 'Computer Science',
      lecturer: 'Dr. Alan Turing',
      students: 120,
      status: 'Active'
    },
    {
      id: 2,
      code: 'CS202',
      name: 'Data Structures and Algorithms',
      department: 'Computer Science',
      lecturer: 'Dr. Ada Lovelace',
      students: 85,
      status: 'Active'
    },
    {
      id: 3,
      code: 'ENG101',
      name: 'English Composition',
      department: 'Arts & Humanities',
      lecturer: 'Prof. Jane Austen',
      students: 95,
      status: 'Active'
    },
    {
      id: 4,
      code: 'MATH201',
      name: 'Calculus II',
      department: 'Science',
      lecturer: 'Dr. Isaac Newton',
      students: 110,
      status: 'Active'
    },
    {
      id: 5,
      code: 'BUS101',
      name: 'Introduction to Business',
      department: 'Business',
      lecturer: 'Prof. Warren Buffett',
      students: 150,
      status: 'Active'
    },
    {
      id: 6,
      code: 'ENG201',
      name: 'Mechanical Engineering Principles',
      department: 'Engineering',
      lecturer: 'Dr. Nikola Tesla',
      students: 75,
      status: 'Inactive'
    },
    {
      id: 7,
      code: 'CS301',
      name: 'Database Systems',
      department: 'Computer Science',
      lecturer: 'Dr. Grace Hopper',
      students: 65,
      status: 'Active'
    },
    {
      id: 8,
      code: 'ART101',
      name: 'Introduction to Art History',
      department: 'Arts & Humanities',
      lecturer: 'Prof. Leonardo da Vinci',
      students: 80,
      status: 'Inactive'
    }
  ]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddClass = () => {
    navigate('/add-class');
  };

  const handleActionClick = (classId, action) => {
    console.log(`Action ${action} clicked for class ID: ${classId}`);
    alert(`${action} action for class ID: ${classId}`);
  };

  const filteredClasses = classes.filter(classItem =>
    classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.lecturer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#121212] min-h-screen flex">
      <Sidebar />

      <main className="flex-1 flex flex-col p-8" style={{ margin: '50px' }}>
        {/* Main Content Area */}
          <div>
            <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left text-[#fafafa] mb-[0px]">
              Manage Classes
            </h2>
            <div className="flex justify-between items-center">
              <p className="text-[14px] font-inter font-normal leading-[17px] text-left text-[#a1a1aa]">
                Add, edit, or remove classes from the system
              </p>
              <Button
                onClick={handleAddClass}
                variant="primary"
                className="h-[40px] w-[120px] flex items-center justify-center space-x-2 mr-4"
              >
                <IoIosAdd className="h-[20px] w-[20px]" />
                <span>Add Class</span>
              </Button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="flex items-center gap-4">
            <InputField
              placeholder="Search classes..."
              value={searchTerm}
              onChange={handleSearchChange}
              icon={<FaSearch className='text-[#ffffff] w-[16px] h-[16px]' />}
              iconPosition="left"
              className="flex-1 h-[40px] pl-10"
            />
          </div>

          {/* Table Section */}
          <div className="border border-[#e5e7eb] rounded-[6px] h-[633px]" style={{marginTop: '20px'}}>
            {/* Table Header */}
            <div className="flex items-center h-[47px] border-b border-[#e5e7eb] px-[17px] bg-[#09090b]">
              <div className="w-[96px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                Code
              </div>
              <div className="w-[260px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                Name
              </div>
              <div className="w-[154px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                Department
              </div>
              <div className="w-[187px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                Lecturer
              </div>
              <div className="w-[91px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                Students
              </div>
              <div className="w-[100px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                Status
              </div>
              <div className="flex-1 text-[14px] font-inter font-medium leading-[17px] text-right text-[#a1a1aa]">
                Actions
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-y-auto max-h-[586px]">
              {filteredClasses.map((classItem) => (
                <div key={classItem.id} className="flex items-center h-[73px] border-b border-[#27272a] px-[17px] hover:bg-[#27272a] transition-colors">
                  <div className="w-[96px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#fafafa]">
                    {classItem.code}
                  </div>
                  <div className="w-[260px] text-[14px] font-inter font-normal leading-[17px] text-left text-[#fafafa]">
                    {classItem.name}
                  </div>
                  <div className="w-[154px] text-[14px] font-inter font-normal leading-[17px] text-left text-[#fafafa]">
                    {classItem.department}
                  </div>
                  <div className="w-[187px] text-[14px] font-inter font-normal leading-[17px] text-left text-[#fafafa]">
                    {classItem.lecturer}
                  </div>
                  <div className="w-[91px] flex items-center space-x-2">
                    <GoPeople className="text-[#a1a1aa] w-[14px] h-[14px] mr-[px]" />
                    <span className="text-[14px] font-inter font-normal leading-[17px] text-left text-[#fafafa]">
                      {classItem.students}
                    </span>
                  </div>
                  <div className="w-[100px]">
                    {classItem.status === 'Active' ? (
                      <div className="bg-[#22c55e] rounded-[11px] h-[22px] w-[58px] flex items-center justify-center">
                        <span className="text-[12px] font-inter font-semibold leading-[15px] text-left text-[#18181b]">
                          Active
                        </span>
                      </div>
                    ) : (
                      <div className="border border-[#e5e7eb] rounded-[11px] h-[22px] w-[67px] flex items-center justify-center">
                        <span className="text-[12px] font-inter font-semibold leading-[15px] text-left text-[#a1a1aa]">
                          Inactive
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex justify-end">
                    <button
                      onClick={() => handleActionClick(classItem.id, 'menu')}
                      className="w-[40px] h-[40px] flex items-center justify-center hover:bg-[#09090b] rounded transition-colors border-none"
                      style={{ background: 'transparent' }}
                    >
                      <BsThreeDots className="text-[#ffffff] w-[20px] h-[20px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        {/* </div> */}
      </main>
    </div>
  );
};

export default ManageClasses;
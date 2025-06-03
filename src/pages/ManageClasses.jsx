import React, { useState, useEffect} from 'react';
import supabase from "../config/supabaseClient";
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { FaSearch } from "react-icons/fa";
import { IoIosAdd } from "react-icons/io";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri"
import { GoPeople } from "react-icons/go";
import  AddClassDialog  from "../components/Event/AddClassDialog";
import EditClassDialog from '../components/Event/EditClassDialog';

const ManageClasses = () => {
  const [fetchError, setFetchError] = useState(null);
  const [classes, setClasses] = useState(null);
  const [openAddClassDialog, setOpenAddClassDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [openEditClassDialog, setOpenEditClassDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClasses = async () => {
    const { data, error } = await supabase.from('classes').select('*');
    if (error) {
      setFetchError('Could not fetch classes');
      setClasses(null);
      console.error('Error fetching classes:', error);
    } 
    if (data) {
      setClasses(data);
      setFetchError(null);
    }
  }

    useEffect(() => {
      fetchClasses();
  },[])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDelete = async (classId) => {
  const confirmed = window.confirm("Are you sure you want to delete this class?");
  if (!confirmed) return;

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId);

  if (error) {
    console.error("Failed to delete class:", error.message);
  } else {
    console.log("Class deleted successfully");
    fetchClasses();
  }
};

  const filteredClasses = Array.isArray(classes)
  ? classes.filter(classItem =>
      classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.lecturer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  : [];

  return (
    <div className="grid grid-cols-[250px_1fr] gap-[20px] max-h-screen bg-[#121212]">
      <div className="fixed h-screen w-[250px]">
        <Sidebar />
      </div>
      
        <main className="col-start-2 p-[40px] ">
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
                  onClick={() => setOpenAddClassDialog(true)}
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
                id="search-classes"
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
                <div className="w-[120px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                  Code
                </div>
                <div className="w-[400px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                  Name
                </div>
                <div className="w-[230px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                  Lecturer
                </div>
                <div className="w-[120px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#a1a1aa]">
                  Students
                </div>
                <div className="flex-1 text-[14px] font-inter font-medium leading-[17px] text-right text-[#a1a1aa]" style={{ paddingRight: '20px' }}>
                  Actions
                </div>
              </div>

              {/* Table Body */}
              <div className="overflow-y-auto max-h-[586px]">
                {fetchError && (<p>{fetchError}</p>)}
                {!fetchError && filteredClasses.length === 0 && (
                  <p className="text-center text-[#a1a1aa] mt-4">No classes found</p>
                )}
                {filteredClasses.map((classItem) => (
                  <div key={classItem.id} className="flex items-center h-[73px] border-b border-[#27272a] px-[17px] hover:bg-[#27272a] transition-colors">
                    <div className="w-[120px] text-[14px] font-inter font-medium leading-[17px] text-left text-[#fafafa]">
                      {classItem.code}
                    </div>
                    <div className="w-[400px] text-[14px] font-inter font-normal leading-[17px] text-left text-[#fafafa]">
                      {classItem.name}
                    </div>
                    <div className="w-[230px] text-[14px] font-inter font-normal leading-[17px] text-left text-[#fafafa]">
                      {classItem.lecturer}
                    </div>
                    <div className="w-[120px] flex items-center space-x-2">
                      <GoPeople className="text-[#a1a1aa] w-[14px] h-[14px] mr-[px]" />
                      <span className="text-[14px] font-inter font-normal leading-[17px] text-left text-[#fafafa]">
                        {(Array.isArray(classItem.students) ? classItem.students.length : 0)}
                      </span>
                    </div>
                    <div className="flex-1 flex justify-end space-x-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          setSelectedClass(classItem);
                          setOpenEditClassDialog(true);
                        }}
                        className="w-[40px] h-[40px] flex items-center justify-center hover:bg-[#09090b] rounded transition-colors border-none"
                        style={{ background: 'transparent' }}
                      >
                        <FiEdit className="text-[#ffffff] w-[20px] h-[20px]" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(classItem.id)}
                        className="w-[40px] h-[40px] flex items-center justify-center hover:bg-[#09090b] rounded transition-colors border-none"
                        style={{ background: 'transparent' }}
                      >
                        <RiDeleteBin6Line className="text-[#ffffff] w-[20px] h-[20px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </main>
        <AddClassDialog open={openAddClassDialog} onOpenChange={setOpenAddClassDialog} onClassAdded={fetchClasses} />
        <EditClassDialog open={openEditClassDialog} onOpenChange={setOpenEditClassDialog} classData={selectedClass} onClassAdded={fetchClasses}/>
    </div>
  );
};

export default ManageClasses;
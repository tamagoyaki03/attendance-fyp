import React, { useState, useEffect } from 'react';
import supabase from "../config/supabaseClient";
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { FaSearch } from "react-icons/fa";
import { IoIosAdd } from "react-icons/io";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { GoPeople } from "react-icons/go";
import AddClassDialog from "../components/Event/AddClassDialog";
import EditClassDialog from '../components/Event/EditClassDialog';

const ManageClasses = () => {
  const [fetchError, setFetchError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [openAddClassDialog, setOpenAddClassDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [openEditClassDialog, setOpenEditClassDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const dummyLecturers = [
    { id: "lect1", name: "Ada Lovelace" },
    { id: "lect2", name: "Grace Chin" },
    { id: "lect3", name: "Sofya" },
    { id: "lect4", name: "Charlie Tan" },
    { id: "lect5", name: "Johnathan" }
  ];

  useEffect(() => {
  fetchClasses();
}, []);

  const fetchClasses = async () => {
  try {
    console.log("Fetching classes...");

    // 1️⃣  Get lectures + tutorials
    const [{ data: lectures, error: lectureError },
      { data: tutorials, error: tutorialError },
      { data: users, error: usersError },
      { data: lectureEnrollments, error: enrollLectureError },
      { data: tutorialEnrollments, error: enrollTutorialError }] = await Promise.all([
      supabase.from('course_lecture').select('*'),
      supabase
      .from('course_tutorial')
      .select(`
        *,
        course:course_lecture (
          id,
          course_title,
          course_code
        )
      `),
      supabase.from('users').select('id, name'),
      supabase.from('enrollment_lecture').select('course_id'),
      supabase.from('enrollment_tutorial').select('tutorial_id'),
    ]);

    console.log('Lectures:', lectures);
    console.log('Tutorials:', tutorials);
    console.log('Users:', users);
    console.log('Lecture Enrollments:', lectureEnrollments);
    console.log('Tutorial Enrollments:', tutorialEnrollments);

    if (lectureError || tutorialError || usersError || enrollLectureError || enrollTutorialError) {
      console.error('Errors:', lectureError, tutorialError, usersError, enrollLectureError, enrollTutorialError);
      setFetchError('Could not fetch classes');
      setClasses(null);
      return;
    }

    // 2️⃣  Map: user.id -> name
    const lecturerMap = {};
    users?.forEach(u => {
      lecturerMap[u.id] = u.name;
    });

    // 3️⃣  Map: lecture.id -> enrollment count
    const lectureEnrollmentCount = {};
    lectureEnrollments?.forEach(e => {
      lectureEnrollmentCount[e.course_id] = (lectureEnrollmentCount[e.course_id] || 0) + 1;
    });

    const tutorialEnrollmentCount = {};
    tutorialEnrollments?.forEach(e => {
      tutorialEnrollmentCount[e.course_id] = (tutorialEnrollmentCount[e.tutorial_id] || 0) + 1;
    });

    // 4️⃣  Merge
    const merged = [
      ...(lectures || []).map(item => ({
        ...item,
        type: 'Lecture',
        lecturer_name: lecturerMap[item.lecturer_id] || 'Unknown',
        num_students: lectureEnrollmentCount[item.id] || 0,
      })),
      ...(tutorials || []).map(item => ({
      ...item,
      type: 'Tutorial',
      course_code: item.course?.course_code,
      course_title: item.course?.course_title,
      lecturer_name: lecturerMap[item.lecturer_id] || 'Unknown',
      num_students: tutorialEnrollmentCount[item.id] || 0,
})),

    ];

    console.log('Merged:', merged);

    setClasses(merged);
    setFetchError(null);

  } catch (error) {
    console.error('Unexpected error:', error);
    setFetchError('Could not fetch classes');
    setClasses(null);
  }
};

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDelete = async (classItem) => {
    const confirmed = window.confirm("Are you sure you want to delete this class?");
    if (!confirmed) return;

    // const table = classItem.type === 'Lecture' ? 'course_lecture' : 'course_tutorial';

    const { error } = 
    //   .from(table)
    //   .delete()
    //   .eq('id', classItem.id);
    // Delete enrollments first
    await supabase
      .from('enrollment_lecture')
      .delete()
      .eq('course_id', classItem.id);

    // Then delete the class
    await supabase
      .from('course_lecture')
      .delete()
      .eq('id', classItem.id);

    if (error) {
      console.error("Failed to delete class:", error.message);
    } else {
      console.log("Class deleted successfully");
      fetchClasses();
    }
  };

  const filteredClasses = Array.isArray(classes)
    ? classes.filter(classItem =>
      (classItem.course_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (classItem.course_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (classItem.lecturer_id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
    : [];

  return (
    <div className="bg-[#121212] min-h-screen w-screen">
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
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

        {/* Search */}
        <div className="flex items-center gap-4 mt-4">
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

        {/* Table */}
        <div className="border border-[#e5e7eb] rounded-[6px] h-[633px] mt-6">
          <div className="flex items-center h-[47px] border-b border-[#e5e7eb] px-[17px] bg-[#09090b]">
            <div className="w-[120px] text-[14px] font-inter font-medium text-[#a1a1aa]">Code</div>
            <div className="w-[400px] text-[14px] font-inter font-medium text-[#a1a1aa]">Name</div>
            <div className="w-[230px] text-[14px] font-inter font-medium text-[#a1a1aa]">Lecturer</div>
            <div className="w-[180px] text-[14px] font-inter font-medium text-[#a1a1aa]">Students</div>
            <div className="flex-1 text-[14px] font-inter font-medium text-right text-[#a1a1aa]" style={{ paddingRight: '20px' }}>Actions</div>
          </div>

          <div className="overflow-y-auto max-h-[586px]">
            {fetchError && <p>{fetchError}</p>}
            {!fetchError && filteredClasses.length === 0 && (
              <p className="text-center text-[#a1a1aa] mt-4">No classes found</p>
            )}
            {filteredClasses.map((classItem) => (
              <div key={`${classItem.id}-${classItem.type}`} className="flex items-center h-[73px] border-b border-[#27272a] px-[17px] hover:bg-[#27272a] transition-colors">
                <div className="w-[120px] text-[14px] font-inter font-medium text-[#fafafa]">
                  {classItem.course_code}
                </div>
                <div className="w-[400px] text-[14px] font-inter font-normal text-[#fafafa]">
                  {classItem.course_title} ({classItem.type})
                </div>
                <div className="w-[230px] text-[14px] font-inter font-normal text-[#fafafa]">
                  {classItem.lecturer_name}
                </div>
                <div className="w-[180px] flex items-center text-[14px] font-inter font-normal text-[#fafafa]">
                  <GoPeople className="mr-1" />
                  {classItem.num_students || 0}
                </div>
                <div className="flex-1 flex justify-end space-x-2">
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
                  <button
                    onClick={() => handleDelete(classItem)}
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

      <AddClassDialog
        open={openAddClassDialog}
        onOpenChange={setOpenAddClassDialog}
        onClassAdded={fetchClasses}
      />

      <EditClassDialog
        open={openEditClassDialog}
        onOpenChange={setOpenEditClassDialog}
        classData={selectedClass}
        onClassAdded={fetchClasses}
        lecturers={dummyLecturers}
      />
    </div>
  );
};

export default ManageClasses;

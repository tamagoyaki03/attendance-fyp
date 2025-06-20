import React, { useState } from "react"
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Divider,
} from "@mui/material"
import Sidebar from "../components/Sidebar"
import AttendanceReportsTab from "../components/AttendanceReportsTab"
import AbsenceReportsTab from "../components/AbsenceReportsTab"
import FraudReportsTab from "../components/FraudReportsTab"
import ReportGenerator from "../components/Event/ReportGenerator"

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = (_e, newValue) => {
    setActiveTab(newValue)
  }

  return (
    <div className="bg-[#121212] min-h-screen w-screen">
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main
        className="ml-[250px] p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh" }}
      >
        {/* Page Header */}
        <Typography variant="h5" color="#fafafa" fontWeight="bold">
          Reports
        </Typography>

        {/* Intro Card */}
        <Card
          sx={{
            backgroundColor: "#09090b",
            color: "#fafafa",
            mt: 3,
            borderRadius: 2,
            border: 1,
          }}
        >
          <CardHeader style={{ paddingBottom: "0px" }}
            title={
              <Typography variant="h6" fontWeight="bold">
                Reporting Module
              </Typography>
            }
            subheader={
              <Typography variant="body2" color="#a1a1aa">
                View and generate various reports related to attendance,
                absences, and fraud detection.
              </Typography>
            }
          />
        

        {/* Tabs and Content */}
        <Box sx={{ m: "10px"}}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Attendance Reports" />
            <Tab label="Absence Reports" />
            <Tab label="Fraud Reports" />
          </Tabs>

          <Box sx={{ m: "10px", border: 1, borderRadius: 1 }}>
            {activeTab === 0 && <AttendanceReportsTab />}
            {activeTab === 1 && <AbsenceReportsTab />}
            {activeTab === 2 && <FraudReportsTab />}
          </Box>
        </Box>
        </Card>

        {/* Generator Section */}
        <Box mt={4}>
          <ReportGenerator />
        </Box>
      </main>
    </div>
  )
}

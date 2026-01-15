import React, { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
} from "@mui/material";
import Sidebar from "../components/Sidebar";
import AttendanceReportsTab from "../components/AttendanceReportsTab";
import AbsenceReportsTab from "../components/AbsenceReportsTab";
import FraudTable from "../components/FraudTable";
import ReportGenerator from "../components/Event/ReportGenerator";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_e, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main
        data-has-sidebar
        className="p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh", marginLeft: "var(--sidebar-width, 250px)", transition: "margin-left 0.3s ease-in-out" }}
      >
        <div>
          <h2
            className="text-[24px] font-inter font-semibold leading-[30px] text-left"
            style={{ color: "#0f172a", marginBottom: 0 }}
          >
            Reports
          </h2>
          <div className="flex justify-between items-center">
            <p
              className="text-[14px] font-inter font-normal leading-[17px] text-left"
              style={{ color: "#374151" }}
            >
              View and generate various reports related to attendance.
            </p>
          </div>
        </div>

        <Box sx={{ borderBottom: 1, borderColor: "#e5e7eb"}}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            sx={{ mb: 2 }}
          >
            <Tab label="Attendance Reports" sx={{ color: "#0f172a" }} />
            <Tab label="Absence Reports" sx={{ color: "#0f172a" }} />
            <Tab label="Fraud Reports" sx={{ color: "#0f172a" }} />
          </Tabs>
        </Box>

        <Box mt={2}>
          {activeTab === 0 && (
            <>
              <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
                <CardHeader
                  sx={{ pb: 0 }}
                  title={<Typography variant="h6" fontWeight="bold" color="text.primary">Attendance Reports</Typography>}
                  subheader={<Typography variant="body2" color="text.secondary">Generate and view attendance summaries.</Typography>}
                />
                <CardContent>
                  <AttendanceReportsTab />
                </CardContent>
              </Card>

              <Box mt={4}>
                <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
                  <CardHeader
                    sx={{ pb: 0 }}
                    title={<Typography variant="h6" fontWeight="bold" color="text.primary">Report Generator</Typography>}
                    subheader={<Typography variant="body2" color="text.secondary">Create custom reports for download.</Typography>}
                  />
                  <CardContent>
                    <ReportGenerator />
                  </CardContent>
                </Card>
              </Box>
            </>
          )}

          {activeTab === 1 && (
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
              <CardHeader
                sx={{ pb: 0 }}
                title={<Typography variant="h6" fontWeight="bold" color="text.primary">Absence Reports</Typography>}
                subheader={<Typography variant="body2" color="text.secondary">View absence statistics.</Typography>}
              />
              <CardContent>
                <AbsenceReportsTab />
              </CardContent>
            </Card>
          )}

          {activeTab === 2 && (
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
              <CardHeader
                sx={{ pb: 0 }}
                title={<Typography variant="h6" fontWeight="bold" color="text.primary">Fraud Reports</Typography>}
                subheader={<Typography variant="body2" color="text.secondary">Investigate potential fraud and suspicious activity.</Typography>}
              />
              <CardContent>
                <FraudTable />
              </CardContent>
            </Card>
          )}
        </Box>
      </main>
    </div>
  );
}
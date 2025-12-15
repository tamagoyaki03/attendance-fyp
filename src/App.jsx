import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Routes from './Routes';
import { AuthProvider } from "./SupabaseProvider";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f172a" }, // dark primary for accents
    background: { default: "#ffffff", paper: "#ffffff" },
    text: { primary: "#0f172a", secondary: "#64748b" }
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#0f172a" }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#64748b",
          "&.Mui-focused": { color: "#0f172a" }
        }
      }
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "#0f172a",
            color: "#fff"
          },
          "&:focus": {
            backgroundColor: "#0f172a",
            color: "#fff"
          }
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: "#0f172a" }
      }
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <CssBaseline />
        {/* <AuthProvider> */}
        <Router>
          <Routes />
        </Router>
        {/* </AuthProvider> */}
      </div>
    </ThemeProvider>
  );
}

export default App;
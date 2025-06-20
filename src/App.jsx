import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Routes from './Routes';
import { AuthProvider } from "./SupabaseProvider";

function App() {
  return (
    <div className="App">
      {/* <AuthProvider> */}
        <Router>
          <Routes />
        </Router>
      {/* </AuthProvider> */}
    </div>
  );
}

export default App;
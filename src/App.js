import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from './pages/Home';
import Flight from './pages/Flight';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Navbar from './components/Navbar';  // Navbar 컴포넌트 추가

const App = () => {
  return (
    <React.Fragment>
      <Router>
        <Navbar />  {/* Navbar를 포함하여 모든 페이지에서 표시 */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/flight" element={<Flight />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </React.Fragment>
  );
};

export default App;

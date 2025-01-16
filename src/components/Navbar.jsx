import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/navbar.css';

function Navbar() {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
    window.location.reload();
  };

  return (
    <nav>
      <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>Traveler</div>
      <ul className="menu">
        <li><Link to="/flight">Flight</Link></li>
        <li><Link to="/signup">Signup</Link></li>
        <li><Link to="/login">Login</Link></li>
      </ul>
    </nav>
  );
}

export default Navbar;

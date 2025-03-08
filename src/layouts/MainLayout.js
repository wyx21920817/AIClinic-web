import React from 'react';

const MainLayout = ({ children }) => {
  return (
    <div className="main-layout">
      <header className="header">
        <nav>
          <h1>AI Clinic</h1>
        </nav>
      </header>
      <main className="main-content">
        {children}
      </main>
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} AI Clinic. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;

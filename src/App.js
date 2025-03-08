import React from 'react';
import MainLayout from './layouts/MainLayout';
import ECGViewerPage from './pages/ECGViewer';
import './App.css';

function App() {
  return (
    <MainLayout>
      <div className="App">
        <div className="page-content">
          <ECGViewerPage />
        </div>
      </div>
    </MainLayout>
  );
}

export default App;

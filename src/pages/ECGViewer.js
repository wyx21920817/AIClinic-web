import React from 'react';
import ECGViewer from '../components/ECGViewer';

const ECGViewerPage = () => {
  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>ECG Viewer</h2>
      <div style={{ 
        marginTop: '20px',
        minHeight: '400px',
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#fff'
      }}>
        <ECGViewer />
      </div>
    </div>
  );
};

export default ECGViewerPage;

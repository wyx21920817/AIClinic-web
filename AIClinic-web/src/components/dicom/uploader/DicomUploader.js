import React, { useRef, useState } from 'react';
import './DicomUploader.css';

const DicomUploader = ({ onFileUpload }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.dcm')) {
      alert('Please upload a .dcm format DICOM file');
      return;
    }
    
    setUploading(true);
    try {
      await onFileUpload(file);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  return (
    <div 
      className={`dicom-uploader ${dragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="upload-area">
        <label 
          htmlFor="dicom-upload" 
          className="upload-button"
          disabled={uploading}
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          Select DICOM file
        </label>
        <input
          id="dicom-upload"
          type="file"
          accept=".dcm"
          onChange={handleFileChange}
          style={{ 
            width: '0.1px',
            height: '0.1px',
            opacity: 0,
            overflow: 'hidden',
            position: 'absolute',
            zIndex: -1
          }}
        />
        {uploading ? (
          <div className="upload-status">
            <div className="loading-spinner"></div>
            <p>Uploading DICOM file...</p>
          </div>
        ) : (
          <>
            <p>or drag and drop DICOM file here</p>
          </>
        )}
      </div>
    </div>
  );
};

export default DicomUploader;

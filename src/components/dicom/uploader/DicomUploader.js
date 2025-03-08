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
      alert('请上传.dcm格式的DICOM文件');
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
        <input
          type="file"
          accept=".dcm"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <div className="upload-status">
            <div className="loading-spinner"></div>
            <p>正在上传DICOM文件...</p>
          </div>
        ) : (
          <>
            <button 
              onClick={() => fileInputRef.current.click()}
              className="upload-button"
              disabled={uploading}
            >
              选择DICOM文件
            </button>
            <p>或将DICOM文件拖放到此处</p>
          </>
        )}
      </div>
    </div>
  );
};

export default DicomUploader;

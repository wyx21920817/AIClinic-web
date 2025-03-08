import React, { useState } from 'react';
import ECGViewer from '../components/ECGViewer';
import ImageUploader from '../components/ImageUploader';

const ECGViewerPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDicomReceived = (dicomFile) => {
    setSelectedFile(dicomFile);
  };

  return (
    <div className="page-container">
      <h2>心电图查看</h2>
      <div className="upload-options">
        <div className="upload-option">
          <h3>上传DICOM文件</h3>
          <div className="upload-container">
            <input
              type="file"
              accept=".dcm"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="ecg-file-input"
            />
            <label htmlFor="ecg-file-input" className="upload-button">
              选择ECG DICOM文件
            </label>
          </div>
        </div>

        <div className="upload-option">
          <h3>上传图片转换</h3>
          <ImageUploader onDicomReceived={handleDicomReceived} />
        </div>
      </div>
      
      <div className="viewer-container">
        {selectedFile && <ECGViewer file={selectedFile} />}
      </div>
    </div>
  );
};

export default ECGViewerPage;

import React from 'react';
import DicomUploader from '../components/dicom/uploader/DicomUploader';
import DicomViewer from '../components/dicom/viewer/DicomViewer';

const Home = () => {
  const [selectedFile, setSelectedFile] = React.useState(null);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  return (
    <div className="home-container">
      <h1>AI Clinic DICOM Viewer</h1>
      <DicomUploader onFileSelect={handleFileSelect} />
      {selectedFile && <DicomViewer file={selectedFile} />}
    </div>
  );
};

export default Home;

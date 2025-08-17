import React, { useState, useEffect } from 'react';
import { uploadImage, checkTaskStatus, downloadDicomFile } from '../services/imageService';

const ImageUploader = ({ onDicomReceived }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  const [convertedFiles, setConvertedFiles] = useState([]);

  // Clear timer
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const handleDicomFile = async (blob, fileName) => {
    console.log('Processing DICOM file:', {
      size: blob.size,
      type: blob.type
    });

    // Ensure correct file type
    const dicomFile = new File([blob], fileName, { 
      type: 'application/dicom',
      lastModified: new Date().getTime()
    });

    console.log('Created DICOM file:', {
      name: dicomFile.name,
      type: dicomFile.type,
      size: dicomFile.size,
      lastModified: new Date(dicomFile.lastModified).toISOString()
    });

    // Create URL for debugging
    const url = URL.createObjectURL(dicomFile);
    console.log('File URL:', url);

    onDicomReceived(dicomFile);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    // Check file type
    console.log('Selected file:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });

    if (!file.type.startsWith('image/')) {
      const errorMsg = `Unsupported file type: ${file.type}, please select an image file`;
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('Uploading image...');
    setConvertedFiles([]);

    try {
      // 1. Upload image
      const uploadResult = await uploadImage(file);
      console.log('File upload successful, task ID:', uploadResult.task_id);
      setTaskId(uploadResult.task_id);
      setProgress('Converting to DICOM...');

      // 2. Start periodic status check
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      
      const intervalId = setInterval(async () => {
        try {
          const status = await checkTaskStatus(uploadResult.task_id);
          console.log('Conversion status:', status);

          if (status.status === 'completed') {
            clearInterval(intervalId);
            setStatusCheckInterval(null);
            setProgress('Conversion complete');
            setConvertedFiles(status.dicom_files || []);
            
            // If there are converted files, download the first file and pass it to the viewer
            if (status.dicom_files && status.dicom_files.length > 0) {
              const fileName = status.dicom_files[0].split('/').pop();
              const dicomBlob = await downloadDicomFile(uploadResult.task_id, fileName);
              await handleDicomFile(dicomBlob, fileName);
            }
            
            setLoading(false);
          } else if (status.status === 'failed') {
            clearInterval(intervalId);
            setStatusCheckInterval(null);
            throw new Error(status.error || 'Conversion failed');
          } else {
            setProgress(`Processing: ${status.message || 'Converting...'}`);
          }
        } catch (err) {
          clearInterval(intervalId);
          setStatusCheckInterval(null);
          throw err;
        }
      }, 1000);

      setStatusCheckInterval(intervalId);
    } catch (err) {
      console.error('Processing failed:', err);
      setError(`Processing failed: ${err.message}`);
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="image-uploader">
      <div className="upload-container">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={loading}
          style={{ display: 'none' }}
          id="image-input"
        />
        <label 
          htmlFor="image-input" 
          className={`upload-button ${loading ? 'disabled' : ''}`}
        >
          {loading ? 'Processing...' : 'Upload Image'}
        </label>
      </div>
      
      {progress && (
        <div className="progress-message">
          {progress}
        </div>
      )}
      
      {convertedFiles.length > 0 && (
        <div className="converted-files">
          <h4>Converted Files:</h4>
          <ul>
            {convertedFiles.map((file, index) => {
              const fileName = file.split('/').pop();
              return (
                <li key={index}>
                  <span>{fileName}</span>
                  <button 
                    onClick={async () => {
                      try {
                        const dicomBlob = await downloadDicomFile(taskId, fileName);
                        await handleDicomFile(dicomBlob, fileName);
                      } catch (err) {
                        setError(`Download failed: ${err.message}`);
                      }
                    }}
                  >
                    View
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <div>Error Message:</div>
          <pre>{error}</pre>
          <div className="error-hint">Press F12 to open browser console for detailed error information</div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  console.log('Preparing to upload image:', {
    fileName: file.name,
    fileType: file.type,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`
  });

  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('Upload successful, received task ID:', response.data);
    return response.data;  // Return response containing task_id
  } catch (error) {
    console.error('Upload failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw new Error(error.response?.data?.detail || 'Upload failed');
  }
};

export const checkTaskStatus = async (taskId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/status/${taskId}`);
    console.log('Task status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to check task status:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw new Error(error.response?.data?.detail || 'Failed to check task status');
  }
};

export const downloadDicomFile = async (taskId, fileName) => {
  try {
    console.log('Starting DICOM file download:', {
      taskId,
      fileName
    });

    const response = await axios.get(`${API_BASE_URL}/download/${taskId}/${fileName}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/dicom',  // Specify expected MIME type
      },
    });

    console.log('DICOM file download successful:', {
      type: response.headers['content-type'],
      size: response.data.size,
      lastModified: response.headers['last-modified']
    });

    // Ensure returned format is correct DICOM
    const dicomBlob = new Blob([response.data], { 
      type: 'application/dicom' 
    });

    console.log('Creating DICOM Blob:', {
      type: dicomBlob.type,
      size: dicomBlob.size
    });

    return dicomBlob;
  } catch (error) {
    console.error('DICOM file download failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers
    });
    throw new Error('DICOM file download failed');
  }
};

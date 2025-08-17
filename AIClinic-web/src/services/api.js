import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const uploadDicom = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await axios.post(`${API_URL}/upload`, formData);
    return response.data;
  } catch (error) {
    throw new Error('Failed to upload DICOM file');
  }
};

export const getDicomData = async (fileId) => {
  try {
    const response = await axios.get(`${API_URL}/dicom/${fileId}`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch DICOM data');
  }
};

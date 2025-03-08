import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  console.log('准备上传图片:', {
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
    console.log('上传成功，获取到任务ID:', response.data);
    return response.data;  // 返回包含task_id的响应
  } catch (error) {
    console.error('上传失败:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw new Error(error.response?.data?.detail || '上传失败');
  }
};

export const checkTaskStatus = async (taskId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/status/${taskId}`);
    console.log('任务状态:', response.data);
    return response.data;
  } catch (error) {
    console.error('检查任务状态失败:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw new Error(error.response?.data?.detail || '检查任务状态失败');
  }
};

export const downloadDicomFile = async (taskId, fileName) => {
  try {
    console.log('开始下载DICOM文件:', {
      taskId,
      fileName
    });

    const response = await axios.get(`${API_BASE_URL}/download/${taskId}/${fileName}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/dicom',  // 指定期望的MIME类型
      },
    });

    console.log('下载DICOM文件成功:', {
      type: response.headers['content-type'],
      size: response.data.size,
      lastModified: response.headers['last-modified']
    });

    // 确保返回的是正确的DICOM格式
    const dicomBlob = new Blob([response.data], { 
      type: 'application/dicom' 
    });

    console.log('创建DICOM Blob:', {
      type: dicomBlob.type,
      size: dicomBlob.size
    });

    return dicomBlob;
  } catch (error) {
    console.error('下载DICOM文件失败:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers
    });
    throw new Error('下载DICOM文件失败');
  }
};

import React, { useState, useEffect } from 'react';
import { uploadImage, checkTaskStatus, downloadDicomFile } from '../services/imageService';

const ImageUploader = ({ onDicomReceived }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  const [convertedFiles, setConvertedFiles] = useState([]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const handleDicomFile = async (blob, fileName) => {
    console.log('处理DICOM文件:', {
      size: blob.size,
      type: blob.type
    });

    // 确保文件类型正确
    const dicomFile = new File([blob], fileName, { 
      type: 'application/dicom',
      lastModified: new Date().getTime()
    });

    console.log('创建DICOM文件:', {
      name: dicomFile.name,
      type: dicomFile.type,
      size: dicomFile.size,
      lastModified: new Date(dicomFile.lastModified).toISOString()
    });

    // 创建URL以便调试
    const url = URL.createObjectURL(dicomFile);
    console.log('文件URL:', url);

    onDicomReceived(dicomFile);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('没有选择文件');
      return;
    }

    // 检查文件类型
    console.log('选择的文件:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });

    if (!file.type.startsWith('image/')) {
      const errorMsg = `不支持的文件类型: ${file.type}，请选择图片文件`;
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('上传图片中...');
    setConvertedFiles([]);

    try {
      // 1. 上传图片
      const uploadResult = await uploadImage(file);
      console.log('文件上传成功，任务ID:', uploadResult.task_id);
      setTaskId(uploadResult.task_id);
      setProgress('正在转换为DICOM...');

      // 2. 开始定期检查状态
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      
      const intervalId = setInterval(async () => {
        try {
          const status = await checkTaskStatus(uploadResult.task_id);
          console.log('转换状态:', status);

          if (status.status === 'completed') {
            clearInterval(intervalId);
            setStatusCheckInterval(null);
            setProgress('转换完成');
            setConvertedFiles(status.dicom_files || []);
            
            // 如果有转换后的文件，下载第一个文件并传递给查看器
            if (status.dicom_files && status.dicom_files.length > 0) {
              const fileName = status.dicom_files[0].split('/').pop();
              const dicomBlob = await downloadDicomFile(uploadResult.task_id, fileName);
              await handleDicomFile(dicomBlob, fileName);
            }
            
            setLoading(false);
          } else if (status.status === 'failed') {
            clearInterval(intervalId);
            setStatusCheckInterval(null);
            throw new Error(status.error || '转换失败');
          } else {
            setProgress(`正在处理: ${status.message || '转换中...'}`);
          }
        } catch (err) {
          clearInterval(intervalId);
          setStatusCheckInterval(null);
          throw err;
        }
      }, 1000);

      setStatusCheckInterval(intervalId);
    } catch (err) {
      console.error('处理失败:', err);
      setError(`处理失败: ${err.message}`);
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
          {loading ? '处理中...' : '上传图片'}
        </label>
      </div>
      
      {progress && (
        <div className="progress-message">
          {progress}
        </div>
      )}
      
      {convertedFiles.length > 0 && (
        <div className="converted-files">
          <h4>转换后的文件:</h4>
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
                        setError(`下载失败: ${err.message}`);
                      }
                    }}
                  >
                    查看
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <div>错误信息：</div>
          <pre>{error}</pre>
          <div className="error-hint">按F12打开浏览器控制台查看详细错误信息</div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

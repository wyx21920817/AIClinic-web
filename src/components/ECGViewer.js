import React, { useState, useEffect, useRef } from 'react';
import {
  DicomECGViewer,
  ReadECG,
  SOP_CLASS_UIDS,
} from 'ecg-dicom-web-viewer';

const ECGViewer = () => {
  const [error, setError] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [convertedDicomUrl, setConvertedDicomUrl] = useState(null);
  const statusCheckIntervalRef = useRef(null);
  const viewerRef = useRef(null);
  const containerId = 'ecg-container';

  useEffect(() => {
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      if (viewerRef.current) {
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = '';
        }
        viewerRef.current = null;
      }
    };
  }, []);

  const loadDicomFile = async (arrayBuffer) => {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('Container not found');
        return;
      }

      // 清除现有内容
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // 创建canvas元素
      const canvas = document.createElement('canvas');
      const canvasId = 'ecg-canvas-' + Date.now();  // 生成唯一ID
      canvas.id = canvasId;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);

      // 创建新的ECG查看器实例
      const viewer = new DicomECGViewer(
        arrayBuffer,     // DICOM数据
        canvasId,       // canvas 元素的 ID
        0               // 视图索引
      );

      // 保存viewer引用
      viewerRef.current = viewer;

      // 加载视图
      await viewer.loadCanvas();
      
    } catch (error) {
      console.error('加载ECG失败:', error);
      setError(`加载ECG失败: ${error.message}`);
    }
  };

  const handleDicomUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 直接读取文件并显示
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        await loadDicomFile(arrayBuffer);
        setError(null);
      } catch (error) {
        console.error('读取文件失败:', error);
        setError(`读取文件失败: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCtUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsConverting(true);
    setError(null);
    setConversionProgress(0);
    setShowProgress(true);
    setConvertedDicomUrl(null); // 重置URL
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadResponse = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`上传失败: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      const taskId = uploadData.task_id;
      setCurrentTaskId(taskId);
      setStatusMessage(`文件已上传，正在处理中...\n任务ID: ${taskId}`);

      // 清除之前的定时器
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }

      // 设置新的定时器
      statusCheckIntervalRef.current = setInterval(() => {
        fetch(`http://localhost:8000/status/${taskId}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`获取状态失败: ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('状态检查响应:', data);
            
            let statusText = `状态: ${data.status}\n`;
            if (data.message) {
              statusText += `消息: ${data.message}\n`;
            }
            if (data.error) {
              statusText += `错误: ${data.error}\n`;
              throw new Error(data.error);
            }
            setStatusMessage(statusText);

            if (data.status === 'completed') {
              // 立即清除定时器
              if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
                statusCheckIntervalRef.current = null;
              }
              
              if (data.dicom_files && data.dicom_files.length > 0) {
                const downloadUrl = `http://localhost:8000/download/${taskId}/${data.dicom_files[0]}`;
                console.log('设置下载URL:', downloadUrl);
                setConvertedDicomUrl(downloadUrl);
                statusText += `\n转换完成！\n`;
                statusText += `文件下载地址: ${downloadUrl}\n`;
                setStatusMessage(statusText);
                setConversionProgress(100);
                setIsConverting(false);
              } else {
                console.error('没有找到dicom_files字段或为空:', data);
                setError('服务器没有返回DICOM文件信息');
              }
            } else if (data.status === 'processing') {
              setConversionProgress(50);
            } else if (data.status === 'failed') {
              // 处理失败状态
              if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
                statusCheckIntervalRef.current = null;
              }
              setError(`转换失败: ${data.error || '未知错误'}`);
              setIsConverting(false);
            }
          })
          .catch(error => {
            console.error('状态检查失败:', error);
            setStatusMessage(`错误: ${error.message}`);
            setShowProgress(false);
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
            setIsConverting(false);
            setConversionProgress(0);
          });
      }, 1000);

    } catch (error) {
      setStatusMessage(`错误: ${error.message}`);
      setShowProgress(false);
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  const handleViewConverted = async () => {
    if (!convertedDicomUrl) return;
    
    try {
      const response = await fetch(convertedDicomUrl);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      await loadDicomFile(buffer);
      setError(null);
    } catch (error) {
      console.error('加载DICOM文件失败:', error);
      setError(`加载DICOM文件失败: ${error.message}`);
    }
  };

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative', margin: '20px 0' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <div>
          <h4 style={{ marginBottom: '8px' }}>Upload DICOM File</h4>
          <label 
            htmlFor="dicom-file" 
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'inline-block'
            }}
          >
            Choose File
          </label>
          <input
            id="dicom-file"
            type="file"
            accept=".dcm"
            onChange={handleDicomUpload}
            style={{ 
              width: '0.1px',
              height: '0.1px',
              opacity: 0,
              overflow: 'hidden',
              position: 'absolute',
              zIndex: -1
            }}
          />
        </div>
        <div>
          <h4 style={{ marginBottom: '8px' }}>Upload CT Scan for Conversion</h4>
          <label 
            htmlFor="ct-file" 
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'inline-block'
            }}
          >
            Choose File
          </label>
          <input
            id="ct-file"
            type="file"
            onChange={handleCtUpload}
            style={{ 
              width: '0.1px',
              height: '0.1px',
              opacity: 0,
              overflow: 'hidden',
              position: 'absolute',
              zIndex: -1
            }}
          />
        </div>
      </div>
      <div 
        id={containerId}
        style={{ 
          width: '100%', 
          height: '100%',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#fff'
        }}
      />
      {showProgress && (
        <div>
          <div style={{ 
            marginTop: '10px',
            width: '100%',
            height: '20px',
            backgroundColor: '#f0f0f0',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${conversionProgress}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
              transition: 'width 0.3s ease'
            }} />
          </div>
          {statusMessage && (
            <div 
              style={{ 
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#fff',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                whiteSpace: 'pre-wrap'
              }}>
              <div>{statusMessage}</div>
              {convertedDicomUrl && (
                <button
                  onClick={handleViewConverted}
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#1890ff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  View in Viewer
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {error && (
        <div style={{ 
          color: 'red', 
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#fff8f8',
          border: '1px solid #ffcdd2',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ECGViewer;

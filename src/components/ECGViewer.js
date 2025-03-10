import React from 'react';
import {
  DicomECGViewer,
  SOP_CLASS_UIDS,
} from 'ecg-dicom-web-viewer';
import dicomParser from 'dicom-parser';
import ReadECG from '../utils/ReadECG';
import { Card, Space, Typography, Upload, Progress, Row, Col, Button } from 'antd';
import { InboxOutlined, FileImageOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Dragger } = Upload;

const ECGViewer = () => {
  const [error, setError] = React.useState(null);
  const [isConverting, setIsConverting] = React.useState(false);
  const [conversionProgress, setConversionProgress] = React.useState(0);
  const [currentTaskId, setCurrentTaskId] = React.useState(null);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [showProgress, setShowProgress] = React.useState(false);
  const [convertedDicomUrl, setConvertedDicomUrl] = React.useState(null);
  const statusCheckIntervalRef = React.useRef(null);
  const viewerRef = React.useRef(null);
  const containerId = 'ecg-container';

  React.useEffect(() => {
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

  const loadDicomFile = async (arrayBuffer, event) => {
    try {
      const fileName = event?.target?.files?.[0]?.name || 'unknown';
      console.log(`========== Analyzing DICOM File: ${fileName} ==========`);
      
      // 解析DICOM数据以获取详细信息
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);
      
      // 打印关键标签信息
      const transferSyntax = dataSet.string('x00020010');
      const sopClassUid = dataSet.string('x00080016');
      const modality = dataSet.string('x00080060');
      
      console.log('Transfer Syntax:', transferSyntax);
      console.log('SOP Class UID:', sopClassUid);
      console.log('Modality:', modality);
      
      // 获取波形序列
      const waveformSequence = dataSet.elements['x54000100'];
      if (waveformSequence) {
        console.log('WaveformSequence Info:', {
          length: waveformSequence.length,
          items: waveformSequence.items ? waveformSequence.items.length : 0
        });

        // 遍历所有波形序列项
        if (waveformSequence.items) {
          for (let i = 0; i < waveformSequence.items.length; i++) {
            const item = waveformSequence.items[i];
            console.log(`\nAnalyzing Waveform Item ${i}:`, {
              length: item.length,
              dataOffset: item.dataOffset
            });

            // 从序列项中读取波形数据
            const itemData = byteArray.slice(item.dataOffset, item.dataOffset + item.length);
            
            // 打印序列项的前32字节用于分析
            console.log('Item Data Sample:', Array.from(itemData.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));

            // 尝试在序列项中定位波形数据标签(5400,1010)
            let offset = 0;
            while (offset < itemData.length - 8) {
              const group = itemData[offset] + (itemData[offset + 1] << 8);
              const element = itemData[offset + 2] + (itemData[offset + 3] << 8);
              const tag = `(${group.toString(16).padStart(4, '0')},${element.toString(16).padStart(4, '0')})`;

              // 如果是显式VR
              let valueLength;
              let dataStart;
              let vr = '';

              if (transferSyntax === '1.2.840.10008.1.2.1') {
                // 显式VR
                vr = String.fromCharCode(itemData[offset + 4], itemData[offset + 5]);
                if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
                  valueLength = itemData[offset + 8] + 
                              (itemData[offset + 9] << 8) +
                              (itemData[offset + 10] << 16) +
                              (itemData[offset + 11] << 24);
                  dataStart = offset + 12;
                } else {
                  valueLength = itemData[offset + 6] + (itemData[offset + 7] << 8);
                  dataStart = offset + 8;
                }
              } else {
                // 隐式VR
                valueLength = itemData[offset + 4] + 
                            (itemData[offset + 5] << 8) +
                            (itemData[offset + 6] << 16) +
                            (itemData[offset + 7] << 24);
                dataStart = offset + 8;
              }

              console.log(`Found tag ${tag}${vr ? ` (VR: ${vr})` : ''} at offset ${offset}, length ${valueLength}`);

              // 如果找到波形数据标签
              if (group === 0x5400 && element === 0x1010) {
                console.log(`Found waveform data at offset ${offset}, length ${valueLength}`);
                
                const waveformBuffer = itemData.slice(dataStart, dataStart + valueLength);
                console.log('Waveform data sample:', Array.from(waveformBuffer.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));

                const dataView = new DataView(waveformBuffer.buffer, waveformBuffer.byteOffset, waveformBuffer.length);
                const samples = new Int16Array(valueLength / 2);
                
                for (let j = 0; j < samples.length; j++) {
                  samples[j] = dataView.getInt16(j * 2, true);
                }

                const dataAnalysis = {
                  totalSamples: samples.length,
                  firstSamples: Array.from(samples.slice(0, 10)),
                  min: Math.min(...samples),
                  max: Math.max(...samples),
                  meanValue: samples.reduce((a, b) => a + b, 0) / samples.length
                };
                
                console.log(`Waveform Data Analysis:`, dataAnalysis);
                break;
              }

              offset = dataStart + valueLength;
            }
          }
        }
      }

      const container = document.getElementById(containerId);
      if (!container) {
        console.error('Container not found');
        return;
      }

      // 清除现有内容
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // 创建canvas
      const canvas = document.createElement('canvas');
      const canvasId = 'ecg-canvas-' + Date.now();
      canvas.id = canvasId;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);

      // 创建查看器
      console.log('Creating ECG viewer...');
      const viewer = new DicomECGViewer(arrayBuffer, canvasId, 0);
      viewerRef.current = viewer;

      // 加载视图
      console.log('Loading canvas...');
      await viewer.loadCanvas();
      console.log('Canvas loaded successfully');
      
    } catch (error) {
      console.error('加载ECG失败:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setError(`加载ECG失败: ${error.message}`);
    }
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
    <Card style={{ margin: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Title level={4}>ECG 查看器</Title>
        
        <Row gutter={24}>
          <Col span={12}>
            <Card title="上传 DICOM 文件" size="small">
              <Upload
                accept=".dcm"
                showUploadList={false}
                beforeUpload={(file) => {
                  const reader = new FileReader();
                  reader.onload = async (e) => {
                    try {
                      const arrayBuffer = e.target.result;
                      await loadDicomFile(arrayBuffer, { target: { files: [file] } });
                      setError(null);
                    } catch (error) {
                      console.error('读取文件失败:', error);
                      setError(`读取文件失败: ${error.message}`);
                    }
                  };
                  reader.readAsArrayBuffer(file);
                  return false;
                }}
              >
                <div style={{ 
                  padding: '20px',
                  border: '1px dashed #d9d9d9',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 0.3s',
                  ':hover': {
                    borderColor: '#1890ff'
                  }
                }}>
                  <InboxOutlined style={{ fontSize: '24px', color: '#40a9ff', marginBottom: '8px', display: 'block' }} />
                  <div>点击或拖拽上传 DICOM 文件</div>
                </div>
              </Upload>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="上传 CT 扫描图像" size="small">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  const reader = new FileReader();
                  reader.onload = async (e) => {
                    try {
                      await handleCtUpload({ target: { files: [file] } });
                    } catch (error) {
                      console.error('读取文件失败:', error);
                      setError(`读取文件失败: ${error.message}`);
                    }
                  };
                  reader.readAsArrayBuffer(file);
                  return false;
                }}
              >
                <div style={{ 
                  padding: '20px',
                  border: '1px dashed #d9d9d9',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 0.3s',
                  ':hover': {
                    borderColor: '#1890ff'
                  }
                }}>
                  <FileImageOutlined style={{ fontSize: '24px', color: '#40a9ff', marginBottom: '8px', display: 'block' }} />
                  <div>点击或拖拽上传 CT 扫描图像</div>
                </div>
              </Upload>
            </Card>
          </Col>
        </Row>

        {error && (
          <div style={{ color: '#ff4d4f' }}>
            {error}
          </div>
        )}

        {showProgress && (
          <div>
            <Progress 
              percent={conversionProgress} 
              status="active"
              format={() => statusMessage}
            />
            {convertedDicomUrl && (
              <Button
                type="primary"
                onClick={handleViewConverted}
                style={{ marginTop: '16px' }}
              >
                在查看器中打开
              </Button>
            )}
          </div>
        )}

        <div 
          id="ecg-container" 
          style={{ 
            height: '70vh',
            width: '100%',
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#fafafa'
          }}
        />
      </Space>
    </Card>
  );
};

export default ECGViewer;

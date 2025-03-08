import React, { useEffect, useRef, useState } from 'react';
import ReadECG from '../utils/ReadECG';
import { SOP_CLASS_UIDS } from '../constants/Constants';

const ECGViewer = ({ file }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) return;

    console.log('Processing file:', file.name);
    const reader = new FileReader();
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      setError('文件读取错误：' + error.message);
    };

    reader.onload = async (e) => {
      try {
        console.log('File loaded, size:', e.target.result.byteLength);
        const arrayBuffer = e.target.result;
        
        console.log('Creating ECG reader...');
        const ecgReader = new ReadECG(arrayBuffer, '', {
          speed: 25,
          amplitude: 10,
          applyLowPassFilter: true
        });

        console.log('Getting waveform and info...');
        const waveform = ecgReader.getWaveform();
        const info = ecgReader.getInfo();

        if (!ecgReader.elements.SOPClassUID) {
          setError('无法识别的DICOM文件格式');
          return;
        }

        if (!SOP_CLASS_UIDS.includes(ecgReader.elements.SOPClassUID)) {
          setError('此DICOM文件不是ECG类型');
          return;
        }

        if (!waveform) {
          setError('无法读取波形数据');
          return;
        }

        console.log('Drawing ECG...');
        drawECG(waveform, ecgReader.elements.SOPClassUID);
        displayInfo(info, ecgReader.elements);
        setError(null);
      } catch (err) {
        console.error('Error processing ECG:', err);
        setError('处理ECG数据时出错：' + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
  }, [file]);

  const drawECG = (waveform, sopClassUID) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    if (!SOP_CLASS_UIDS.includes(sopClassUID)) {
      ctx.font = '24px Arial';
      ctx.fillText('不兼容的ECG格式', width/2 - 100, height/2);
      return;
    }

    // 绘制网格
    drawGrid(ctx, width, height);

    // 绘制ECG波形
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1.5;

    const scaleY = height / 2000; // 振幅缩放
    const scaleX = width / waveform.length; // 时间缩放

    waveform.forEach((value, index) => {
      const x = index * scaleX;
      const y = height/2 - value * scaleY;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  };

  const drawGrid = (ctx, width, height) => {
    ctx.beginPath();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;

    // 绘制水平线
    for (let y = 0; y < height; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    // 绘制垂直线
    for (let x = 0; x < width; x += 20) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    ctx.stroke();

    // 绘制主网格
    ctx.beginPath();
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;

    for (let y = 0; y < height; y += 100) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    for (let x = 0; x < width; x += 100) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    ctx.stroke();
  };

  const displayInfo = (waveInfo, elements) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    container.innerHTML = '';

    // 患者信息
    const patientInfo = document.createElement('div');
    patientInfo.innerHTML = `
      <h3>患者信息</h3>
      <p>姓名: ${elements.PatientName || '未知'}</p>
      <p>ID: ${elements.PatientID || '未知'}</p>
      <p>性别: ${elements.PatientSex || '未知'}</p>
      <p>检查日期: ${elements.StudyDate || '未知'}</p>
      <p>模态: ${elements.Modality || '未知'}</p>
      <p>SOP Class UID: ${elements.SOPClassUID || '未知'}</p>
    `;
    container.appendChild(patientInfo);

    // 波形信息
    if (waveInfo && waveInfo.length > 0) {
      const waveformInfo = document.createElement('div');
      waveformInfo.innerHTML = `
        <h3>波形信息</h3>
        ${waveInfo.map(info => `<p>${info.key}: ${info.value || '未知'}${info.unit}</p>`).join('')}
      `;
      container.appendChild(waveformInfo);
    }
  };

  return (
    <div className="ecg-viewer">
      {error && (
        <div className="error-message" style={{
          color: 'red',
          marginBottom: '20px',
          padding: '10px',
          border: '1px solid red',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      <div ref={containerRef} className="info-container"></div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          border: '1px solid #ccc',
          marginTop: '20px'
        }}
      />
    </div>
  );
};

export default ECGViewer;

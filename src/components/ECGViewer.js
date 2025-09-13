import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DicomECGViewer,
  SOP_CLASS_UIDS,
} from 'ecg-dicom-web-viewer';
import dicomParser from 'dicom-parser';
import ReadECG from '../utils/ReadECG';
import { Card, Space, Typography, Upload, Progress, Row, Col, Button, message, Select } from 'antd'; // ⭐修改：引入 Select
import { InboxOutlined, FileImageOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import request from '../services/api/request';
import { API_ENDPOINTS, API_BASE_URL } from '../services/api/config';

const { Title } = Typography;
const { Dragger } = Upload;
const { Option } = Select; // ⭐新增

// DICOM tag description mapping
const DICOM_TAG_DESCRIPTIONS = {
  'x00020000': 'File Meta Information Group Length',
  'x00020002': 'Media Storage SOP Class UID',
  'x00020003': 'Media Storage SOP Instance UID',
  'x00020010': 'Transfer Syntax UID',
  'x00080012': 'Instance Creation Date',
  'x00080013': 'Instance Creation Time',
  'x00080016': 'SOP Class UID',
  'x00080018': 'SOP Instance UID',
  'x00080020': 'Study Date',
  'x00080023': 'Content Date',
  'x0008002a': 'Acquisition DateTime',
  'x00080030': 'Study Time',
  'x00080033': 'Content Time',
  'x00080050': 'Accession Number',
  'x00080060': 'Modality',
  'x00080070': 'Manufacturer',
  'x00080080': 'Institution Name',
  'x00080090': 'Referring Physician Name',
  'x00081090': 'Manufacturer Model Name',
  'x00104000': 'AI diagnosis result',
  'x00091011': 'Doctor diagnosis result',
  'x00100010': 'Patient Name',
  'x00100020': 'Patient ID',
  'x00100030': 'Patient Birth Date',
  'x00100040': 'Patient Sex',
  'x00101010': 'Patient Age',
  'x00101020': 'Patient Size',
  'x00101030': 'Patient Weight',
  'x00180015': 'Body Part Examined',
  'x00181000': 'Device Serial Number',
  'x00181020': 'Software Version(s)',
  'x0020000d': 'Study Instance UID',
  'x0020000e': 'Series Instance UID',
  'x00200010': 'Study ID',
  'x00200011': 'Series Number',
  'x00200013': 'Instance Number',
  'x00204000': 'Image Comments',
  'x00280002': 'Samples per Pixel',
  'x00280004': 'Photometric Interpretation',
  'x00280010': 'Rows',
  'x00280011': 'Columns',
  'x00280100': 'Bits Allocated',
  'x00280101': 'Bits Stored',
  'x00280102': 'High Bit',
  'x00280103': 'Pixel Representation',
  'x00400555': 'Acquisition Context Sequence',
  'x54000100': 'Waveform Sequence',
};

// SOP Class UID mapping
const SOP_CLASS_DESCRIPTIONS = {
  '1.2.840.10008.5.1.4.1.1.9.1.1': '12-Lead ECG Waveform Storage',
  '1.2.840.10008.5.1.4.1.1.9.1.2': 'General ECG Waveform Storage',
  '1.2.840.10008.5.1.4.1.1.9.1.3': 'Ambulatory ECG Waveform Storage',
  '1.2.840.10008.5.1.4.1.1.9.2.1': 'Hemodynamic Waveform Storage',
  '1.2.840.10008.5.1.4.1.1.9.3.1': 'Cardiac Electrophysiology Waveform Storage',
  '1.2.840.10008.5.1.4.1.1.9.4.1': 'Basic Voice Audio Waveform Storage',
};

const ECGViewer = () => {
  const { userId, instanceId } = useParams();
  console.log('ECGViewer mounted');
  console.log('URL params:', { userId, instanceId });
  const navigate = useNavigate();
  const [error, setError] = React.useState(null);
  const [isConverting, setIsConverting] = React.useState(false);
  const [conversionProgress, setConversionProgress] = React.useState(0);
  const [currentTaskId, setCurrentTaskId] = React.useState(null);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [showProgress, setShowProgress] = React.useState(false);
  const [convertedDicomUrl, setConvertedDicomUrl] = React.useState(null);
  const [dicomTags, setDicomTags] = React.useState(null);
  const [isDiagnosing, setIsDiagnosing] = React.useState(false);
  const statusCheckIntervalRef = React.useRef(null);
  const viewerRef = React.useRef(null);
  const containerId = 'ecg-container';

  const [selectedLead, setSelectedLead] = React.useState("multiple"); // ⭐新增
  const [dicomArrayBuffer, setDicomArrayBuffer] = React.useState(null); // 保存DICOM数据
  const [waveformData, setWaveformData] = React.useState(null); // 二维数组：[lead][samples]
  const [samplingRate, setSamplingRate] = React.useState(500);
  const [leadNames, setLeadNames] = React.useState([]);
  const [currentCanvasId, setCurrentCanvasId] = React.useState(null); // 保存当前canvas的ID

  // 可调显示参数（参照 Weasis）
  const [mmPerSecond, setMmPerSecond] = React.useState(25); // 速度：25/50 mm/s
  const [mmPerMV, setMmPerMV] = React.useState(10);        // 增益：5/10/20 mm/mV
  const [displayPreset, setDisplayPreset] = React.useState('1x10'); // 1x10 | 2x5 | 4x2.5

  // 解析 WaveformSequence (5400,0100) -> Waveform Data (5400,1010)
  const parseWaveformData = React.useCallback((dataSet, byteArray) => {
    console.log('=== DICOM Waveform Parsing Debug ===');

    const waveformSeq = dataSet.elements['x54000100'];
    if (!waveformSeq || !waveformSeq.items) {
      console.log('No waveform sequence found!');
      return [];
    }

    const transferSyntax = dataSet.string('x00020010') || '';
    const isExplicitVR = transferSyntax.includes('1.2.840.10008.1.2.1'); // Explicit VR Little Endian

    // 读取通道数（导联数），若不可得则默认 12
    const channelCount = dataSet.intString('x003a0001') || 12;
    const samplingRate = dataSet.intString('x003a0005') || 500;

    console.log('DICOM Parsing Info:', {
      transferSyntax,
      isExplicitVR,
      channelCount,
      samplingRate,
      waveformItems: waveformSeq.items.length
    });

    const accumPerLead = Array.from({ length: channelCount }, () => []); // number[] per lead

    const allLeads = [];
    waveformSeq.items.forEach((item, itemIndex) => {
      const itemData = byteArray.slice(item.dataOffset, item.dataOffset + item.length);
      let offset = 0;
      while (offset + 8 <= itemData.length) {
        const group = itemData[offset] + (itemData[offset + 1] << 8);
        const element = itemData[offset + 2] + (itemData[offset + 3] << 8);

        let valueLength = 0;
        let dataStart = 0;
        if (isExplicitVR) {
          const vr = String.fromCharCode(itemData[offset + 4] || 0, itemData[offset + 5] || 0).trim();
          if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
            valueLength = (itemData[offset + 8] | (itemData[offset + 9] << 8) | (itemData[offset + 10] << 16) | (itemData[offset + 11] << 24)) >>> 0;
            dataStart = offset + 12;
          } else {
            valueLength = (itemData[offset + 6] | (itemData[offset + 7] << 8)) >>> 0;
            dataStart = offset + 8;
          }
        } else {
          valueLength = (itemData[offset + 4] | (itemData[offset + 5] << 8) | (itemData[offset + 6] << 16) | (itemData[offset + 7] << 24)) >>> 0;
          dataStart = offset + 8;
        }

        if (group === 0x5400 && element === 0x1010) {
          const end = Math.min(dataStart + valueLength, itemData.length);
          const waveformBuffer = itemData.slice(dataStart, end);
          const dataView = new DataView(
            waveformBuffer.buffer,
            waveformBuffer.byteOffset,
            waveformBuffer.length
          );
          const flat = new Int16Array(Math.floor(waveformBuffer.length / 2));
          for (let j = 0; j < flat.length; j++) {
            flat[j] = dataView.getInt16(j * 2, true);
          }

          // 若为多通道交织，按通道拆分并累积
          if (flat.length % channelCount === 0) {
            const samplesPerLead = flat.length / channelCount;
            for (let c = 0; c < channelCount; c++) {
              for (let k = 0; k < samplesPerLead; k++) {
                accumPerLead[c].push(flat[k * channelCount + c]);
              }
            }
          } else {
            // 无法整除时，按单通道处理为一个导联（退路）
            accumPerLead[0].push(...Array.from(flat));
          }

          console.log(`[WF] Found waveform in item ${itemIndex}:`, {
            samples: flat.length,
            samplesPerLead: flat.length / channelCount,
            duration: (flat.length / channelCount) / samplingRate,
            channelCount,
            samplingRate
          });
          break; // 本 item 完成
        }

        const next = dataStart + valueLength;
        if (next <= offset) break;
        offset = next;
      }

      // Fallback：有些解析器会在 item 上挂载 dataSet，可直接读元素偏移
      if (allLeads.length <= itemIndex && item.dataSet && item.dataSet.elements) {
        const el = item.dataSet.elements['x54001010'];
        if (el && el.length > 0) {
          const start = el.dataOffset;
          const end = start + el.length;
          const wf = byteArray.slice(start, end);
          const dv = new DataView(wf.buffer, wf.byteOffset, wf.length);
          const arr = new Int16Array(Math.floor(wf.length / 2));
          for (let k = 0; k < arr.length; k++) arr[k] = dv.getInt16(k * 2, true);
          if (arr.length % channelCount === 0) {
            const samplesPerLead = arr.length / channelCount;
            for (let c = 0; c < channelCount; c++) {
              for (let k = 0; k < samplesPerLead; k++) {
                accumPerLead[c].push(arr[k * channelCount + c]);
              }
            }
          } else {
            accumPerLead[0].push(...Array.from(arr));
          }
          console.log(`[WF] Fallback used for item ${itemIndex}, samples:`, arr.length);
        }
      }
    });

    // 将累积的 number[] 转成 Int16Array，去掉空导联
    for (let c = 0; c < accumPerLead.length; c++) {
      if (accumPerLead[c].length > 0) {
        allLeads.push(Int16Array.from(accumPerLead[c]));
      }
    }
    console.log('[WF] Final Results:', {
      totalLeads: allLeads.length,
      firstLeadSamples: allLeads[0]?.length,
      duration: allLeads[0] ? (allLeads[0].length / samplingRate).toFixed(2) + 's' : 'N/A',
      samplingRate: samplingRate + 'Hz'
    });

    // 添加每个导联的详细信息
    allLeads.forEach((lead, idx) => {
      if (lead && lead.length > 0) {
        const min = Math.min(...lead);
        const max = Math.max(...lead);
        const range = max - min;
        console.log(`[WF] Lead ${idx}:`, {
          samples: lead.length,
          duration: (lead.length / samplingRate).toFixed(2) + 's',
          min,
          max,
          range,
          amplitude: range > 1000 ? 'Normal' : range > 100 ? 'Low' : 'Very Low'
        });
      }
    });

    return allLeads;
  }, []);

  // 专业ECG单导联绘制 - 参照MedDream样式
  const drawSingleLead = React.useCallback((canvasId, leadIndex, waveformDataToUse = null) => {
    console.log('drawSingleLead called with canvasId:', canvasId, 'leadIndex:', leadIndex);
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.log('Canvas not found:', canvasId);
      return;
    }

    // 检查canvas元素类型
    if (canvas.tagName !== 'CANVAS') {
      console.error('Element is not a canvas:', canvas.tagName, canvas);
      return;
    }

    // 使用传入的waveformData或状态中的waveformData
    const dataToUse = waveformDataToUse || waveformData;
    if (!dataToUse || !dataToUse[leadIndex]) {
      console.log('Waveform data not ready for lead:', leadIndex, 'dataToUse:', dataToUse);
      return;
    }

    console.log('Drawing single lead:', leadIndex, 'with', dataToUse[leadIndex].length, 'samples');

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // 为轴标签预留空间 - 更专业的布局
    const paddingLeft = 80;   // 左侧电压标尺空间
    const paddingBottom = 50; // 底部时间标尺空间
    const paddingTop = 40;    // 顶部导联标签空间
    const paddingRight = 30;  // 右侧空间

    const contentWidth = rect.width - paddingLeft - paddingRight;
    const contentHeight = rect.height - paddingTop - paddingBottom;

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // ECG标准参数 - 由 UI 控制
    const pixelsPerMM = 6;  // 1mm = 6px（固定像素密度）
    const pixelsPerSecond = mmPerSecond * pixelsPerMM;
    const pixelsPerMV = mmPerMV * pixelsPerMM;
    const smallGridSize = pixelsPerMM; // 小网格：6px = 1mm
    const largeGridSize = pixelsPerMM * 5; // 大网格：30px = 5mm

    // 调试信息：验证比例尺
    console.log('ECG Scale Verification:', {
      mmPerSecond,
      mmPerMV,
      pixelsPerMM,
      pixelsPerSecond,
      pixelsPerMV,
      smallGridSize,
      largeGridSize,
      contentWidth,
      contentHeight
    });

    // 背景色 - 类似MedDream的浅色背景
    ctx.fillStyle = '#fefefe';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 计算ECG数据的实际时间范围
    const samples = dataToUse[leadIndex];
    const actualDuration = samples.length / samplingRate;
    // 根据显示格式限制时间窗
    const presetSeconds = displayPreset === '1x10' ? 10 : displayPreset === '2x5' ? 5 : 2.5;
    const maxDisplayTime = Math.min(actualDuration, presetSeconds);
    const maxDisplayX = paddingLeft + maxDisplayTime * pixelsPerSecond;

    // 计算电压轴的实际显示范围（上下1.5mV）
    const centerY = paddingTop + contentHeight / 2;
    const voltageRange = 1.5; // 上下1.5mV
    const minDisplayY = centerY - (voltageRange * pixelsPerMV); // 上边界
    const maxDisplayY = centerY + (voltageRange * pixelsPerMV); // 下边界

    // 绘制ECG网格 - 只在有数据的区域绘制
    ctx.strokeStyle = '#ff6b6b'; // 更鲜艳的红色小网格
    ctx.lineWidth = 0.3;

    // 小网格 (1mm) - 只在1.5mV范围内绘制
    for (let x = paddingLeft; x <= maxDisplayX; x += smallGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, minDisplayY);
      ctx.lineTo(x, maxDisplayY);
      ctx.stroke();
    }
    for (let y = minDisplayY; y <= maxDisplayY; y += smallGridSize) {
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(maxDisplayX, y);
      ctx.stroke();
    }

    // 大网格 (5mm) - 更明显的红色，只在1.5mV范围内绘制
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.8;
    for (let x = paddingLeft; x <= maxDisplayX; x += largeGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, minDisplayY);
      ctx.lineTo(x, maxDisplayY);
      ctx.stroke();
    }
    for (let y = minDisplayY; y <= maxDisplayY; y += largeGridSize) {
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(maxDisplayX, y);
      ctx.stroke();
    }

    // 绘制ECG波形

    // 波形颜色 - 更专业的样式
    ctx.beginPath();
    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let hasMoved = false;
    for (let i = 0; i < samples.length; i++) {
      const t = i / samplingRate;
      const x = paddingLeft + t * pixelsPerSecond;
      if (x > rect.width - paddingRight) break;

      // 转换电压值到像素位置 (注意ECG的Y轴是反向的)
      const voltageMV = samples[i] / 1000; // 转换为mV
      const y = centerY - (voltageMV * pixelsPerMV);

      if (!hasMoved) {
        ctx.moveTo(x, y);
        hasMoved = true;
              } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 添加基线参考线 - 更精细的虚线，只在有数据的区域
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, centerY);
    ctx.lineTo(maxDisplayX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 导联标签 - 更专业的样式
    const leadName = leadNames[leadIndex] || `Lead ${leadIndex + 1}`;
    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(leadName, paddingLeft, paddingTop - 8);

    // 添加时间标尺 - 更精确的刻度
    ctx.fillStyle = '#4a5568';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';

    // 在网格下方绘制时间标记
    const timeScaleY = rect.height - 15;

    // 计算显示的时间范围，基于实际ECG数据长度
    const maxTime = Math.min(actualDuration, 10); // 使用实际ECG数据长度，限制最大显示10秒

    // 智能时间标注 - 根据duration调整密度
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;

    // 简化时间标注 - 直接使用0.2秒间隔
    let timeInterval = 0.2; // 固定0.2秒间隔
    let labelPrecision = 1; // 显示0.1秒精度

    console.log('=== ECG Time Annotation Settings ===');
    console.log('Max Time:', maxTime.toFixed(2), 'seconds');
    console.log('Time Interval:', timeInterval, 'seconds');
    console.log('Label Precision:', labelPrecision, 'decimal places');
    console.log('Total Labels:', Math.ceil(maxTime / timeInterval));
    console.log('=====================================');

    for (let t = 0; t <= maxTime; t += timeInterval) {
      const x = paddingLeft + t * pixelsPerSecond;

      // 只绘制在有数据的范围内的刻度
      if (x >= paddingLeft && x <= maxDisplayX) {
        // 绘制时间标记线
        ctx.beginPath();
        ctx.moveTo(x, rect.height - paddingBottom + 5);
        ctx.lineTo(x, rect.height - paddingBottom + 30);
        ctx.stroke();

        // 绘制时间标签（根据精度显示）
        const timeLabel = labelPrecision === 0 ?
          `${t.toFixed(0)}` :
          `${t.toFixed(labelPrecision)}`;
        ctx.fillText(timeLabel, x, timeScaleY);
      }
    }

    // 智能小网格标注 - 根据大网格间隔调整
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.3;

    // 小网格间隔为大网格的1/5 (0.2/5 = 0.04秒)
    const smallGridInterval = 0.04;

    for (let t = 0; t <= maxTime; t += smallGridInterval) {
      const x = paddingLeft + t * pixelsPerSecond;

      // 只绘制在有数据的范围内且不是大网格线的刻度
      if (x >= paddingLeft && x <= maxDisplayX && Math.abs(t % timeInterval) > 0.01) {
        ctx.beginPath();
        ctx.moveTo(x, rect.height - paddingBottom + 10);
        ctx.lineTo(x, rect.height - paddingBottom + 25);
        ctx.stroke();
      }
    }

    // 添加电压标尺 - 更精确的刻度
    ctx.textAlign = 'right';
    ctx.font = '11px Arial, sans-serif';

    // 在网格左侧绘制电压标记
    const voltageScaleX = 45;

    // 使用之前定义的电压范围

    // 标注所有大网格线（每0.5mV间隔）
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    for (let voltage = -voltageRange; voltage <= voltageRange; voltage += 0.5) { // 0.5mV间隔
      const y = centerY - (voltage * pixelsPerMV);

      // 只绘制在1.5mV范围内的刻度
      if (y >= minDisplayY && y <= maxDisplayY) {
        // 绘制电压标记线
        ctx.beginPath();
        ctx.moveTo(paddingLeft - 6, y);
        ctx.lineTo(paddingLeft, y);
        ctx.stroke();

        // 绘制电压标签（每0.5mV显示一次）
        const voltageText = voltage === 0 ? '0' :
          voltage > 0 ? `+${voltage.toFixed(1)}` :
            `${voltage.toFixed(1)}`;
        ctx.fillText(voltageText, voltageScaleX, y + 3);
      }
    }

    // 标注小网格线（每0.1mV间隔）
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.3;
    for (let voltage = -voltageRange; voltage <= voltageRange; voltage += 0.1) { // 0.1mV间隔
      const y = centerY - (voltage * pixelsPerMV);

      // 只绘制在1.5mV范围内且不是大网格线的刻度
      if (y >= minDisplayY && y <= maxDisplayY && Math.abs(voltage % 0.5) > 0.01) {
        ctx.beginPath();
        ctx.moveTo(paddingLeft - 3, y);
        ctx.lineTo(paddingLeft, y);
        ctx.stroke();
      }
    }

    // 绘制基线（0mV）的特殊标记
    ctx.beginPath();
    ctx.moveTo(paddingLeft - 6, centerY);
    ctx.lineTo(paddingLeft, centerY);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 添加轴标签 - 更专业的样式
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#2d3748';

    // Y轴标签（电压）
    ctx.save();
    ctx.translate(45, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Amplitude (mV)', 0, 0);
    ctx.restore();

    // X轴标签（时间）
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', paddingLeft + contentWidth / 2, rect.height - 5);

    console.log('Single lead drawn successfully for lead:', leadIndex);
  }, [waveformData, samplingRate, leadNames]);
  // 加载DICOM文件的函数 - 使用 useCallback 优化
  const loadDicomFile = React.useCallback(async (arrayBuffer, event) => {
    try {
      const fileName = event?.target?.files?.[0]?.name || 'unknown';
      console.log(`========== Analyzing DICOM File: ${fileName} ==========`);

      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const transferSyntax = dataSet.string('x00020010');
      const sopClassUid = dataSet.string('x00080016');
      const modality = dataSet.string('x00080060');

      console.log('Transfer Syntax:', transferSyntax);
      console.log('SOP Class UID:', sopClassUid);
      console.log('Modality:', modality);

      const container = document.getElementById(containerId);
      if (!container) {
        console.error('Container not found');
        return;
      }

      // 清理之前的遮罩层
      const existingOverlay = document.getElementById('lead-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      const canvas = document.createElement('canvas');
      const canvasId = 'ecg-canvas-' + Date.now();
      canvas.id = canvasId;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.border = '1px solid #e9ecef';
      canvas.style.borderRadius = '8px';
      canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      canvas.style.background = '#fefefe';
      container.appendChild(canvas);
      setCurrentCanvasId(canvasId); // 保存canvas ID到状态

      console.log('Creating ECG viewer...');
      const leadIndex = selectedLead === "multiple" ? 0 : parseInt(selectedLead); // ⭐新增
      const leadDisplayNames = ['Lead I', 'Lead II', 'Lead III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
      const nameView = selectedLead === "multiple" ? '' : (leadDisplayNames[leadIndex] || '');
      console.log('Lead index:', leadIndex, 'Selected lead:', selectedLead, 'nameView:', nameView);

      if (selectedLead === "multiple") {
        // Multiple模式：使用DicomECGViewer
      const viewer = new DicomECGViewer(arrayBuffer, canvasId, 0);
      viewerRef.current = viewer;
        console.log('Viewer created:', viewer);

        // 为了比较数据一致性，也解析一下数据
        const parentByteArray = new Uint8Array(arrayBuffer);
        const parentDataSet = dicomParser.parseDicom(parentByteArray);
        const parsedLeads = parseWaveformData(parentDataSet, parentByteArray);

        console.log('Multiple lead mode - parsed data for comparison:', {
          totalLeads: parsedLeads.length,
          leadSamples: parsedLeads.map((lead, idx) => ({
            lead: idx,
            samples: lead.length,
            firstFew: lead.slice(0, 10)
          }))
        });

      console.log('Loading canvas...');
        try {
          console.log('Loading ECG canvas...');
      await viewer.loadCanvas();
      console.log('Canvas loaded successfully');
        } catch (loadError) {
          console.error('Error loading canvas:', loadError);
          setError(`Failed to load canvas: ${loadError.message}`);
        }
      } else {
        // Single模式：使用简化的手工解析（隐式长度 4 字节），解析所有导联
        console.log('Single lead mode selected, parsing waveform for lead:', leadIndex, '(', nameView, ')');
        const parentByteArray = new Uint8Array(arrayBuffer);
        const parentDataSet = dicomParser.parseDicom(parentByteArray);

        const sr = parentDataSet.intString('x003a0005') || 500;
        setSamplingRate(sr);
        const leadNameStr = parentDataSet.string('x003a0004');
        const names = leadNameStr ? leadNameStr.split('\\') : leadDisplayNames;
        setLeadNames(names);

        const parsedLeads = parseWaveformData(parentDataSet, parentByteArray);
        if (parsedLeads && parsedLeads.length > 0) {
          setWaveformData(parsedLeads);

          // 添加调试信息，确保数据一致性
          console.log('Single lead parsed data:', {
            leadIndex,
            leadName: nameView,
            totalLeads: parsedLeads.length,
            currentLeadSamples: parsedLeads[leadIndex]?.length,
            samplingRate: sr,
            firstFewSamples: parsedLeads[leadIndex]?.slice(0, 10)
          });

          // 使用setTimeout确保状态更新后再绘制
      setTimeout(() => {
            drawSingleLead(canvasId, leadIndex, parsedLeads);
          }, 0);
        } else {
          setError('No waveform data found for single lead rendering');
        }
      }

    } catch (error) {
      console.error('Failed to load ECG:', error);
      setError(`Failed to load ECG: ${error.message}`);
    }
  }, [selectedLead, setError]);

  React.useEffect(() => {
    const loadInstanceFromOrthanc = async () => {
      try {
        setError(null);
        console.log('Starting to load ECG file...');

        console.log('Fetching ECG file for user:', userId, 'instance:', instanceId);
        const response = await request.get(
          API_ENDPOINTS.ECG_INSTANCE(userId, instanceId),
          { responseType: 'arraybuffer' }
        );

        console.log('Array buffer received, loading DICOM file...');
        const byteArray = new Uint8Array(response);
        const dataSet = dicomParser.parseDicom(byteArray);

        // Collect all DICOM tags
        const tags = {};
        for (let tag in dataSet.elements) {
          const element = dataSet.elements[tag];
          if (element.items) {
            tags[tag] = 'Sequence with ' + element.items.length + ' items';
          } else {
            try {
              const value = dataSet.string(tag);
              if (value) {
                tags[tag] = value;
              }
            } catch (e) {
              console.log('Could not read tag:', tag, e);
            }
          }
        }
        setDicomTags(tags);
        setDicomArrayBuffer(response); // 保存arrayBuffer用于后续重新加载


        await loadDicomFile(response);
        console.log('DICOM file loaded successfully');
      } catch (error) {
        console.error('Detailed error:', {
        message: error.message,
          stack: error.stack,
          name: error.name,
          response: error.response
        });
        message.error(error.message || 'Failed to load ECG file');
        setError(error.message || 'Failed to load ECG file');
      }
    };

    if (instanceId) {
      loadInstanceFromOrthanc();
    }

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
  }, [instanceId, loadDicomFile, userId]); // 只在instanceId变化时重新加载

  // 单独处理selectedLead变化
  React.useEffect(() => {
    if (dicomArrayBuffer) {
      console.log('Lead changed, reloading ECG with new lead:', selectedLead);
      loadDicomFile(dicomArrayBuffer);
    }
  }, [selectedLead, dicomArrayBuffer, loadDicomFile]);

  // 当waveformData更新且selectedLead为single模式时，重新绘制
  React.useEffect(() => {
    if (waveformData && selectedLead !== "multiple" && selectedLead !== null && currentCanvasId) {
      const leadIndex = parseInt(selectedLead);
      if (!isNaN(leadIndex)) {
        console.log('WaveformData updated, redrawing single lead:', leadIndex, 'canvasId:', currentCanvasId);
        // 使用setTimeout确保DOM已更新
        setTimeout(() => {
          drawSingleLead(currentCanvasId, leadIndex, waveformData);
        }, 100);
      }
    }
  }, [waveformData, selectedLead, currentCanvasId, drawSingleLead]);



  const handleCtUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsConverting(true);
    setError(null);
    setConversionProgress(0);
    setShowProgress(true);
    setConvertedDicomUrl(null); // Reset URL

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadResponse = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      const taskId = uploadData.task_id;
      setCurrentTaskId(taskId);
      setStatusMessage(`File uploaded, processing...\nTask ID: ${taskId}`);

      // Clear previous timer
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }

      // Set new timer
      statusCheckIntervalRef.current = setInterval(() => {
        fetch(`http://localhost:8000/status/${taskId}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to get status: ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('Status check response:', data);

            let statusText = `Status: ${data.status}\n`;
            if (data.message) {
              statusText += `Message: ${data.message}\n`;
            }
            if (data.error) {
              statusText += `Error: ${data.error}\n`;
              throw new Error(data.error);
            }
            setStatusMessage(statusText);

            if (data.status === 'completed') {
              // Clear timer immediately
              if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
                statusCheckIntervalRef.current = null;
              }

              if (data.dicom_files && data.dicom_files.length > 0) {
                const downloadUrl = `http://localhost:8000/download/${taskId}/${data.dicom_files[0]}`;
                console.log('Set download URL:', downloadUrl);
                setConvertedDicomUrl(downloadUrl);
                statusText += `\nConversion completed!\n`;
                statusText += `File download URL: ${downloadUrl}\n`;
                setStatusMessage(statusText);
                setConversionProgress(100);
                setIsConverting(false);
              } else {
                console.error('No dicom_files field or empty:', data);
                setError('Server did not return DICOM file information');
              }
            } else if (data.status === 'processing') {
              setConversionProgress(50);
            } else if (data.status === 'failed') {
              // Handle failed status
              if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
                statusCheckIntervalRef.current = null;
              }
              setError(`Conversion failed: ${data.error || 'Unknown error'}`);
              setIsConverting(false);
            }
          })
          .catch(error => {
            console.error('Status check failed:', error);
            setStatusMessage(`Error: ${error.message}`);
            setShowProgress(false);
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
            setIsConverting(false);
            setConversionProgress(0);
          });
      }, 1000);

    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
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
        throw new Error(`Download failed: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      await loadDicomFile(buffer);
      setError(null);
    } catch (error) {
      console.error('Failed to load DICOM file:', error);
      setError(`Failed to load DICOM file: ${error.message}`);
    }
  };

  // Update AI diagnosis and redirect to new instance if returned
  const handleGetDiagnosis = async () => {
    if (!userId || !instanceId) {
      message.error('Missing user ID or instance ID');
      return;
    }

    try {
      setIsDiagnosing(true);
      message.loading('Generating new AI diagnosis...', 0);

      const url = `${API_ENDPOINTS.ECG}/${userId}/instances/${instanceId}/diagnose`;
      const data = await request.post(url);

      if (data) {
        message.success('AI diagnosis updated successfully');

        if (data.instance_id && String(data.instance_id) !== String(instanceId)) {
          message.info('Redirecting to new diagnosis instance...');
    setTimeout(() => {
            navigate(`/ecg-view/${userId}/${data.instance_id}`);
    }, 500);
        }
      }
    } catch (error) {
      let errorMessage = 'Failed to get AI diagnosis';
      if (error.response?.status === 404) {
        errorMessage = 'ECG instance not found. Please check the file and try again.';
      } else if (error.response?.status === 500) {
        errorMessage = 'AI diagnosis service temporarily unavailable. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      message.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsDiagnosing(false);
      message.destroy();
    }
  };

  return (
    <Card
      title={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            type="link"
            onClick={() => navigate(-1)}
          />
          <span>ECG Viewer</span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">

        {/* ⭐新增：导联选择器 */}
        <div>
          <span style={{ marginRight: 8 }}>Select Lead:</span>
          <Select
            value={selectedLead}
            style={{ width: 200 }}
            onChange={setSelectedLead}
          >
            <Option value="multiple">Multiple (12 leads)</Option>
            <Option value="0">Lead I</Option>
            <Option value="1">Lead II</Option>
            <Option value="2">Lead III</Option>
            <Option value="3">aVR</Option>
            <Option value="4">aVL</Option>
            <Option value="5">aVF</Option>
            <Option value="6">V1</Option>
            <Option value="7">V2</Option>
            <Option value="8">V3</Option>
            <Option value="9">V4</Option>
            <Option value="10">V5</Option>
            <Option value="11">V6</Option>
          </Select>
          </div>

        {/* Weasis-like 参数控制 */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div>
            <span style={{ marginRight: 8 }}>Speed (mm/s):</span>
            <Select value={mmPerSecond} style={{ width: 120 }} onChange={setMmPerSecond}>
              <Option value={25}>25</Option>
              <Option value={50}>50</Option>
            </Select>
        </div>
          <div>
            <span style={{ marginRight: 8 }}>Gain (mm/mV):</span>
            <Select value={mmPerMV} style={{ width: 120 }} onChange={setMmPerMV}>
              <Option value={5}>5</Option>
              <Option value={10}>10</Option>
              <Option value={20}>20</Option>
            </Select>
        </div>
          <div>
            <span style={{ marginRight: 8 }}>Display format:</span>
            <Select value={displayPreset} style={{ width: 160 }} onChange={setDisplayPreset}>
              <Option value="1x10">1 x 10s</Option>
              <Option value="2x5">2 x 5s</Option>
              <Option value="4x2.5">4 x 2.5s</Option>
            </Select>
      </div>
      </div>
      
        {/* ECG参数显示 - 参照MedDream样式 */}
        {selectedLead !== "multiple" && waveformData && (
          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            marginBottom: '16px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '16px' }}>
              ECG Parameters - {leadNames[parseInt(selectedLead)] || `Lead ${parseInt(selectedLead) + 1}`}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6c757d' }}>Sampling Rate:</span>
                <span style={{ fontWeight: 'bold', color: '#495057' }}>{samplingRate} Hz</span>
      </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6c757d' }}>Duration:</span>
                <span style={{ fontWeight: 'bold', color: '#495057' }}>
                  {waveformData[parseInt(selectedLead)] ?
                    (waveformData[parseInt(selectedLead)].length / samplingRate).toFixed(1) + 's' :
                    'N/A'
                  }
                </span>
      </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6c757d' }}>Samples:</span>
                <span style={{ fontWeight: 'bold', color: '#495057' }}>
                  {waveformData[parseInt(selectedLead)] ?
                    waveformData[parseInt(selectedLead)].length.toLocaleString() :
                    'N/A'
                  }
        </span>
      </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6c757d' }}>Scale:</span>
                <span style={{ fontWeight: 'bold', color: '#495057' }}>10mm/mV</span>
      </div>
      </div>
      </div>
        )}


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
                Open in viewer
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

        {dicomTags && (
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>AI Diagnosis Result</span>
                {!dicomTags['x00104000'] && (
                  <Button
                    type="primary"
                    size="middle"
                    onClick={handleGetDiagnosis}
                    loading={isDiagnosing}
                    style={{ marginLeft: '12px' }}
                  >
                    Update Diagnose
                  </Button>
                )}
                </div>
            }
            style={{ marginTop: '20px' }}
          >
            {dicomTags['x00104000'] ? (
            <Row gutter={16}>
              <Col span={12}>
                <Card type="inner" title="1D Model Results">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                        {(dicomTags['x00104000']?.split(' | ')[0] || "")
                          .split('; ')
                          .filter(Boolean)
                          .map(item => {
                        const [type, prob] = item.split(':');
                        return (
                          <tr key={type}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{type}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                                  {prob ? `${(parseFloat(prob) * 100).toFixed(1)}%` : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </Col>
              <Col span={12}>
                <Card type="inner" title="ResNet Top5 Results">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                        {(dicomTags['x00104000']?.split(' | ')[1] || "")
                          .replace('ResNet Top5: ', '')
                          .split('; ')
                          .filter(Boolean)
                          .map(item => {
                        const [type, prob] = item.split(':');
                        return (
                          <tr key={type}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{type}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                                  {prob ? `${(parseFloat(prob) * 100).toFixed(1)}%` : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </Col>
            </Row>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No AI diagnosis available for this ECG file.
              </div>
            )}
          </Card>
        )}

        {dicomTags && (
          <Card title="DICOM Tags" style={{ marginTop: '20px' }}>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Tag</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(dicomTags).map(([tag, value]) => (
                    <tr key={tag}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{tag}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                        {DICOM_TAG_DESCRIPTIONS[tag] || 'Unknown'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', wordBreak: 'break-all' }}>
                        {tag === 'x00080016' ? (
                          <>
                            {value}
                            <br />
                            <small style={{ color: '#666' }}>
                              {SOP_CLASS_DESCRIPTIONS[value] || 'Unknown SOP Class'}
                            </small>
                          </>
                        ) : value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Space>
    </Card>
  );
};

export default ECGViewer;

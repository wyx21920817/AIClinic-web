import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DicomECGViewer } from 'ecg-dicom-web-viewer';
import dicomParser from 'dicom-parser';
import { Card, Space, Typography, Upload, Progress, Row, Col, Button, message, Select } from 'antd'; // ⭐ Modified: Import Select component
import { InboxOutlined, FileImageOutlined, ArrowLeftOutlined, ExperimentOutlined } from '@ant-design/icons';
import request from '../services/api/request';
import { API_ENDPOINTS } from '../services/api/config';

const { Title } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

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
  const navigate = useNavigate();
  const [error, setError] = React.useState(null);
  const [conversionProgress, setConversionProgress] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [showProgress, setShowProgress] = React.useState(false);
  const [convertedDicomUrl, setConvertedDicomUrl] = React.useState(null);
  const [dicomTags, setDicomTags] = React.useState(null);
  const [isDiagnosing, setIsDiagnosing] = React.useState(false);
  const statusCheckIntervalRef = React.useRef(null);
  const viewerRef = React.useRef(null);
  const containerId = 'ecg-container';

  const [selectedLead, setSelectedLead] = React.useState("multiple"); // ⭐ New addition
  const [dicomArrayBuffer, setDicomArrayBuffer] = React.useState(null); // Store DICOM data
  const [waveformData, setWaveformData] = React.useState(null); // 2D array: [lead][samples]
  const [samplingRate, setSamplingRate] = React.useState(500);
  const [leadNames, setLeadNames] = React.useState([]);
  const [currentCanvasId, setCurrentCanvasId] = React.useState(null); // Store current canvas ID
  const [selectedDiseasesXAI, setSelectedDiseasesXAI] = React.useState([]);

  // Adjustable display parameters (reference Weasis)
  const [mmPerSecond, setMmPerSecond] = React.useState(25); // Speed: 25/50 mm/s
  const [mmPerMV, setMmPerMV] = React.useState(10);        // Gain: 5/10/20 mm/mV
  const [displayPreset, setDisplayPreset] = React.useState('1x10'); // 1x10 | 2x5 | 4x2.5


  const parseWaveformData = React.useCallback((dataSet, byteArray, onSamplingRateChange) => {

    const waveformSeq = dataSet.elements['x54000100'];
    if (!waveformSeq || !waveformSeq.items) {
      return [];
    }

    const transferSyntax = dataSet.string('x00020010') || '';
    const isExplicitVR = transferSyntax.includes('1.2.840.10008.1.2.1');


    let channelCount = 12;
    let samplingRate = 500;
    let samplesPerChannel = 0;


    if (waveformSeq.items.length > 0) {
      const firstItem = waveformSeq.items[0];
      const itemData = byteArray.slice(firstItem.dataOffset, firstItem.dataOffset + firstItem.length);


      let offset = 0;
      while (offset + 8 <= itemData.length) {
        const group = itemData[offset] + (itemData[offset + 1] << 8);
        const element = itemData[offset + 2] + (itemData[offset + 3] << 8);

        if (group === 0x003A && element === 0x0200) {
          // ChannelDefinitionSequence
          const seqLength = itemData[offset + 4] + (itemData[offset + 5] << 8) + (itemData[offset + 6] << 16) + (itemData[offset + 7] << 24);
          break;
        }
        offset += 8;
      }
    }


    channelCount = dataSet.intString('x003a0001') || 12;
    samplingRate = dataSet.intString('x003a0005') || 500;
    samplesPerChannel = dataSet.intString('x003a0010') || 0;


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

          // If multi-channel interleaved, split by channel and accumulate
          if (flat.length % channelCount === 0) {
            const samplesPerLead = flat.length / channelCount;
            for (let c = 0; c < channelCount; c++) {
              for (let k = 0; k < samplesPerLead; k++) {
                accumPerLead[c].push(flat[k * channelCount + c]);
              }
            }
          } else {
            // When not evenly divisible, process as single channel for one lead (fallback)
            accumPerLead[0].push(...Array.from(flat));
          }

          break; // This item completed
        }

        const next = dataStart + valueLength;
        if (next <= offset) break;
        offset = next;
      }

      // Fallback: Some parsers mount dataSet on item, can directly read element offset
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
        }
      }
    });

    // Convert accumulated number[] to Int16Array, remove empty leads
    for (let c = 0; c < accumPerLead.length; c++) {
      if (accumPerLead[c].length > 0) {
        allLeads.push(Int16Array.from(accumPerLead[c]));
      }
    }

    // Add detailed information for each lead
    allLeads.forEach((lead, idx) => {
      if (lead && lead.length > 0) {
        const min = Math.min(...lead);
        const max = Math.max(...lead);
        const range = max - min;
      }
    });


    if (allLeads.length > 0 && allLeads[0].length > 0) {
      const actualSamples = allLeads[0].length;
      const actualDuration = actualSamples / samplingRate;



      if (actualSamples < 3000 && actualDuration < 10) {
        const originalSamplingRate = samplingRate;
        const newSamplingRate = 100;
        const newDuration = actualSamples / newSamplingRate;



        if (onSamplingRateChange) {
          onSamplingRateChange(newSamplingRate);
        }
      }
    }

    return allLeads;
  }, []);

  // Professional ECG single lead rendering - reference MedDream style

  const drawSingleLead = React.useCallback((canvasId, leadIndex, waveformDataToUse = null) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return;
    }

    if (canvas.tagName !== 'CANVAS') {
      return;
    }

    const dataToUse = waveformDataToUse || waveformData;
    if (!dataToUse || !dataToUse[leadIndex]) {
      return;
    }

    const samples = dataToUse[leadIndex];

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // 🔥 Weasis标准布局参数
    const paddingLeft = 80;
    const paddingBottom = 50;
    const paddingTop = 40;
    const paddingRight = 30;

    const contentWidth = rect.width - paddingLeft - paddingRight;
    const contentHeight = rect.height - paddingTop - paddingBottom;

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);


    const pixelsPerMM = 5;  // 1mm = 5px (Weasis标准)
    const pixelsPerSecond = mmPerSecond * pixelsPerMM; // 25mm/s * 5px/mm = 125px/s
    const pixelsPerMV = mmPerMV * pixelsPerMM;         // 10mm/mV * 5px/mm = 50px/mV


    const smallGridTime = 0.04;
    const largeGridTime = 0.2;
    const smallGridVoltage = 0.1;
    const largeGridVoltage = 0.5;

    const smallGridSizeX = smallGridTime * pixelsPerSecond; // 0.04s * 125px/s = 5px
    const largeGridSizeX = largeGridTime * pixelsPerSecond; // 0.2s * 125px/s = 25px
    const smallGridSizeY = smallGridVoltage * pixelsPerMV;  // 0.1mV * 50px/mV = 5px
    const largeGridSizeY = largeGridVoltage * pixelsPerMV;  // 0.5mV * 50px/mV = 25px


    ctx.fillStyle = '#fefefe';
    ctx.fillRect(0, 0, rect.width, rect.height);


    const actualDuration = samples.length / samplingRate;
    let targetDuration = 10;
    let displayDuration = targetDuration;


    if (actualDuration < 10) {
      displayDuration = actualDuration;
    } else if (actualDuration > 10) {
      displayDuration = 10;
    }

    const maxDisplayX = paddingLeft + displayDuration * pixelsPerSecond;


    const requiredWidth = maxDisplayX + paddingRight;
    const actualWidth = rect.width;



    const centerY = paddingTop + contentHeight / 2;

    // 计算实际数据的电压范围
    const actualMinVoltage = Math.min(...samples) / 1000; // 转换为mV
    const actualMaxVoltage = Math.max(...samples) / 1000; // 转换为mV

    // 智能调整电压范围：根据实际数据的最小值和最大值分别调整
    let minVoltage, maxVoltage;

    // 调整最小值范围：向下取整到0.5mV的倍数，但至少-1.5mV
    minVoltage = Math.min(-1.5, Math.floor(actualMinVoltage / 0.5) * 0.5);

    // 调整最大值范围：向上取整到0.5mV的倍数，但至少+1.5mV
    maxVoltage = Math.max(1.5, Math.ceil(actualMaxVoltage / 0.5) * 0.5);

    // 计算电压范围（用于网格绘制）
    const voltageRange = Math.max(Math.abs(minVoltage), maxVoltage);

    const gridPaddingFactor = 0.8;
    const extendedPixelsPerMV = pixelsPerMV * (1 + gridPaddingFactor);

    // 使用实际的minVoltage和maxVoltage计算显示范围，避免多余空白
    const minDisplayY = centerY - (maxVoltage * extendedPixelsPerMV);
    const maxDisplayY = centerY - (minVoltage * extendedPixelsPerMV);



    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.7;

    // 时间轴小网格 (0.04秒)
    for (let x = paddingLeft; x <= maxDisplayX; x += smallGridSizeX) {
      ctx.beginPath();
      ctx.moveTo(x, minDisplayY);
      ctx.lineTo(x, maxDisplayY);
      ctx.stroke();
    }


    const extendedSmallGridSizeY = smallGridVoltage * extendedPixelsPerMV;
    // 只绘制实际数据范围内的网格
    for (let voltage = minVoltage; voltage <= maxVoltage; voltage += smallGridVoltage) {
      const y = centerY - (voltage * extendedPixelsPerMV);
      if (y >= minDisplayY && y <= maxDisplayY) {
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(maxDisplayX, y);
        ctx.stroke();
      }
    }


    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 1.0;


    for (let x = paddingLeft; x <= maxDisplayX; x += largeGridSizeX) {
      ctx.beginPath();
      ctx.moveTo(x, minDisplayY);
      ctx.lineTo(x, maxDisplayY);
      ctx.stroke();
    }


    // 只绘制实际数据范围内的大网格
    for (let voltage = minVoltage; voltage <= maxVoltage; voltage += largeGridVoltage) {
      const y = centerY - (voltage * extendedPixelsPerMV);
      if (y >= minDisplayY && y <= maxDisplayY) {
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(maxDisplayX, y);
        ctx.stroke();
      }
    }


    ctx.globalAlpha = 1.0;


    ctx.beginPath();
    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let hasMoved = false;

    for (let i = 0; i < samples.length; i++) {

      const t = i / samplingRate;
      const x = paddingLeft + t * pixelsPerSecond;


      if (x > maxDisplayX) break;


      const voltageMV = samples[i] / 1000; // 转换为mV
      const y = centerY - (voltageMV * extendedPixelsPerMV);

      if (!hasMoved) {
        ctx.moveTo(x, y);
        hasMoved = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();


    // Add baseline reference line - finer dashed line, only in data area
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, centerY);
    ctx.lineTo(maxDisplayX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Lead label - more professional style
    const leadName = leadNames[leadIndex] || `Lead ${leadIndex + 1}`;
    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(leadName, paddingLeft, paddingTop - 8);


    ctx.fillStyle = '#4a5568';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';


    const timeScaleY = rect.height - paddingBottom + 5; // 贴着横轴边


    const timeInterval = 0.2;
    const maxTime = displayDuration;



    // 绘制横轴时间标签 - 直接在横轴位置标记
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#4a5568';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';

    for (let t = 0; t <= maxTime; t += timeInterval) {
      const x = paddingLeft + t * pixelsPerSecond;

      if (x >= paddingLeft && x <= maxDisplayX) {
        // 绘制时间标签 - 在ECG波形最下方
        const timeLabel = t.toFixed(1);
        ctx.fillText(timeLabel, x, maxDisplayY + 20);
      }
    }



    ctx.textAlign = 'right';
    ctx.font = '11px Arial, sans-serif';


    const voltageScaleX = 45;


    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;

    // 使用计算出的电压范围绘制标签
    for (let voltage = minVoltage; voltage <= maxVoltage; voltage += 0.5) { // 0.5mV间隔
      const y = centerY - (voltage * extendedPixelsPerMV);

      // 只绘制在显示范围内的标签
      if (y >= minDisplayY && y <= maxDisplayY) {
        // 绘制电压标记线
        ctx.beginPath();
        ctx.moveTo(paddingLeft - 6, y);
        ctx.lineTo(paddingLeft, y);
        ctx.stroke();

        // 绘制电压标签
        const voltageText = voltage === 0 ? '0' :
          voltage > 0 ? `+${voltage.toFixed(1)}` :
            `${voltage.toFixed(1)}`;
        ctx.fillText(voltageText, paddingLeft - 10, y + 3);
      }
    }

    // Mark small grid lines (every 0.1mV interval)
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.3;
    for (let voltage = -voltageRange; voltage <= voltageRange; voltage += 0.1) { // 0.1mV interval
      const y = centerY - (voltage * extendedPixelsPerMV);

      // Only draw markings within 1.5mV range and not large grid lines
      if (y >= minDisplayY && y <= maxDisplayY && Math.abs(voltage % 0.5) > 0.01) {
        ctx.beginPath();
        ctx.moveTo(paddingLeft - 3, y);
        ctx.lineTo(paddingLeft, y);
        ctx.stroke();
      }
    }

    // Draw special marking for baseline (0mV)
    ctx.beginPath();
    ctx.moveTo(paddingLeft - 6, centerY);
    ctx.lineTo(paddingLeft, centerY);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add axis labels - more professional style
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#2d3748';

    // Y-axis label (voltage)
    ctx.save();
    ctx.translate(25, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Amplitude (mV)', 0, 0);
    ctx.restore();

    // X-axis label (time) - 在ECG波形最下方
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', paddingLeft + contentWidth / 2, maxDisplayY + 35); // 在时间标签下方

  }, [waveformData, samplingRate, leadNames]);
  // Function to load DICOM file - optimized with useCallback
  const loadDicomFile = React.useCallback(async (arrayBuffer, event) => {
    try {
      const fileName = event?.target?.files?.[0]?.name || 'unknown';

      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const transferSyntax = dataSet.string('x00020010');
      const sopClassUid = dataSet.string('x00080016');
      const modality = dataSet.string('x00080060');


      const container = document.getElementById(containerId);
      if (!container) {
        return;
      }

      // Clear previous overlay
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
      setCurrentCanvasId(canvasId); // Save canvas ID to state

      const leadIndex = selectedLead === "multiple" ? 0 : parseInt(selectedLead); // ⭐ New addition
      const leadDisplayNames = ['Lead I', 'Lead II', 'Lead III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
      const nameView = selectedLead === "multiple" ? '' : (leadDisplayNames[leadIndex] || '');

      if (selectedLead === "multiple") {
        // Multiple mode: use DicomECGViewer
        const viewer = new DicomECGViewer(arrayBuffer, canvasId, 0);
        viewerRef.current = viewer;

        // Also parse data for comparison of data consistency
        const parentByteArray = new Uint8Array(arrayBuffer);
        const parentDataSet = dicomParser.parseDicom(parentByteArray);
        const parsedLeads = parseWaveformData(parentDataSet, parentByteArray, setSamplingRate);


        try {
          await viewer.loadCanvas();
        } catch (loadError) {
          setError(`Failed to load canvas: ${loadError.message}`);
        }
      } else {
        // Single mode: use simplified manual parsing (implicit length 4 bytes), parse all leads
        const parentByteArray = new Uint8Array(arrayBuffer);
        const parentDataSet = dicomParser.parseDicom(parentByteArray);

        const sr = parentDataSet.intString('x003a0005') || 500;
        setSamplingRate(sr);
        const leadNameStr = parentDataSet.string('x003a0004');
        const names = leadNameStr ? leadNameStr.split('\\') : leadDisplayNames;
        setLeadNames(names);

        const parsedLeads = parseWaveformData(parentDataSet, parentByteArray, setSamplingRate);
        if (parsedLeads && parsedLeads.length > 0) {
          setWaveformData(parsedLeads);


          // Use setTimeout to ensure drawing after state update
          setTimeout(() => {
            drawSingleLead(canvasId, leadIndex, parsedLeads);
          }, 0);
        } else {
          setError('No waveform data found for single lead rendering');
        }
      }

    } catch (error) {
      setError(`Failed to load ECG: ${error.message}`);
    }
  }, [selectedLead, setError]);

  React.useEffect(() => {
    const loadInstanceFromOrthanc = async () => {
      try {
        setError(null);

        const response = await request.get(
          API_ENDPOINTS.ECG_INSTANCE(userId, instanceId),
          { responseType: 'arraybuffer' }
        );

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
            }
          }
        }
        setDicomTags(tags);
        setDicomArrayBuffer(response); // Save arrayBuffer for subsequent reloading


        await loadDicomFile(response);
      } catch (error) {
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
  }, [instanceId, loadDicomFile, userId]); // Only reload when instanceId changes

  // Handle selectedLead changes separately
  React.useEffect(() => {
    if (dicomArrayBuffer) {
      loadDicomFile(dicomArrayBuffer);
    }
  }, [selectedLead, dicomArrayBuffer, loadDicomFile]);

  // Redraw when waveformData updates and selectedLead is in single mode
  React.useEffect(() => {
    if (waveformData && selectedLead !== "multiple" && selectedLead !== null && currentCanvasId) {
      const leadIndex = parseInt(selectedLead);
      if (!isNaN(leadIndex)) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          drawSingleLead(currentCanvasId, leadIndex, waveformData);
        }, 100);
      }
    }
  }, [waveformData, selectedLead, currentCanvasId, drawSingleLead]);




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

  // Removed per-row interpretation handler; use multi-select Interpret button above instead

  // Build disease options from AI diagnosis tag (x00104000)
  const getAvailableDiseases = React.useMemo(() => {
    const set = new Set();
    const raw = dicomTags?.['x00104000'];
    if (!raw) return [];
    const parts = String(raw).split(' | ');
    const parseBlock = (text) => (text || '')
      .replace('ResNet Top5: ', '')
      .split('; ')
      .map(s => s.split(':')[0])
      .filter(Boolean);
    if (parts[0]) parseBlock(parts[0]).forEach(t => set.add(t));
    if (parts[1]) parseBlock(parts[1]).forEach(t => set.add(t));
    return Array.from(set);
  }, [dicomTags]);

  // Interpret multiple selected diseases
  const handleInterpretMultiple = () => {
    if (!instanceId) {
      message.error('Missing instance ID');
      return;
    }
    if (!selectedDiseasesXAI || selectedDiseasesXAI.length === 0) {
      message.error('Select at least one disease');
      return;
    }
    const DISEASE_CODE_MAP = { AF: 'AFIB', NR: 'NORM', NSR: 'NORM', ST: 'STACH', SB: 'SB', SBRAD: 'SB', '1AVB': '1dAVB', '2AVB': '2dAVB', '3AVB': '3dAVB' };
    const normalized = Array.from(new Set(selectedDiseasesXAI.map(d => DISEASE_CODE_MAP[d] || d).filter(Boolean)));
    const params = new URLSearchParams();
    normalized.forEach(d => params.append('d', d));
    navigate(`/xai/${instanceId}?${params.toString()}`);
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

        {/* ⭐ New addition: Lead selector */}
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

        {/* Weasis-like parameter controls */}
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
            {dicomTags['x00104000'] && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#666' }}>Select diseases:</span>
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Choose diseases"
                  style={{ minWidth: 280 }}
                  value={selectedDiseasesXAI}
                  onChange={setSelectedDiseasesXAI}
                  options={getAvailableDiseases.map(d => ({ label: d, value: d }))}
                />
                <Button type="primary" icon={<ExperimentOutlined />} onClick={handleInterpretMultiple}>Interpret</Button>
              </div>
            )}
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

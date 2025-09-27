import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DicomECGViewer } from 'ecg-dicom-web-viewer';
import dicomParser from 'dicom-parser';
import { Card, Space, Typography, Upload, Progress, Row, Col, Button, message, Select, Checkbox } from 'antd'; // ⭐ Modified: Import Select and Checkbox components
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

  const [selectedLead, setSelectedLead] = React.useState("multiple"); // ⭐ Keep for backward compatibility
  const [selectedLeads, setSelectedLeads] = React.useState([1]); // ⭐ Default to Lead II
  const [isMultipleMode, setIsMultipleMode] = React.useState(false); // Default to single-lead mode
  const [dicomArrayBuffer, setDicomArrayBuffer] = React.useState(null); // Store DICOM data
  const [waveformData, setWaveformData] = React.useState(null); // 2D array: [lead][samples]
  const [samplingRate, setSamplingRate] = React.useState(100);
  const [leadNames, setLeadNames] = React.useState([]);
  const [currentCanvasId, setCurrentCanvasId] = React.useState(null); // Store current canvas ID
  const [selectedDiseasesXAI, setSelectedDiseasesXAI] = React.useState([]);

  // Multiple-leads viewing temporarily disabled; single-lead remains enabled

  // Lead selection handlers
  const handleMultipleModeChange = (checked) => {
    setIsMultipleMode(checked);
    if (checked) {
      setSelectedLeads([]);
      setSelectedLead("multiple");
    } else {
      setSelectedLead("1"); // Default to Lead II
      setSelectedLeads([1]);
    }
  };

  const handleSingleLeadChange = (leadIndex, checked) => {
    if (checked) {
      // Add lead if not already selected and not more than 2
      if (selectedLeads.length < 2 && !selectedLeads.includes(leadIndex)) {
        const newSelectedLeads = [...selectedLeads, leadIndex];
        setSelectedLeads(newSelectedLeads);
        setSelectedLead(leadIndex.toString());
      }
    } else {
      // Remove lead
      const newSelectedLeads = selectedLeads.filter(lead => lead !== leadIndex);
      setSelectedLeads(newSelectedLeads);
      if (newSelectedLeads.length > 0) {
        setSelectedLead(newSelectedLeads[0].toString());
      } else {
        setSelectedLead("1"); // Fallback to Lead II
        setSelectedLeads([1]);
      }
    }
  };

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
      let decodedThisItem = false; // avoid double-appending the same item's data
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
          // Assume 16-bit little-endian signed samples (most common for DICOM ECG)
          const flat = new Int16Array(Math.floor(waveformBuffer.length / 2));
          for (let j = 0; j < flat.length; j++) {
            flat[j] = dataView.getInt16(j * 2, true);
          }

          // Try interleaved first
          if (flat.length % channelCount === 0) {
            const samplesPerLeadInterleaved = flat.length / channelCount;
            for (let c = 0; c < channelCount; c++) {
              for (let k = 0; k < samplesPerLeadInterleaved; k++) {
                accumPerLead[c].push(flat[k * channelCount + c]);
              }
            }
          } else if (samplesPerChannel > 0 && flat.length === samplesPerChannel * channelCount) {
            // Non-interleaved contiguous blocks per channel
            for (let c = 0; c < channelCount; c++) {
              const startIdx = c * samplesPerChannel;
              for (let k = 0; k < samplesPerChannel; k++) {
                accumPerLead[c].push(flat[startIdx + k]);
              }
            }
          } else {
            // Fallback: push into first lead to preserve data without duplication
            accumPerLead[0].push(...Array.from(flat));
          }

          decodedThisItem = true; // mark as handled to prevent fallback re-append

          break; // This item completed
        }

        const next = dataStart + valueLength;
        if (next <= offset) break;
        offset = next;
      }

      // Fallback: Some parsers mount dataSet on item, can directly read element offset
      // Only execute if this item hasn't been decoded via the primary path above
      if (!decodedThisItem && item.dataSet && item.dataSet.elements) {
        const el = item.dataSet.elements['x54001010'];
        if (el && el.length > 0) {
          const start = el.dataOffset;
          const end = start + el.length;
          const wf = byteArray.slice(start, end);
          const dv = new DataView(wf.buffer, wf.byteOffset, wf.length);
          const arr = new Int16Array(Math.floor(wf.length / 2));
          for (let k = 0; k < arr.length; k++) arr[k] = dv.getInt16(k * 2, true);
          if (arr.length % channelCount === 0) {
            const samplesPerLeadInterleaved = arr.length / channelCount;
            for (let c = 0; c < channelCount; c++) {
              for (let k = 0; k < samplesPerLeadInterleaved; k++) {
                accumPerLead[c].push(arr[k * channelCount + c]);
              }
            }
          } else if (samplesPerChannel > 0 && arr.length === samplesPerChannel * channelCount) {
            for (let c = 0; c < channelCount; c++) {
              const startIdx = c * samplesPerChannel;
              for (let k = 0; k < samplesPerChannel; k++) {
                accumPerLead[c].push(arr[startIdx + k]);
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


    if (allLeads.length > 0) {
      const actualSamples = Math.min(...allLeads.map(l => l.length));
      const actualDuration = actualSamples / samplingRate;



      if (actualDuration < 10) {
        const originalSamplingRate = samplingRate;


        const samplingRateOptions = [500, 400, 250, 100];
        let newSamplingRate = 100;

        for (const rate of samplingRateOptions) {
          const testDuration = actualSamples / rate;
          if (testDuration >= 10) {
            newSamplingRate = rate;
            break;
          }
        }

        const newDuration = actualSamples / newSamplingRate;

        if (onSamplingRateChange) {
          onSamplingRateChange(newSamplingRate);
        }
      }
    }

    return allLeads;
  }, []);

  // Single-lead ECG rendering

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

    // Layout paddings so axes, labels and waveform are fully visible
    const paddingLeft = 100;
    const paddingBottom = 80;
    const paddingTop = 60;
    const paddingRight = 50;

    const contentWidth = rect.width - paddingLeft - paddingRight;
    const contentHeight = rect.height - paddingTop - paddingBottom;

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);


    const pixelsPerMM = 5;
    const pixelsPerSecond = mmPerSecond * pixelsPerMM; // 25 mm/s * 5 px/mm = 125 px/s
    const pixelsPerMV = mmPerMV * pixelsPerMM;         // 10 mm/mV * 5 px/mm = 50 px/mV


    const smallGridTime = 0.04;
    const largeGridTime = 0.2;
    const smallGridVoltage = 0.1;
    const largeGridVoltage = 0.5;

    const smallGridSizeX = smallGridTime * pixelsPerSecond; // 0.04 s → 5 px
    const largeGridSizeX = largeGridTime * pixelsPerSecond; // 0.2 s → 25 px
    const smallGridSizeY = smallGridVoltage * pixelsPerMV;  // 0.1 mV → 5 px
    const largeGridSizeY = largeGridVoltage * pixelsPerMV;  // 0.5 mV → 25 px


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

    // Compute actual voltage range from raw data
    const actualMinVoltage = Math.min(...samples) / 1000; // convert to mV
    const actualMaxVoltage = Math.max(...samples) / 1000; // convert to mV

    // Choose min/max bounds using data-driven thresholds
    let minVoltage, maxVoltage;

    // Floor to 0.5 mV steps with a minimum of -1.5 mV
    minVoltage = Math.min(-1.5, Math.floor(actualMinVoltage / 0.5) * 0.5);

    // Ceil to 0.5 mV steps with a minimum of +1.5 mV
    maxVoltage = Math.max(1.5, Math.ceil(actualMaxVoltage / 0.5) * 0.5);

    // Voltage range used for grid rendering
    const voltageRange = Math.max(Math.abs(minVoltage), maxVoltage);

    const gridPaddingFactor = 0.8;
    const extendedPixelsPerMV = pixelsPerMV * (1 + gridPaddingFactor);

    // Compute display Y range using bounds and clamp to canvas
    const minDisplayY = Math.max(paddingTop, centerY - (maxVoltage * extendedPixelsPerMV));
    const maxDisplayY = Math.min(rect.height - paddingBottom, centerY - (minVoltage * extendedPixelsPerMV));



    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.7;

    // Small vertical grid (0.04 s)
    for (let x = paddingLeft; x <= maxDisplayX; x += smallGridSizeX) {
      ctx.beginPath();
      ctx.moveTo(x, minDisplayY);
      ctx.lineTo(x, maxDisplayY);
      ctx.stroke();
    }


    const extendedSmallGridSizeY = smallGridVoltage * extendedPixelsPerMV;

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


      const voltageMV = samples[i] / 1000;
      const y = centerY - (voltageMV * extendedPixelsPerMV);

      const clampedY = Math.max(minDisplayY, Math.min(maxDisplayY, y));

      if (!hasMoved) {
        ctx.moveTo(x, clampedY);
        hasMoved = true;
      } else {
        ctx.lineTo(x, clampedY);
      }
    }
    ctx.stroke();

    // Draw lead borders (top and bottom)
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    // Top border
    ctx.moveTo(paddingLeft, minDisplayY);
    ctx.lineTo(maxDisplayX, minDisplayY);
    // Bottom border
    ctx.moveTo(paddingLeft, maxDisplayY);
    ctx.lineTo(maxDisplayX, maxDisplayY);
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
    ctx.fillText(leadName, paddingLeft, paddingTop - 15);

    ctx.fillStyle = '#4a5568';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';

    const timeScaleY = rect.height - paddingBottom + 5;

    const timeInterval = 0.2;
    const maxTime = displayDuration;

    // Draw time labels along the X-axis
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#4a5568';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';

    for (let t = 0; t <= maxTime; t += timeInterval) {
      const x = paddingLeft + t * pixelsPerSecond;

      if (x >= paddingLeft && x <= maxDisplayX) {

        const timeLabel = t.toFixed(1);
        ctx.fillText(timeLabel, x, maxDisplayY + 10);
      }
    }

    ctx.textAlign = 'right';
    ctx.font = '11px Arial, sans-serif';

    const voltageScaleX = 45;

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;

    // Draw voltage tick labels using computed range
    for (let voltage = minVoltage; voltage <= maxVoltage; voltage += 0.5) { // 0.5mV间隔
      const y = centerY - (voltage * extendedPixelsPerMV);

      // Only render labels within visible band
      if (y >= minDisplayY && y <= maxDisplayY) {
        // Voltage tick mark
        ctx.beginPath();
        ctx.moveTo(paddingLeft - 6, y);
        ctx.lineTo(paddingLeft, y);
        ctx.stroke();

        // Voltage tick label
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
    ctx.translate(35, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Amplitude (mV)', 0, 0);
    ctx.restore();

    // X-axis label (time) at the bottom
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', paddingLeft + contentWidth / 2, rect.height - 20);

  }, [waveformData, samplingRate, leadNames, mmPerSecond, mmPerMV]);

  // Professional ECG dual leads rendering - reference the image style
  const drawDualLeads = React.useCallback((canvasId, leadIndices, waveformDataToUse = null) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return;
    }

    if (canvas.tagName !== 'CANVAS') {
      return;
    }

    const dataToUse = waveformDataToUse || waveformData;
    if (!dataToUse || leadIndices.length < 2 || !dataToUse[leadIndices[0]] || !dataToUse[leadIndices[1]]) {
      return;
    }

    const leadDisplayNames = ['Lead I', 'Lead II', 'Lead III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    const lead1Samples = dataToUse[leadIndices[0]];
    const lead2Samples = dataToUse[leadIndices[1]];

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // 🔥 Dual lead layout parameters - 
    const paddingLeft = 100;
    const paddingBottom = 80;
    const paddingTop = 60;
    const paddingRight = 50;
    const leadSpacing = 30;

    const contentWidth = rect.width - paddingLeft - paddingRight;
    const contentHeight = rect.height - paddingTop - paddingBottom;
    const leadHeight = (contentHeight - leadSpacing) / 2; // Each lead gets half the height minus spacing

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const pixelsPerMM = 5;  // 1mm = 5px 
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

    const actualDuration = lead1Samples.length / samplingRate;
    let targetDuration = 10;
    let displayDuration = targetDuration;

    if (actualDuration < 10) {
      displayDuration = actualDuration;
    } else if (actualDuration > 10) {
      displayDuration = 10;
    }

    const maxDisplayX = paddingLeft + displayDuration * pixelsPerSecond;

    // Draw both leads
    [lead1Samples, lead2Samples].forEach((samples, leadIndex) => {
      const leadName = leadDisplayNames[leadIndices[leadIndex]];
      const isFirstLead = leadIndex === 0;

      // Calculate Y position for this lead
      const leadTop = paddingTop + (isFirstLead ? 0 : leadHeight + leadSpacing);
      const leadBottom = leadTop + leadHeight;
      const centerY = leadTop + leadHeight / 2;

      // Calculate voltage range for this lead
      const actualMinVoltage = Math.min(...samples) / 1000;
      const actualMaxVoltage = Math.max(...samples) / 1000;

      let minVoltage, maxVoltage;
      minVoltage = Math.min(-1.5, Math.floor(actualMinVoltage / 0.5) * 0.5);
      maxVoltage = Math.max(1.5, Math.ceil(actualMaxVoltage / 0.5) * 0.5);

      const voltageRange = Math.max(Math.abs(minVoltage), maxVoltage);
      const gridPaddingFactor = 0.8;
      const extendedPixelsPerMV = pixelsPerMV * (1 + gridPaddingFactor);


      const minDisplayY = Math.max(leadTop, centerY - (maxVoltage * extendedPixelsPerMV));
      const maxDisplayY = Math.min(leadBottom, centerY - (minVoltage * extendedPixelsPerMV));

      // Draw grid for this lead 
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.7;

      // Small vertical grid lines (0.04s)
      for (let x = paddingLeft; x <= maxDisplayX; x += smallGridSizeX) {
        ctx.beginPath();
        ctx.moveTo(x, leadTop);
        ctx.lineTo(x, leadBottom);
        ctx.stroke();
      }

      // Small horizontal grid lines (0.1mV)
      for (let voltage = minVoltage; voltage <= maxVoltage; voltage += smallGridVoltage) {
        const y = centerY - (voltage * extendedPixelsPerMV);
        if (y >= leadTop && y <= leadBottom) {
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(maxDisplayX, y);
          ctx.stroke();
        }
      }

      // Large grid lines
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 1.0;

      // Large vertical grid lines (0.2s)
      for (let x = paddingLeft; x <= maxDisplayX; x += largeGridSizeX) {
        ctx.beginPath();
        ctx.moveTo(x, leadTop);
        ctx.lineTo(x, leadBottom);
        ctx.stroke();
      }

      // Large horizontal grid lines (0.5mV)
      for (let voltage = minVoltage; voltage <= maxVoltage; voltage += largeGridVoltage) {
        const y = centerY - (voltage * extendedPixelsPerMV);
        if (y >= leadTop && y <= leadBottom) {
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(maxDisplayX, y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1.0;

      // Draw ECG waveform
      ctx.strokeStyle = '#1a365d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const samplesToShow = Math.min(samples.length, displayDuration * samplingRate);
      for (let i = 0; i < samplesToShow; i++) {
        const x = paddingLeft + (i / samplingRate) * pixelsPerSecond;
        const voltage = samples[i] / 1000; // Convert to mV
        const y = centerY - (voltage * extendedPixelsPerMV);


        const clampedY = Math.max(leadTop, Math.min(leadBottom, y));

        if (i === 0) {
          ctx.moveTo(x, clampedY);
        } else {
          ctx.lineTo(x, clampedY);
        }
      }
      ctx.stroke();

      // Draw lead borders (top and bottom)
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      // Top border
      ctx.moveTo(paddingLeft, leadTop);
      ctx.lineTo(maxDisplayX, leadTop);
      // Bottom border
      ctx.moveTo(paddingLeft, leadBottom);
      ctx.lineTo(maxDisplayX, leadBottom);
      ctx.stroke();

      // Draw baseline (0mV) for this lead
      ctx.beginPath();
      ctx.moveTo(paddingLeft - 6, centerY);
      ctx.lineTo(paddingLeft, centerY);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Add lead label
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillStyle = '#2d3748';
      ctx.textAlign = 'left';
      ctx.fillText(leadName, paddingLeft + 10, leadTop + 25);

      // Add voltage scale labels for this lead
      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = '#718096';
      ctx.textAlign = 'right';

      // Y-axis voltage labels
      for (let voltage = minVoltage; voltage <= maxVoltage; voltage += 0.5) {
        const y = centerY - (voltage * extendedPixelsPerMV);
        if (y >= leadTop && y <= leadBottom) {
          ctx.fillText(`${voltage.toFixed(1)}`, paddingLeft - 10, y + 4);
        }
      }
    });

    // Add time labels (shared for both leads) 
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = '#718096';
    ctx.textAlign = 'center';


    const lastLeadBottom = paddingTop + leadHeight + leadSpacing + leadHeight;
    const timeLabelsY = lastLeadBottom + 20;

    for (let time = 0; time <= displayDuration; time += 0.2) {
      const x = paddingLeft + time * pixelsPerSecond;
      if (x <= maxDisplayX) {
        ctx.fillText(time.toFixed(1), x, timeLabelsY);
      }
    }

    // Add axis labels
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#2d3748';

    // Y-axis label (voltage) - centered between leads
    ctx.save();
    ctx.translate(35, paddingTop + contentHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Amplitude (mV)', 0, 0);
    ctx.restore();

    // X-axis label (time) 
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', paddingLeft + contentWidth / 2, timeLabelsY + 15);

  }, [waveformData, samplingRate, leadNames, mmPerSecond, mmPerMV]);

  // Professional ECG with Lead II reference 
  const drawSingleLeadWithReference = React.useCallback((canvasId, leadIndex, waveformDataToUse = null) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return;
    }

    if (canvas.tagName !== 'CANVAS') {
      return;
    }

    const dataToUse = waveformDataToUse || waveformData;
    if (!dataToUse || !dataToUse[leadIndex] || !dataToUse[1]) { // Lead II is index 1
      return;
    }

    const selectedLeadSamples = dataToUse[leadIndex];
    const lead2Samples = dataToUse[1]; // Lead II as reference

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // 🔥 Three-section layout: selected lead + Lead II reference
    const paddingLeft = 100;
    const paddingBottom = 80;
    const paddingTop = 60;
    const paddingRight = 50;
    const leadSpacing = 20; // Space between leads

    const contentWidth = rect.width - paddingLeft - paddingRight;
    const contentHeight = rect.height - paddingTop - paddingBottom;
    const totalLeads = 2; // Selected lead + Lead II reference
    const minLeadHeight = 120; // Minimum height per lead
    const availableHeight = contentHeight - leadSpacing;
    const calculatedLeadHeight = availableHeight / totalLeads;
    const leadHeight = Math.max(minLeadHeight, calculatedLeadHeight); // Ensure minimum height

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const pixelsPerMM = 5;
    const pixelsPerSecond = mmPerSecond * pixelsPerMM;
    const pixelsPerMV = mmPerMV * pixelsPerMM;

    const smallGridTime = 0.04;
    const largeGridTime = 0.2;
    const smallGridVoltage = 0.1;
    const largeGridVoltage = 0.5;

    const smallGridSizeX = smallGridTime * pixelsPerSecond;
    const largeGridSizeX = largeGridTime * pixelsPerSecond;
    const smallGridSizeY = smallGridVoltage * pixelsPerMV;
    const largeGridSizeY = largeGridVoltage * pixelsPerMV;

    ctx.fillStyle = '#fefefe';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const actualDuration = selectedLeadSamples.length / samplingRate;
    let targetDuration = 10;
    let displayDuration = targetDuration;

    if (actualDuration < 10) {
      displayDuration = actualDuration;
    } else if (actualDuration > 10) {
      displayDuration = 10;
    }

    const maxDisplayX = paddingLeft + displayDuration * pixelsPerSecond;

    // Draw both leads: selected lead on top, Lead II reference at bottom
    const leads = [
      { samples: selectedLeadSamples, name: leadNames[leadIndex] || `Lead ${leadIndex + 1}`, isReference: false },
      { samples: lead2Samples, name: 'Lead II (Reference)', isReference: true }
    ];

    leads.forEach((lead, leadIndex) => {
      const samples = lead.samples;
      const leadName = lead.name;
      const isFirstLead = leadIndex === 0;
      const isReference = lead.isReference;

      // Calculate Y position for this lead
      const leadTop = paddingTop + (isFirstLead ? 0 : leadHeight + leadSpacing);
      const leadBottom = leadTop + leadHeight;
      const centerY = leadTop + leadHeight / 2;

      // Calculate voltage range for this lead
      const actualMinVoltage = Math.min(...samples) / 1000;
      const actualMaxVoltage = Math.max(...samples) / 1000;

      let minVoltage, maxVoltage;
      minVoltage = Math.min(-1.5, Math.floor(actualMinVoltage / 0.5) * 0.5);
      maxVoltage = Math.max(1.5, Math.ceil(actualMaxVoltage / 0.5) * 0.5);

      const voltageRange = Math.max(Math.abs(minVoltage), maxVoltage);
      const gridPaddingFactor = 0.8;
      const extendedPixelsPerMV = pixelsPerMV * (1 + gridPaddingFactor);

      // Clamp visible Y range to the lead band
      const minDisplayY = Math.max(leadTop, centerY - (maxVoltage * extendedPixelsPerMV));
      const maxDisplayY = Math.min(leadBottom, centerY - (minVoltage * extendedPixelsPerMV));

      // Draw grid for this lead
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.7;

      // Small vertical grid lines
      for (let x = paddingLeft; x <= maxDisplayX; x += smallGridSizeX) {
        ctx.beginPath();
        ctx.moveTo(x, leadTop);
        ctx.lineTo(x, leadBottom);
        ctx.stroke();
      }

      // Small horizontal grid lines
      for (let voltage = minVoltage; voltage <= maxVoltage; voltage += smallGridVoltage) {
        const y = centerY - (voltage * extendedPixelsPerMV);
        if (y >= leadTop && y <= leadBottom) {
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(maxDisplayX, y);
          ctx.stroke();
        }
      }

      // Large grid lines
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 1.0;

      // Large vertical grid lines
      for (let x = paddingLeft; x <= maxDisplayX; x += largeGridSizeX) {
        ctx.beginPath();
        ctx.moveTo(x, leadTop);
        ctx.lineTo(x, leadBottom);
        ctx.stroke();
      }

      // Large horizontal grid lines
      for (let voltage = minVoltage; voltage <= maxVoltage; voltage += largeGridVoltage) {
        const y = centerY - (voltage * extendedPixelsPerMV);
        if (y >= leadTop && y <= leadBottom) {
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(maxDisplayX, y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1.0;

      // Draw ECG waveform
      ctx.strokeStyle = '#1a365d'; // All leads use same color
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const samplesToShow = Math.min(samples.length, displayDuration * samplingRate);
      for (let i = 0; i < samplesToShow; i++) {
        const x = paddingLeft + (i / samplingRate) * pixelsPerSecond;
        const voltage = samples[i] / 1000;
        const y = centerY - (voltage * extendedPixelsPerMV);

        const clampedY = Math.max(leadTop, Math.min(leadBottom, y));

        if (i === 0) {
          ctx.moveTo(x, clampedY);
        } else {
          ctx.lineTo(x, clampedY);
        }
      }
      ctx.stroke();

      // Draw lead borders (top and bottom)
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      // Top border
      ctx.moveTo(paddingLeft, leadTop);
      ctx.lineTo(maxDisplayX, leadTop);
      // Bottom border
      ctx.moveTo(paddingLeft, leadBottom);
      ctx.lineTo(maxDisplayX, leadBottom);
      ctx.stroke();

      // Draw baseline (0mV) for this lead
      ctx.beginPath();
      ctx.moveTo(paddingLeft - 6, centerY);
      ctx.lineTo(paddingLeft, centerY);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Add lead label
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillStyle = isReference ? '#ff6b6b' : '#2d3748';
      ctx.textAlign = 'left';
      ctx.fillText(leadName, paddingLeft + 10, leadTop + 25);

      // Add voltage scale labels for this lead
      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = '#718096';
      ctx.textAlign = 'right';

      for (let voltage = minVoltage; voltage <= maxVoltage; voltage += 0.5) {
        const y = centerY - (voltage * extendedPixelsPerMV);
        if (y >= leadTop && y <= leadBottom) {
          ctx.fillText(`${voltage.toFixed(1)}`, paddingLeft - 10, y + 4);
        }
      }
    });

    // Add time labels (shared for both leads) - placed under Lead II reference
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = '#718096';
    ctx.textAlign = 'center';


    const lead2ReferenceBottom = paddingTop + leadHeight + leadSpacing + leadHeight; // bottom of Lead II reference
    const timeLabelsY = lead2ReferenceBottom + 20;

    for (let time = 0; time <= displayDuration; time += 0.2) {
      const x = paddingLeft + time * pixelsPerSecond;
      if (x <= maxDisplayX) {
        ctx.fillText(time.toFixed(1), x, timeLabelsY);
      }
    }

    // Add axis labels
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#2d3748';

    // Y-axis label (voltage) - centered between leads
    ctx.save();
    ctx.translate(35, paddingTop + contentHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Amplitude (mV)', 0, 0);
    ctx.restore();

    // X-axis label (time) 
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', paddingLeft + contentWidth / 2, timeLabelsY + 15);

  }, [waveformData, samplingRate, leadNames, mmPerSecond, mmPerMV]);

  // Professional ECG dual leads with Lead II reference 
  const drawDualLeadsWithReference = React.useCallback((canvasId, leadIndices, waveformDataToUse = null) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return;
    }

    if (canvas.tagName !== 'CANVAS') {
      return;
    }

    const dataToUse = waveformDataToUse || waveformData;
    if (!dataToUse || leadIndices.length < 2 || !dataToUse[leadIndices[0]] || !dataToUse[leadIndices[1]] || !dataToUse[1]) {
      return;
    }

    const leadDisplayNames = ['Lead I', 'Lead II', 'Lead III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    const lead1Samples = dataToUse[leadIndices[0]];
    const lead2Samples = dataToUse[leadIndices[1]];
    const lead2ReferenceSamples = dataToUse[1]; // Lead II as reference

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // 🔥 Three-section layout: two selected leads + Lead II reference
    const paddingLeft = 100;
    const paddingBottom = 80;
    const paddingTop = 60;
    const paddingRight = 50;
    const leadSpacing = 20; // Space between leads

    const contentWidth = rect.width - paddingLeft - paddingRight;
    const contentHeight = rect.height - paddingTop - paddingBottom;
    const totalLeads = 3; // Two selected leads + Lead II reference
    const minLeadHeight = 120; // Minimum height per lead
    const availableHeight = contentHeight - leadSpacing * (totalLeads - 1);
    const calculatedLeadHeight = availableHeight / totalLeads;
    const leadHeight = Math.max(minLeadHeight, calculatedLeadHeight); // Ensure minimum height

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const pixelsPerMM = 5;
    const pixelsPerSecond = mmPerSecond * pixelsPerMM;
    const pixelsPerMV = mmPerMV * pixelsPerMM;

    const smallGridTime = 0.04;
    const largeGridTime = 0.2;
    const smallGridVoltage = 0.1;
    const largeGridVoltage = 0.5;

    const smallGridSizeX = smallGridTime * pixelsPerSecond;
    const largeGridSizeX = largeGridTime * pixelsPerSecond;
    const smallGridSizeY = smallGridVoltage * pixelsPerMV;
    const largeGridSizeY = largeGridVoltage * pixelsPerMV;

    ctx.fillStyle = '#fefefe';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const actualDuration = lead1Samples.length / samplingRate;
    let targetDuration = 10;
    let displayDuration = targetDuration;

    if (actualDuration < 10) {
      displayDuration = actualDuration;
    } else if (actualDuration > 10) {
      displayDuration = 10;
    }

    const maxDisplayX = paddingLeft + displayDuration * pixelsPerSecond;

    // Draw three leads: two selected leads + Lead II reference at bottom
    const leads = [
      { samples: lead1Samples, name: leadDisplayNames[leadIndices[0]], isReference: false },
      { samples: lead2Samples, name: leadDisplayNames[leadIndices[1]], isReference: false },
      { samples: lead2ReferenceSamples, name: 'Lead II (Reference)', isReference: true }
    ];

    leads.forEach((lead, leadIndex) => {
      const samples = lead.samples;
      const leadName = lead.name;
      const isReference = lead.isReference;

      // Calculate Y position for this lead
      const leadTop = paddingTop + leadIndex * (leadHeight + leadSpacing);
      const leadBottom = leadTop + leadHeight;
      const centerY = leadTop + leadHeight / 2;

      // Calculate voltage range for this lead
      const actualMinVoltage = Math.min(...samples) / 1000;
      const actualMaxVoltage = Math.max(...samples) / 1000;

      let minVoltage, maxVoltage;
      minVoltage = Math.min(-1.5, Math.floor(actualMinVoltage / 0.5) * 0.5);
      maxVoltage = Math.max(1.5, Math.ceil(actualMaxVoltage / 0.5) * 0.5);

      const voltageRange = Math.max(Math.abs(minVoltage), maxVoltage);
      const gridPaddingFactor = 0.8;
      const extendedPixelsPerMV = pixelsPerMV * (1 + gridPaddingFactor);

      // Clamp visible Y range to the lead band
      const minDisplayY = Math.max(leadTop, centerY - (maxVoltage * extendedPixelsPerMV));
      const maxDisplayY = Math.min(leadBottom, centerY - (minVoltage * extendedPixelsPerMV));

      // Draw grid for this lead
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.7;

      // Small vertical grid lines
      for (let x = paddingLeft; x <= maxDisplayX; x += smallGridSizeX) {
        ctx.beginPath();
        ctx.moveTo(x, leadTop);
        ctx.lineTo(x, leadBottom);
        ctx.stroke();
      }

      // Small horizontal grid lines
      for (let voltage = minVoltage; voltage <= maxVoltage; voltage += smallGridVoltage) {
        const y = centerY - (voltage * extendedPixelsPerMV);
        if (y >= leadTop && y <= leadBottom) {
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(maxDisplayX, y);
          ctx.stroke();
        }
      }

      // Large grid lines
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 1.0;

      // Large vertical grid lines
      for (let x = paddingLeft; x <= maxDisplayX; x += largeGridSizeX) {
        ctx.beginPath();
        ctx.moveTo(x, leadTop);
        ctx.lineTo(x, leadBottom);
        ctx.stroke();
      }

      // Large horizontal grid lines
      for (let voltage = minVoltage; voltage <= maxVoltage; voltage += largeGridVoltage) {
        const y = centerY - (voltage * extendedPixelsPerMV);
        if (y >= leadTop && y <= leadBottom) {
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(maxDisplayX, y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1.0;

      // Draw ECG waveform
      ctx.strokeStyle = '#1a365d'; // All leads use same color
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const samplesToShow = Math.min(samples.length, displayDuration * samplingRate);
      for (let i = 0; i < samplesToShow; i++) {
        const x = paddingLeft + (i / samplingRate) * pixelsPerSecond;
        const voltage = samples[i] / 1000;
        const y = centerY - (voltage * extendedPixelsPerMV);

        const clampedY = Math.max(leadTop, Math.min(leadBottom, y));

        if (i === 0) {
          ctx.moveTo(x, clampedY);
        } else {
          ctx.lineTo(x, clampedY);
        }
      }
      ctx.stroke();

      // Draw lead borders (top and bottom)
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      // Top border
      ctx.moveTo(paddingLeft, leadTop);
      ctx.lineTo(maxDisplayX, leadTop);
      // Bottom border
      ctx.moveTo(paddingLeft, leadBottom);
      ctx.lineTo(maxDisplayX, leadBottom);
      ctx.stroke();

      // Draw baseline (0mV) for this lead
      ctx.beginPath();
      ctx.moveTo(paddingLeft - 6, centerY);
      ctx.lineTo(paddingLeft, centerY);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Add lead label
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillStyle = isReference ? '#ff6b6b' : '#2d3748';
      ctx.textAlign = 'left';
      ctx.fillText(leadName, paddingLeft + 10, leadTop + 25);

      // Add voltage scale labels for this lead
      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = '#718096';
      ctx.textAlign = 'right';

      for (let voltage = minVoltage; voltage <= maxVoltage; voltage += 0.5) {
        const y = centerY - (voltage * extendedPixelsPerMV);
        if (y >= leadTop && y <= leadBottom) {
          ctx.fillText(`${voltage.toFixed(1)}`, paddingLeft - 10, y + 4);
        }
      }
    });

    // Add time labels (shared for all leads) - placed below the last lead
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = '#718096';
    ctx.textAlign = 'center';

    // Compute bottom of the last lead (Lead II reference)
    const lastLeadBottom = paddingTop + 2 * (leadHeight + leadSpacing) + leadHeight; // third lead bottom
    const timeLabelsY = lastLeadBottom + 20; // draw time labels 20px below

    for (let time = 0; time <= displayDuration; time += 0.2) {
      const x = paddingLeft + time * pixelsPerSecond;
      if (x <= maxDisplayX) {
        ctx.fillText(time.toFixed(1), x, timeLabelsY);
      }
    }

    // Add axis labels
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#2d3748';

    // Y-axis label (voltage) - centered between all leads
    ctx.save();
    ctx.translate(35, paddingTop + contentHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Amplitude (mV)', 0, 0);
    ctx.restore();

    // X-axis label (time) 
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', paddingLeft + contentWidth / 2, timeLabelsY + 15);

  }, [waveformData, samplingRate, leadNames, mmPerSecond, mmPerMV]);

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

      // Adjust height based on lead selection - dynamic calculation
      if (isMultipleMode) {
        canvas.style.height = '100%'; // Full height for multiple leads
      } else {
        // Calculate height based on number of leads (selected + Lead II reference)
        const totalLeads = selectedLeads.length + 1; // +1 for Lead II reference
        const baseHeight = 200; // Base height for padding and labels
        const minLeadHeight = 120; // Minimum height per lead
        const leadSpacing = 20; // Spacing between leads
        const calculatedHeight = baseHeight + (totalLeads * minLeadHeight) + ((totalLeads - 1) * leadSpacing);

        // Set minimum and maximum heights with better scaling
        const minHeight = 400;
        const maxHeight = Math.min(1200, window.innerHeight * 0.8); // Max 80% of viewport height
        const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));

        canvas.style.height = `${finalHeight}px`;
      }

      canvas.style.border = '1px solid #e9ecef';
      canvas.style.borderRadius = '8px';
      canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      canvas.style.background = '#fefefe';
      container.appendChild(canvas);
      setCurrentCanvasId(canvasId); // Save canvas ID to state

      const leadIndex = isMultipleMode ? 0 : (selectedLeads.length > 0 ? selectedLeads[0] : 1); // Default to Lead II when none selected
      const leadDisplayNames = ['Lead I', 'Lead II', 'Lead III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
      const nameView = isMultipleMode ? '' : (leadDisplayNames[leadIndex] || '');

      if (isMultipleMode) {
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
          // Rendering will be triggered by the effect that watches waveformData/selectedLeads/samplingRate
        } else {
          setError('No waveform data found for single lead rendering');
        }
      }

    } catch (error) {
      setError(`Failed to load ECG: ${error.message}`);
    }
  }, [isMultipleMode, selectedLeads, setError]);

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
  }, [isMultipleMode, selectedLeads, dicomArrayBuffer, loadDicomFile]);

  // Redraw when waveformData updates and not in multiple mode
  React.useEffect(() => {
    if (waveformData && !isMultipleMode && selectedLeads.length > 0 && currentCanvasId) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (selectedLeads.length === 1) {
          // Single lead display with Lead II reference
          const leadIndex = selectedLeads[0];
          if (!isNaN(leadIndex)) {
            drawSingleLeadWithReference(currentCanvasId, leadIndex, waveformData);
          }
        } else if (selectedLeads.length === 2) {
          // Dual lead display with Lead II reference
          drawDualLeadsWithReference(currentCanvasId, selectedLeads, waveformData);
        }
      }, 100);
    }
  }, [waveformData, samplingRate, isMultipleMode, selectedLeads, currentCanvasId, drawSingleLeadWithReference, drawDualLeadsWithReference]);




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

        {/* ⭐ New addition: Lead selector with checkbox mode */}
        <div>
          {false && (
            <div style={{ marginBottom: 12 }}>
              <Checkbox
                checked={isMultipleMode}
                onChange={(e) => handleMultipleModeChange(e.target.checked)}
              >
                Multiple (12 leads)
              </Checkbox>
            </div>
          )}

          {!isMultipleMode && (
            <div>
              <span style={{ marginRight: 8, fontSize: '14px', color: '#666' }}>
                Select up to 2 leads ({selectedLeads.length}/2):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {[
                  { index: 0, name: 'Lead I' },
                  { index: 1, name: 'Lead II' },
                  { index: 2, name: 'Lead III' },
                  { index: 3, name: 'aVR' },
                  { index: 4, name: 'aVL' },
                  { index: 5, name: 'aVF' },
                  { index: 6, name: 'V1' },
                  { index: 7, name: 'V2' },
                  { index: 8, name: 'V3' },
                  { index: 9, name: 'V4' },
                  { index: 10, name: 'V5' },
                  { index: 11, name: 'V6' }
                ].map(({ index, name }) => (
                  <Checkbox
                    key={index}
                    checked={selectedLeads.includes(index)}
                    disabled={!selectedLeads.includes(index) && selectedLeads.length >= 2}
                    onChange={(e) => handleSingleLeadChange(index, e.target.checked)}
                    style={{
                      margin: 0,
                      opacity: !selectedLeads.includes(index) && selectedLeads.length >= 2 ? 0.5 : 1
                    }}
                  >
                    {name}
                  </Checkbox>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weasis-like parameter controls (hidden while multiple leads disabled) */}
        {false && (
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

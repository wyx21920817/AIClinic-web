import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DicomECGViewer,
  SOP_CLASS_UIDS,
} from 'ecg-dicom-web-viewer';
import dicomParser from 'dicom-parser';
import ReadECG from '../utils/ReadECG';
import { Card, Space, Typography, Upload, Progress, Row, Col, Button, message, Select } from 'antd'; // ⭐ Modified: Import Select component
import { InboxOutlined, FileImageOutlined, ArrowLeftOutlined, ExperimentOutlined } from '@ant-design/icons';
import request from '../services/api/request';
import { API_ENDPOINTS, API_BASE_URL } from '../services/api/config';

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

  // Parse WaveformSequence (5400,0100) -> Waveform Data (5400,1010)
  const parseWaveformData = React.useCallback((dataSet, byteArray) => {
    console.log('=== DICOM Waveform Parsing Debug ===');

    const waveformSeq = dataSet.elements['x54000100'];
    if (!waveformSeq || !waveformSeq.items) {
      console.log('No waveform sequence found!');
      return [];
    }

    const transferSyntax = dataSet.string('x00020010') || '';
    const isExplicitVR = transferSyntax.includes('1.2.840.10008.1.2.1'); // Explicit VR Little Endian

    // Read channel count (lead count), default to 12 if unavailable
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

          console.log(`[WF] Found waveform in item ${itemIndex}:`, {
            samples: flat.length,
            samplesPerLead: flat.length / channelCount,
            duration: (flat.length / channelCount) / samplingRate,
            channelCount,
            samplingRate
          });
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
          console.log(`[WF] Fallback used for item ${itemIndex}, samples:`, arr.length);
        }
      }
    });

    // Convert accumulated number[] to Int16Array, remove empty leads
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

    // Add detailed information for each lead
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

  // Professional ECG single lead rendering - reference MedDream style
  const drawSingleLead = React.useCallback((canvasId, leadIndex, waveformDataToUse = null) => {
    console.log('drawSingleLead called with canvasId:', canvasId, 'leadIndex:', leadIndex);
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.log('Canvas not found:', canvasId);
      return;
    }

    // Check canvas element type
    if (canvas.tagName !== 'CANVAS') {
      console.error('Element is not a canvas:', canvas.tagName, canvas);
      return;
    }

    // Use passed waveformData or waveformData from state
    const dataToUse = waveformDataToUse || waveformData;
    if (!dataToUse || !dataToUse[leadIndex]) {
      console.log('Waveform data not ready for lead:', leadIndex, 'dataToUse:', dataToUse);
      return;
    }

    console.log('Drawing single lead:', leadIndex, 'with', dataToUse[leadIndex].length, 'samples');

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Reserve space for axis labels - more professional layout
    const paddingLeft = 80;   // Left side voltage scale space
    const paddingBottom = 50; // Bottom time scale space
    const paddingTop = 40;    // Top lead label space
    const paddingRight = 30;  // Right side space

    const contentWidth = rect.width - paddingLeft - paddingRight;
    const contentHeight = rect.height - paddingTop - paddingBottom;

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // ECG standard parameters - controlled by UI
    const pixelsPerMM = 6;  // 1mm = 6px (fixed pixel density)
    const pixelsPerSecond = mmPerSecond * pixelsPerMM;
    const pixelsPerMV = mmPerMV * pixelsPerMM;
    const smallGridSize = pixelsPerMM; // Small grid: 6px = 1mm
    const largeGridSize = pixelsPerMM * 5; // Large grid: 30px = 5mm

    // Debug info: verify scale
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

    // Background color - similar to MedDream light background
    ctx.fillStyle = '#fefefe';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Calculate actual time range of ECG data
    const samples = dataToUse[leadIndex];
    const actualDuration = samples.length / samplingRate;
    // Limit time window based on display format
    const presetSeconds = displayPreset === '1x10' ? 10 : displayPreset === '2x5' ? 5 : 2.5;
    const maxDisplayTime = Math.min(actualDuration, presetSeconds);
    const maxDisplayX = paddingLeft + maxDisplayTime * pixelsPerSecond;

    // Calculate actual display range of voltage axis (±1.5mV)
    const centerY = paddingTop + contentHeight / 2;
    const voltageRange = 1.5; // ±1.5mV
    const minDisplayY = centerY - (voltageRange * pixelsPerMV); // Upper boundary
    const maxDisplayY = centerY + (voltageRange * pixelsPerMV); // Lower boundary

    // Draw ECG grid - only in data area
    ctx.strokeStyle = '#ff6b6b'; // More vibrant red small grid
    ctx.lineWidth = 0.3;

    // Small grid (1mm) - only draw within 1.5mV range
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

    // Large grid (5mm) - more prominent red, only draw within 1.5mV range
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

    // Draw ECG waveform

    // Waveform color - more professional style
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

      // Convert voltage value to pixel position (note ECG Y-axis is inverted)
      const voltageMV = samples[i] / 1000; // Convert to mV
      const y = centerY - (voltageMV * pixelsPerMV);

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

    // Add time scale - more precise markings
    ctx.fillStyle = '#4a5568';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';

    // Draw time markers below grid
    const timeScaleY = rect.height - 15;

    // Calculate display time range based on actual ECG data length
    const maxTime = Math.min(actualDuration, 10); // Use actual ECG data length, limit max display to 10 seconds

    // Smart time annotation - adjust density based on duration
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;

    // Simplified time annotation - directly use 0.2 second intervals
    let timeInterval = 0.2; // Fixed 0.2 second interval
    let labelPrecision = 1; // Display 0.1 second precision

    console.log('=== ECG Time Annotation Settings ===');
    console.log('Max Time:', maxTime.toFixed(2), 'seconds');
    console.log('Time Interval:', timeInterval, 'seconds');
    console.log('Label Precision:', labelPrecision, 'decimal places');
    console.log('Total Labels:', Math.ceil(maxTime / timeInterval));
    console.log('=====================================');

    for (let t = 0; t <= maxTime; t += timeInterval) {
      const x = paddingLeft + t * pixelsPerSecond;

      // Only draw markings within data range
      if (x >= paddingLeft && x <= maxDisplayX) {
        // Draw time marker line
        ctx.beginPath();
        ctx.moveTo(x, rect.height - paddingBottom + 5);
        ctx.lineTo(x, rect.height - paddingBottom + 30);
        ctx.stroke();

        // Draw time label (display based on precision)
        const timeLabel = labelPrecision === 0 ?
          `${t.toFixed(0)}` :
          `${t.toFixed(labelPrecision)}`;
        ctx.fillText(timeLabel, x, timeScaleY);
      }
    }

    // Smart small grid annotation - adjust based on large grid interval
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.3;

    // Small grid interval is 1/5 of large grid (0.2/5 = 0.04 seconds)
    const smallGridInterval = 0.04;

    for (let t = 0; t <= maxTime; t += smallGridInterval) {
      const x = paddingLeft + t * pixelsPerSecond;

      // Only draw markings within data range and not large grid lines
      if (x >= paddingLeft && x <= maxDisplayX && Math.abs(t % timeInterval) > 0.01) {
        ctx.beginPath();
        ctx.moveTo(x, rect.height - paddingBottom + 10);
        ctx.lineTo(x, rect.height - paddingBottom + 25);
        ctx.stroke();
      }
    }

    // Add voltage scale - more precise markings
    ctx.textAlign = 'right';
    ctx.font = '11px Arial, sans-serif';

    // Draw voltage markers on left side of grid
    const voltageScaleX = 45;

    // Use previously defined voltage range

    // Mark all large grid lines (every 0.5mV interval)
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    for (let voltage = -voltageRange; voltage <= voltageRange; voltage += 0.5) { // 0.5mV interval
      const y = centerY - (voltage * pixelsPerMV);

      // Only draw markings within 1.5mV range
      if (y >= minDisplayY && y <= maxDisplayY) {
        // Draw voltage marker line
        ctx.beginPath();
        ctx.moveTo(paddingLeft - 6, y);
        ctx.lineTo(paddingLeft, y);
        ctx.stroke();

        // Draw voltage label (display every 0.5mV)
        const voltageText = voltage === 0 ? '0' :
          voltage > 0 ? `+${voltage.toFixed(1)}` :
            `${voltage.toFixed(1)}`;
        ctx.fillText(voltageText, voltageScaleX, y + 3);
      }
    }

    // Mark small grid lines (every 0.1mV interval)
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 0.3;
    for (let voltage = -voltageRange; voltage <= voltageRange; voltage += 0.1) { // 0.1mV interval
      const y = centerY - (voltage * pixelsPerMV);

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
    ctx.translate(45, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Amplitude (mV)', 0, 0);
    ctx.restore();

    // X-axis label (time)
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', paddingLeft + contentWidth / 2, rect.height - 5);

    console.log('Single lead drawn successfully for lead:', leadIndex);
  }, [waveformData, samplingRate, leadNames]);
  // Function to load DICOM file - optimized with useCallback
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

      console.log('Creating ECG viewer...');
      const leadIndex = selectedLead === "multiple" ? 0 : parseInt(selectedLead); // ⭐ New addition
      const leadDisplayNames = ['Lead I', 'Lead II', 'Lead III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
      const nameView = selectedLead === "multiple" ? '' : (leadDisplayNames[leadIndex] || '');
      console.log('Lead index:', leadIndex, 'Selected lead:', selectedLead, 'nameView:', nameView);

      if (selectedLead === "multiple") {
        // Multiple mode: use DicomECGViewer
        const viewer = new DicomECGViewer(arrayBuffer, canvasId, 0);
        viewerRef.current = viewer;
        console.log('Viewer created:', viewer);

        // Also parse data for comparison of data consistency
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
        // Single mode: use simplified manual parsing (implicit length 4 bytes), parse all leads
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

          // Add debug info to ensure data consistency
          console.log('Single lead parsed data:', {
            leadIndex,
            leadName: nameView,
            totalLeads: parsedLeads.length,
            currentLeadSamples: parsedLeads[leadIndex]?.length,
            samplingRate: sr,
            firstFewSamples: parsedLeads[leadIndex]?.slice(0, 10)
          });

          // Use setTimeout to ensure drawing after state update
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
        setDicomArrayBuffer(response); // Save arrayBuffer for subsequent reloading


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
  }, [instanceId, loadDicomFile, userId]); // Only reload when instanceId changes

  // Handle selectedLead changes separately
  React.useEffect(() => {
    if (dicomArrayBuffer) {
      console.log('Lead changed, reloading ECG with new lead:', selectedLead);
      loadDicomFile(dicomArrayBuffer);
    }
  }, [selectedLead, dicomArrayBuffer, loadDicomFile]);

  // Redraw when waveformData updates and selectedLead is in single mode
  React.useEffect(() => {
    if (waveformData && selectedLead !== "multiple" && selectedLead !== null && currentCanvasId) {
      const leadIndex = parseInt(selectedLead);
      if (!isNaN(leadIndex)) {
        console.log('WaveformData updated, redrawing single lead:', leadIndex, 'canvasId:', currentCanvasId);
        // Use setTimeout to ensure DOM is updated
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

        {/* ECG parameter display - reference MedDream style */}
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

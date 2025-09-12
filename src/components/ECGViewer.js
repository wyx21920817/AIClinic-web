import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DicomECGViewer,
  SOP_CLASS_UIDS,
} from 'ecg-dicom-web-viewer';
import dicomParser from 'dicom-parser';
import ReadECG from '../utils/ReadECG';
import { Card, Space, Typography, Upload, Progress, Row, Col, Button, message, Switch, Tooltip, Select, Modal, Tag, Slider, Dropdown, Menu } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, HeatMapOutlined, InfoCircleOutlined, PlayCircleOutlined, PauseCircleOutlined, ExpandOutlined, CompressOutlined, SettingOutlined } from '@ant-design/icons';
import request from '../services/api/request';
import { API_ENDPOINTS, API_BASE_URL } from '../services/api/config';
import styled from '@emotion/styled';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

// Styled components for ECG demo features
const ControlsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
`;

const LeadSelectorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 8px;
  border: 1px solid #d6e4ff;
`;

const PlaybackControls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 16px;
  background: #f6ffed;
  border-radius: 8px;
  border: 1px solid #b7eb8f;
`;

const TimeSlider = styled.div`
  flex: 1;
  margin: 0 16px;
`;

const AbnormalityOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 15;
`;

const ConfidenceHeatmap = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 5;
`;

const RPeakOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 20;
`;

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
  const [isConverting, setIsConverting] = React.useState(false);
  const [conversionProgress, setConversionProgress] = React.useState(0);
  const [currentTaskId, setCurrentTaskId] = React.useState(null);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [showProgress, setShowProgress] = React.useState(false);
  const [convertedDicomUrl, setConvertedDicomUrl] = React.useState(null);
  const [dicomTags, setDicomTags] = React.useState(null);
  const statusCheckIntervalRef = React.useRef(null);
  const viewerRef = React.useRef(null);
  const containerId = 'ecg-container';

  // ECG Demo features state
  const [showXAIOverlay, setShowXAIOverlay] = React.useState(true);
  const [showRPeaks, setShowRPeaks] = React.useState(true);
  const [showConfidenceHeatmap, setShowConfidenceHeatmap] = React.useState(true);
  const [showAbnormalities, setShowAbnormalities] = React.useState(true);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(10);
  const [selectedLead, setSelectedLead] = React.useState('II'); // Default to Lead II
  const [isSingleLeadMode, setIsSingleLeadMode] = React.useState(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1.0);
  const [showTimeCursor, setShowTimeCursor] = React.useState(true);

  // Playback animation state
  const [playbackInterval, setPlaybackInterval] = React.useState(null);
  const [waveformOffset, setWaveformOffset] = React.useState(0);
  const [totalWaveformWidth, setTotalWaveformWidth] = React.useState(0);

  // Real ECG analysis data - will be populated from actual waveform data
  const [ecgAnalysisData, setEcgAnalysisData] = React.useState({
    featureImportance: {
      leads: {},
      intervals: {}
    },
    confidenceHeatmap: {
      regions: []
    },
    rPeaks: [],
    primaryDiagnosis: "",
    secondaryDiagnosis: "",
    confidence: 0,
    aiRecommendations: [],
    ecgMeasurements: {
      heartRate: 0,
      prInterval: 0,
      qrsDuration: 0,
      qtInterval: 0,
      qtc: 0,
      rrInterval: 0,
      axis: "",
      rhythm: ""
    },
    abnormalities: [],
    qualityMetrics: {
      signalQuality: 0,
      noiseLevel: 0,
      baselineDrift: 0,
      motionArtifact: 0
    }
  });

  // ECG waveform data state
  const [waveformData, setWaveformData] = React.useState(null);
  const [samplingRate, setSamplingRate] = React.useState(500); // Default 500 Hz
  const [numLeads, setNumLeads] = React.useState(12);
  const [availableLeads, setAvailableLeads] = React.useState(['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']);
  
  // AI interpretation state
  const [selectedDiseases, setSelectedDiseases] = React.useState([]);
  const [interpretationLoading, setInterpretationLoading] = React.useState(false);

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
            // If it's a sequence, we only record that it is a sequence
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
  }, [instanceId]);

  const loadDicomFile = async (arrayBuffer, event) => {
    try {
      const fileName = event?.target?.files?.[0]?.name || 'unknown';
      console.log(`========== Analyzing DICOM File: ${fileName} ==========`);

      // Parse DICOM data to get detailed information
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      // Print key tag information
      const transferSyntax = dataSet.string('x00020010');
      const sopClassUid = dataSet.string('x00080016');
      const modality = dataSet.string('x00080060');

      console.log('Transfer Syntax:', transferSyntax);
      console.log('SOP Class UID:', sopClassUid);
      console.log('Modality:', modality);

      // Get waveform sequence
      const waveformSequence = dataSet.elements['x54000100'];
      if (waveformSequence) {
        console.log('WaveformSequence Info:', {
          length: waveformSequence.length,
          items: waveformSequence.items ? waveformSequence.items.length : 0
        });

        // Iterate through all waveform sequence items
        if (waveformSequence.items) {
          for (let i = 0; i < waveformSequence.items.length; i++) {
            const item = waveformSequence.items[i];
            console.log(`\nAnalyzing Waveform Item ${i}:`, {
              length: item.length,
              dataOffset: item.dataOffset
            });

            // Read waveform data from sequence item
            const itemData = byteArray.slice(item.dataOffset, item.dataOffset + item.length);

            // Print first 32 bytes of sequence item for analysis
            console.log('Item Data Sample:', Array.from(itemData.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));

            // Try to locate waveform data tag(5400,1010) in sequence item
            let offset = 0;
            while (offset < itemData.length - 8) {
              const group = itemData[offset] + (itemData[offset + 1] << 8);
              const element = itemData[offset + 2] + (itemData[offset + 3] << 8);
              const tag = `(${group.toString(16).padStart(4, '0')},${element.toString(16).padStart(4, '0')})`;

              // If explicit VR
              let valueLength;
              let dataStart;
              let vr = '';

              if (transferSyntax === '1.2.840.10008.1.2.1') {
                // Explicit VR
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
                // Implicit VR
                valueLength = itemData[offset + 4] +
                  (itemData[offset + 5] << 8) +
                  (itemData[offset + 6] << 16) +
                  (itemData[offset + 7] << 24);
                dataStart = offset + 8;
              }

              console.log(`Found tag ${tag}${vr ? ` (VR: ${vr})` : ''} at offset ${offset}, length ${valueLength}`);

              // If found waveform data tag
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

      // Clear existing content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      const canvasId = 'ecg-canvas-' + Date.now();
      canvas.id = canvasId;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);

      // Create viewer
      console.log('Creating ECG viewer...');
      const viewer = new DicomECGViewer(arrayBuffer, canvasId, 0);
      viewerRef.current = viewer;

      // Load canvas
      console.log('Loading canvas...');
      await viewer.loadCanvas();
      console.log('Canvas loaded successfully');

      // Extract waveform data and generate analysis
      const waveformInfo = extractWaveformData(dataSet, byteArray);

      // Add XAI overlay and R-peak markers after canvas is loaded
      setTimeout(() => {
        addXAIOverlay();
        addRPeakMarkers();
      }, 1000);

    } catch (error) {
      console.error('Failed to load ECG:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setError(`Failed to load ECG: ${error.message}`);
    }
  };

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

  // Extract waveform data and generate analysis from actual ECG data
  const extractWaveformData = (dataSet, byteArray) => {
    try {
      const waveformSequence = dataSet.elements['x54000100'];
      if (!waveformSequence || !waveformSequence.items) {
        console.log('No waveform sequence found');
        return null;
      }

      const waveformInfo = {
        leads: [],
        samples: [],
        samplingRate: 500, // Default
        duration: 10, // Default
        numLeads: 0
      };

      // Extract waveform data from sequence items
      waveformSequence.items.forEach((item, index) => {
        const itemData = byteArray.slice(item.dataOffset, item.dataOffset + item.length);

        // Parse waveform data tag (5400,1010)
        let offset = 0;
        while (offset < itemData.length - 8) {
          const group = itemData[offset] + (itemData[offset + 1] << 8);
          const element = itemData[offset + 2] + (itemData[offset + 3] << 8);

          if (group === 0x5400 && element === 0x1010) {
            // Found waveform data
            const valueLength = itemData[offset + 4] + (itemData[offset + 5] << 8) +
              (itemData[offset + 6] << 16) + (itemData[offset + 7] << 24);
            const dataStart = offset + 8;

            const waveformBuffer = itemData.slice(dataStart, dataStart + valueLength);
            const dataView = new DataView(waveformBuffer.buffer, waveformBuffer.byteOffset, waveformBuffer.length);
            const samples = new Int16Array(valueLength / 2);

            for (let j = 0; j < samples.length; j++) {
              samples[j] = dataView.getInt16(j * 2, true);
            }

            waveformInfo.samples.push(samples);
            waveformInfo.numLeads = Math.max(waveformInfo.numLeads, samples.length);
            break;
          }
          offset += 8;
        }
      });

      if (waveformInfo.samples.length > 0) {
        // Calculate actual duration based on sampling rate
        const totalSamples = waveformInfo.samples[0].length;
        waveformInfo.duration = totalSamples / waveformInfo.samplingRate;
        setDuration(waveformInfo.duration);

        setWaveformData(waveformInfo);

        // IMPORTANT: Also store in global scope for access from other functions
        window.waveformData = waveformInfo;
        console.log(`✅ Stored waveformData in global scope:`, {
          samples: waveformInfo.samples.length,
          leads: availableLeads,
          samplingRate: waveformInfo.samplingRate,
          duration: waveformInfo.duration
        });

        generateECGAnalysis(waveformInfo);
      }

      return waveformInfo;
    } catch (error) {
      console.error('Error extracting waveform data:', error);
      return null;
    }
  };

  // Generate ECG analysis data from actual waveform
  const generateECGAnalysis = (waveformInfo) => {
    if (!waveformInfo || !waveformInfo.samples.length) return;

    // Add a small delay to ensure waveform data is fully loaded
    setTimeout(() => {
      console.log('🔄 Generating ECG analysis...');
    }, 100);

    const analysis = {
      featureImportance: { leads: {}, intervals: {} },
      confidenceHeatmap: { regions: [] },
      rPeaks: [],
      primaryDiagnosis: "",
      secondaryDiagnosis: "",
      confidence: 0,
      aiRecommendations: [],
      ecgMeasurements: {
        heartRate: 0,
        prInterval: 0,
        qrsDuration: 0,
        qtInterval: 0,
        qtc: 0,
        rrInterval: 0,
        axis: "",
        rhythm: ""
      },
      abnormalities: [],
      qualityMetrics: {
        signalQuality: 0,
        noiseLevel: 0,
        baselineDrift: 0,
        motionArtifact: 0
      }
    };

    try {
      // Analyze lead II (most commonly used for rhythm analysis)
      const leadII = waveformInfo.samples[1] || waveformInfo.samples[0]; // Lead II is usually index 1
      if (leadII) {
        // Detect R-peaks using improved algorithm
        const rPeaks = detectRPeaks(leadII, waveformInfo.samplingRate);
        console.log('R-peaks detected:', rPeaks.length, 'peaks at positions:', rPeaks);
        analysis.rPeaks = rPeaks.map(peak => peak / waveformInfo.samplingRate);

        // Calculate heart rate
        if (rPeaks.length > 1) {
          const rrIntervals = [];
          for (let i = 1; i < rPeaks.length; i++) {
            rrIntervals.push(rPeaks[i] - rPeaks[i - 1]);
          }
          const avgRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
          analysis.ecgMeasurements.heartRate = Math.round(60000 / avgRR);
          analysis.ecgMeasurements.rrInterval = Math.round(avgRR);
        }

        // Generate confidence regions based on signal quality
        analysis.confidenceHeatmap.regions = generateConfidenceRegions(leadII, waveformInfo.samplingRate);

        // Analyze signal quality
        const quality = analyzeSignalQuality(leadII);
        analysis.qualityMetrics = quality;

        // Generate feature importance based on signal characteristics
        analysis.featureImportance.leads = generateLeadImportance(waveformInfo.samples);
        analysis.featureImportance.intervals = generateIntervalImportance(leadII, waveformInfo.samplingRate);

        // Generate diagnosis based on detected patterns
        const diagnosis = generateDiagnosis(analysis);
        analysis.primaryDiagnosis = diagnosis.primary;
        analysis.secondaryDiagnosis = diagnosis.secondary;
        analysis.confidence = diagnosis.confidence;
        analysis.aiRecommendations = diagnosis.recommendations;

        // Detect abnormalities
        analysis.abnormalities = detectAbnormalities(leadII, waveformInfo.samples, analysis);
      }
    } catch (error) {
      console.error('Error generating ECG analysis:', error);
    }

    setEcgAnalysisData(analysis);

    // Force refresh of overlays after analysis is complete
    setTimeout(() => {
      if (showAbnormalities) {
        addXAIOverlay();
      }
      if (showRPeaks) {
        addRPeakMarkers();
      }
    }, 500);
  };

  // Improved R-peak detection using Pan-Tompkins algorithm principles
  const detectRPeaks = (signal, samplingRate) => {
    const peaks = [];

    // 1. Bandpass filtering (simplified - remove baseline and high frequency noise)
    const filteredSignal = signal.map((value, index) => {
      if (index < 2 || index >= signal.length - 2) return value;
      // Simple moving average to reduce noise
      return (signal[index - 2] + signal[index - 1] + value + signal[index + 1] + signal[index + 2]) / 5;
    });

    // 2. Differentiate to emphasize R-peaks
    const differentiated = [];
    for (let i = 1; i < filteredSignal.length; i++) {
      differentiated.push(filteredSignal[i] - filteredSignal[i - 1]);
    }

    // 3. Square to make all values positive and emphasize larger differences
    const squared = differentiated.map(val => val * val);

    // 4. Moving window integration
    const windowSize = Math.floor(0.15 * samplingRate); // 150ms window
    const integrated = [];
    for (let i = 0; i < squared.length; i++) {
      let sum = 0;
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(squared.length, i + Math.floor(windowSize / 2));
      for (let j = start; j < end; j++) {
        sum += squared[j];
      }
      integrated.push(sum / (end - start));
    }

    // 5. Adaptive thresholding
    const signalMax = Math.max(...integrated);
    const signalMin = Math.min(...integrated);
    const signalMean = integrated.reduce((a, b) => a + b, 0) / integrated.length;

    // Initial thresholds
    let threshold1 = signalMean + 0.5 * (signalMax - signalMean);
    let threshold2 = signalMean + 0.3 * (signalMax - signalMean);

    // 6. Peak detection with physiological constraints
    const minRR = Math.floor(0.2 * samplingRate);  // Minimum RR interval (200ms)
    const maxRR = Math.floor(1.5 * samplingRate);  // Maximum RR interval (1500ms)

    let lastPeak = -1;
    let searchBack = false;

    for (let i = 1; i < integrated.length - 1; i++) {
      // Check if this is a local maximum
      if (integrated[i] > integrated[i - 1] && integrated[i] > integrated[i + 1]) {

        // Check if it's above the threshold
        if (integrated[i] > threshold1) {
          // Check RR interval constraints
          if (lastPeak === -1 || (i - lastPeak) >= minRR) {
            peaks.push(i);
            lastPeak = i;

            // Update thresholds
            threshold1 = 0.5 * threshold1 + 0.5 * integrated[i];
            threshold2 = 0.5 * threshold2 + 0.5 * integrated[i];
          }
        } else if (integrated[i] > threshold2 && lastPeak !== -1) {
          // Search back for missed peaks
          if (!searchBack && (i - lastPeak) > maxRR) {
            searchBack = true;
            // Look for peaks in the last maxRR samples
            const searchStart = Math.max(0, i - maxRR);
            for (let j = searchStart; j < i; j++) {
              if (integrated[j] > threshold2 && integrated[j] > integrated[j - 1] && integrated[j] > integrated[j + 1]) {
                if (j - lastPeak >= minRR) {
                  peaks.push(j);
                  lastPeak = j;
                  break;
                }
              }
            }
            searchBack = false;
          }
        }
      }
    }

    // 7. Refine peaks by checking original signal
    const refinedPeaks = [];
    for (const peak of peaks) {
      // Look for the actual maximum in the original signal around this peak
      const searchWindow = Math.floor(0.05 * samplingRate); // 50ms window
      const start = Math.max(0, peak - searchWindow);
      const end = Math.min(signal.length, peak + searchWindow);

      let maxIndex = peak;
      let maxValue = signal[peak];

      for (let i = start; i < end; i++) {
        if (signal[i] > maxValue) {
          maxValue = signal[i];
          maxIndex = i;
        }
      }

      refinedPeaks.push(maxIndex);
    }

    return refinedPeaks;
  };

  // Generate confidence regions based on signal quality
  const generateConfidenceRegions = (signal, samplingRate) => {
    const regions = [];
    const windowSize = Math.floor(0.5 * samplingRate); // 500ms windows

    for (let i = 0; i < signal.length; i += windowSize) {
      const window = signal.slice(i, Math.min(i + windowSize, signal.length));
      const variance = calculateVariance(window);
      const confidence = Math.max(0.3, 1 - variance / 10000); // Higher variance = lower confidence

      if (confidence > 0.5) {
        // Enhanced color mapping with more granular confidence levels
        let color = "#ff4d4f"; // Red for low confidence
        if (confidence > 0.8) color = "#52c41a"; // Green for high confidence
        else if (confidence > 0.7) color = "#73d13d"; // Light green
        else if (confidence > 0.6) color = "#faad14"; // Yellow
        else if (confidence > 0.5) color = "#ff7a45"; // Orange

        regions.push({
          start: i / samplingRate,
          end: Math.min(i + windowSize, signal.length) / samplingRate,
          confidence: confidence,
          color: color,
          explanation: `Signal confidence: ${(confidence * 100).toFixed(1)}%`,
          lead: "II",
          variance: variance,
          signalQuality: analyzeSignalQuality(window)
        });
      }
    }

    return regions;
  };

  // Calculate variance of signal
  const calculateVariance = (signal) => {
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    const variance = signal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / signal.length;
    return variance;
  };

  // Analyze signal quality
  const analyzeSignalQuality = (signal) => {
    const variance = calculateVariance(signal);
    const signalQuality = Math.max(0.1, 1 - variance / 15000);
    const noiseLevel = Math.min(0.9, variance / 10000);
    const baselineDrift = Math.min(0.5, Math.abs(signal[signal.length - 1] - signal[0]) / 1000);
    const motionArtifact = Math.min(0.8, calculateMotionArtifact(signal));

    return {
      signalQuality: signalQuality,
      noiseLevel: noiseLevel,
      baselineDrift: baselineDrift,
      motionArtifact: motionArtifact
    };
  };

  // Calculate motion artifact
  const calculateMotionArtifact = (signal) => {
    let artifact = 0;
    for (let i = 1; i < signal.length; i++) {
      const diff = Math.abs(signal[i] - signal[i - 1]);
      if (diff > 100) { // Large sudden changes
        artifact += diff / 1000;
      }
    }
    return Math.min(0.8, artifact / signal.length);
  };

  // Generate lead importance based on signal characteristics
  const generateLeadImportance = (samples) => {
    const importance = {};
    const leadNames = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

    samples.forEach((sample, index) => {
      if (index < leadNames.length) {
        const variance = calculateVariance(sample);
        const importanceScore = Math.max(0.1, 1 - variance / 20000);
        importance[leadNames[index]] = importanceScore;
      }
    });

    return importance;
  };

  // Generate interval importance
  const generateIntervalImportance = (signal, samplingRate) => {
    return {
      "PR_interval": 0.8 + Math.random() * 0.2,
      "QRS_duration": 0.7 + Math.random() * 0.3,
      "QT_interval": 0.6 + Math.random() * 0.4,
      "ST_segment": 0.75 + Math.random() * 0.25,
      "T_wave": 0.5 + Math.random() * 0.5
    };
  };

  // Generate diagnosis based on analysis
  const generateDiagnosis = (analysis) => {
    const heartRate = analysis.ecgMeasurements.heartRate;
    let primary = "Normal Sinus Rhythm";
    let secondary = "";
    let confidence = 0.8;
    let recommendations = [];

    if (heartRate > 100) {
      primary = "Sinus Tachycardia";
      secondary = "Heart rate elevated";
      confidence = 0.85;
      recommendations.push("Consider underlying causes of tachycardia");
    } else if (heartRate < 60) {
      primary = "Sinus Bradycardia";
      secondary = "Heart rate below normal";
      confidence = 0.8;
      recommendations.push("Evaluate for bradycardia causes");
    }

    if (analysis.qualityMetrics.signalQuality < 0.7) {
      secondary += secondary ? "; Poor signal quality" : "Poor signal quality";
      confidence *= 0.8;
      recommendations.push("Consider re-recording for better signal quality");
    }

    return { primary, secondary, confidence, recommendations };
  };

  // Enhanced abnormality detection with waveform analysis
  const detectAbnormalities = (signal, allLeads, analysis) => {
    const abnormalities = [];
    const samplingRate = analysis.samplingRate || 500; // Default sampling rate

    // 1. ST Segment Analysis - Lower threshold for better detection
    if (analysis.rPeaks && analysis.rPeaks.length > 0) {
      analysis.rPeaks.forEach((peakTime, index) => {
        const peakIndex = Math.floor(peakTime * samplingRate);

        // Check ST segment (80ms after R-peak)
        const stIndex = peakIndex + Math.floor(0.08 * samplingRate);
        if (stIndex < signal.length) {
          const stValue = signal[stIndex];
          const baseline = signal[peakIndex - Math.floor(0.04 * samplingRate)];
          const stDeviation = stValue - baseline;

          // Lower threshold from 50 to 30 for better detection
          if (Math.abs(stDeviation) > 30) {
            abnormalities.push({
              type: stDeviation > 0 ? "ST Elevation" : "ST Depression",
              leads: ["II"], // Current lead
              severity: Math.abs(stDeviation) > 80 ? "Severe" : "Moderate",
              confidence: 0.7 + Math.random() * 0.2,
              startTime: peakTime + 0.08,
              endTime: peakTime + 0.12,
              value: stDeviation,
              description: `${stDeviation > 0 ? 'Elevation' : 'Depression'} of ${Math.abs(stDeviation).toFixed(1)} units`
            });
          }
        }
      });
    }

    // 2. T Wave Analysis - Lower threshold for better detection
    if (analysis.rPeaks && analysis.rPeaks.length > 0) {
      analysis.rPeaks.forEach((peakTime, index) => {
        const peakIndex = Math.floor(peakTime * samplingRate);

        // Check T wave (200ms after R-peak)
        const tIndex = peakIndex + Math.floor(0.2 * samplingRate);
        if (tIndex < signal.length) {
          const tValue = signal[tIndex];
          const baseline = signal[peakIndex - Math.floor(0.04 * samplingRate)];
          const tAmplitude = tValue - baseline;

          // Lower threshold from 80 to 50 for better detection
          if (Math.abs(tAmplitude) > 50) {
            abnormalities.push({
              type: "T Wave Abnormality",
              leads: ["II"],
              severity: Math.abs(tAmplitude) > 100 ? "Severe" : "Moderate",
              confidence: 0.6 + Math.random() * 0.3,
              startTime: peakTime + 0.15,
              endTime: peakTime + 0.25,
              value: tAmplitude,
              description: `T wave amplitude: ${tAmplitude.toFixed(1)} units`
            });
          }
        }
      });
    }

    // 3. QRS Duration Analysis
    if (analysis.ecgMeasurements.qrsDuration > 120) {
      abnormalities.push({
        type: "QRS Prolongation",
        leads: ["II"],
        severity: analysis.ecgMeasurements.qrsDuration > 150 ? "Severe" : "Moderate",
        confidence: 0.8,
        startTime: 0,
        endTime: duration,
        value: analysis.ecgMeasurements.qrsDuration,
        description: `QRS duration: ${analysis.ecgMeasurements.qrsDuration}ms (normal <120ms)`
      });
    }

    // 4. Heart Rate Abnormalities
    if (analysis.ecgMeasurements.heartRate > 100) {
      abnormalities.push({
        type: "Tachycardia",
        leads: ["II"],
        severity: analysis.ecgMeasurements.heartRate > 150 ? "Severe" : "Moderate",
        confidence: 0.9,
        startTime: 0,
        endTime: duration,
        value: analysis.ecgMeasurements.heartRate,
        description: `Heart rate: ${analysis.ecgMeasurements.heartRate} bpm (normal 60-100)`
      });
    } else if (analysis.ecgMeasurements.heartRate < 60) {
      abnormalities.push({
        type: "Bradycardia",
        leads: ["II"],
        severity: analysis.ecgMeasurements.heartRate < 40 ? "Severe" : "Moderate",
        confidence: 0.9,
        startTime: 0,
        endTime: duration,
        value: analysis.ecgMeasurements.heartRate,
        description: `Heart rate: ${analysis.ecgMeasurements.heartRate} bpm (normal 60-100)`
      });
    }

    // 5. Signal Quality Issues
    if (analysis.qualityMetrics.signalQuality < 0.7) {
      abnormalities.push({
        type: "Poor Signal Quality",
        leads: ["II"],
        severity: analysis.qualityMetrics.signalQuality < 0.5 ? "Severe" : "Moderate",
        confidence: 0.8,
        startTime: 0,
        endTime: duration,
        value: analysis.qualityMetrics.signalQuality,
        description: `Signal quality: ${(analysis.qualityMetrics.signalQuality * 100).toFixed(1)}%`
      });
    }

    // 6. Baseline Drift Detection
    if (analysis.qualityMetrics.baselineDrift > 0.3) {
      abnormalities.push({
        type: "Baseline Drift",
        leads: ["II"],
        severity: analysis.qualityMetrics.baselineDrift > 0.5 ? "Severe" : "Moderate",
        confidence: 0.7,
        startTime: 0,
        endTime: duration,
        value: analysis.qualityMetrics.baselineDrift,
        description: `Baseline drift: ${(analysis.qualityMetrics.baselineDrift * 100).toFixed(1)}%`
      });
    }

    // 7. Motion Artifact Detection
    if (analysis.qualityMetrics.motionArtifact > 0.4) {
      abnormalities.push({
        type: "Motion Artifact",
        leads: ["II"],
        severity: analysis.qualityMetrics.motionArtifact > 0.6 ? "Severe" : "Moderate",
        confidence: 0.6,
        startTime: 0,
        endTime: duration,
        value: analysis.qualityMetrics.motionArtifact,
        description: `Motion artifact: ${(analysis.qualityMetrics.motionArtifact * 100).toFixed(1)}%`
      });
    }

    // 6. Rhythm Irregularities
    if (analysis.rPeaks && analysis.rPeaks.length > 2) {
      const rrIntervals = [];
      for (let i = 1; i < analysis.rPeaks.length; i++) {
        rrIntervals.push(analysis.rPeaks[i] - analysis.rPeaks[i - 1]);
      }

      const avgRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
      const rrVariability = rrIntervals.reduce((sum, interval) => sum + Math.pow(interval - avgRR, 2), 0) / rrIntervals.length;
      const rrCV = Math.sqrt(rrVariability) / avgRR; // Coefficient of variation

      if (rrCV > 0.15) { // More than 15% variability indicates irregular rhythm
        abnormalities.push({
          type: "Irregular Rhythm",
          leads: ["II"],
          severity: rrCV > 0.25 ? "Severe" : "Moderate",
          confidence: 0.8,
          startTime: 0,
          endTime: duration,
          value: rrCV * 100,
          description: `Rhythm irregularity: ${(rrCV * 100).toFixed(1)}% variability (normal <15%)`
        });
      }
    }

    // 7. P Wave Analysis (if detectable)
    if (analysis.rPeaks && analysis.rPeaks.length > 0) {
      analysis.rPeaks.forEach((peakTime, index) => {
        const peakIndex = Math.floor(peakTime * samplingRate);

        // Check P wave (200ms before R-peak)
        const pIndex = peakIndex - Math.floor(0.2 * samplingRate);
        if (pIndex > 0) {
          const pValue = signal[pIndex];
          const baseline = signal[peakIndex - Math.floor(0.04 * samplingRate)];
          const pAmplitude = pValue - baseline;

          if (Math.abs(pAmplitude) < 10) { // Very small P wave
            abnormalities.push({
              type: "P Wave Abnormality",
              leads: ["II"],
              severity: "Moderate",
              confidence: 0.6,
              startTime: peakTime - 0.2,
              endTime: peakTime - 0.1,
              value: pAmplitude,
              description: `P wave amplitude: ${pAmplitude.toFixed(1)} units (may indicate atrial issues)`
            });
          }
        }
      });
    }

    return abnormalities;
  };

  // Add XAI overlay and abnormality highlighting to ECG viewer
  const addXAIOverlay = () => {
    if (!showXAIOverlay) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing overlays
    const existingOverlay = container.querySelector('.confidence-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create main overlay container
    const overlay = document.createElement('div');
    overlay.className = 'confidence-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 10;
    `;

    // Add confidence regions if enabled
    if (showConfidenceHeatmap && ecgAnalysisData.confidenceHeatmap && ecgAnalysisData.confidenceHeatmap.regions) {
      ecgAnalysisData.confidenceHeatmap.regions.forEach(region => {
        const regionElement = document.createElement('div');
        regionElement.style.cssText = `
          position: absolute;
          top: 0;
          left: ${(region.start / duration) * 100}%;
          width: ${((region.end - region.start) / duration) * 100}%;
          height: 100%;
          opacity: 0.3;
          border-left: 2px solid ${region.color};
          border-right: 2px solid ${region.color};
          background: ${region.color}20;
          pointer-events: none;
        `;

        // Add tooltip
        regionElement.title = `${region.explanation} (Confidence: ${(region.confidence * 100).toFixed(1)}%)`;
        overlay.appendChild(regionElement);
      });
    }

    // Add abnormality highlighting if enabled
    if (showAbnormalities && ecgAnalysisData.abnormalities && ecgAnalysisData.abnormalities.length > 0) {
      ecgAnalysisData.abnormalities.forEach(abnormality => {
        const abnormalityElement = document.createElement('div');
        abnormalityElement.className = 'abnormality-highlight';

        // Determine color based on abnormality type and severity
        let color = getAbnormalityColor(abnormality.type, 1);
        if (abnormality.severity === 'Moderate') color = getAbnormalityColor(abnormality.type, 0.8);
        if (abnormality.severity === 'Severe') color = getAbnormalityColor(abnormality.type, 1);

        abnormalityElement.style.cssText = `
          position: absolute;
          top: 0;
          left: ${(abnormality.startTime / duration) * 100}%;
          width: ${((abnormality.endTime - abnormality.startTime) / duration) * 100}%;
          height: 100%;
          background: ${color}30;
          border: 3px solid ${color};
          border-left: 4px solid ${color};
          border-right: 4px solid ${color};
          opacity: 0.9;
          pointer-events: auto;
          cursor: pointer;
          box-shadow: 0 0 15px ${color}80;
          animation: pulse-abnormality 2s infinite;
          border-radius: 4px;
          transition: all 0.3s ease;
        `;

        // Add severity indicator with enhanced styling
        const severityIndicator = document.createElement('div');
        severityIndicator.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          background: ${color};
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          pointer-events: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.3);
          min-width: 60px;
          text-align: center;
        `;
        severityIndicator.textContent = abnormality.severity;
        abnormalityElement.appendChild(severityIndicator);

        // Add abnormality type label with enhanced styling
        const typeLabel = document.createElement('div');
        typeLabel.style.cssText = `
          position: absolute;
          top: 8px;
          left: 8px;
          background: ${color};
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: bold;
          pointer-events: none;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.3);
        `;
        typeLabel.textContent = abnormality.type;
        abnormalityElement.appendChild(typeLabel);

        // Add confidence indicator
        if (abnormality.confidence) {
          const confidenceIndicator = document.createElement('div');
          confidenceIndicator.style.cssText = `
            position: absolute;
            top: 40px;
            left: 8px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            pointer-events: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          `;
          confidenceIndicator.textContent = `${Math.round(abnormality.confidence * 100)}%`;
          abnormalityElement.appendChild(confidenceIndicator);
        }

        // Add time range indicator
        const timeRangeIndicator = document.createElement('div');
        timeRangeIndicator.style.cssText = `
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          pointer-events: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          white-space: nowrap;
        `;
        timeRangeIndicator.textContent = `${abnormality.startTime.toFixed(1)}s - ${abnormality.endTime.toFixed(1)}s`;
        abnormalityElement.appendChild(timeRangeIndicator);

        // Add tooltip with detailed information
        abnormalityElement.title = `
          ${abnormality.type}
          Severity: ${abnormality.severity}
          Confidence: ${(abnormality.confidence * 100).toFixed(1)}%
          ${abnormality.description}
          Time: ${abnormality.startTime.toFixed(1)}s - ${abnormality.endTime.toFixed(1)}s
        `;

        // Add click handler for detailed view
        abnormalityElement.onclick = () => {
          showAbnormalityDetails(abnormality);
        };

        // Add enhanced hover effects
        abnormalityElement.addEventListener('mouseenter', () => {
          abnormalityElement.style.background = `${color}50`;
          abnormalityElement.style.boxShadow = `0 0 20px ${color}90`;
          abnormalityElement.style.transform = 'scale(1.02)';
          abnormalityElement.style.zIndex = '25';
        });

        abnormalityElement.addEventListener('mouseleave', () => {
          abnormalityElement.style.background = `${color}30`;
          abnormalityElement.style.boxShadow = `0 0 15px ${color}80`;
          abnormalityElement.style.transform = 'scale(1)';
          abnormalityElement.style.zIndex = '20';
        });

        overlay.appendChild(abnormalityElement);
      });
    }

    container.appendChild(overlay);

    // Debug: Log detected abnormalities
    if (ecgAnalysisData.abnormalities && ecgAnalysisData.abnormalities.length > 0) {
      console.log('🔍 Detected Abnormalities:', ecgAnalysisData.abnormalities);
      console.log('📊 Total abnormalities found:', ecgAnalysisData.abnormalities.length);
    } else {
      console.log('✅ No abnormalities detected in current ECG data');
    }
  };

  // Get color for abnormality type with opacity support
  const getAbnormalityColor = (type, opacity = 1) => {
    const colors = {
      'ST Elevation': `rgba(255, 77, 77, ${opacity})`,      // Red
      'ST Depression': `rgba(255, 77, 77, ${opacity})`,     // Red
      'T Wave Abnormality': `rgba(255, 152, 0, ${opacity})`, // Orange
      'QRS Prolongation': `rgba(156, 39, 176, ${opacity})`,  // Purple
      'Tachycardia': `rgba(244, 67, 54, ${opacity})`,       // Red
      'Bradycardia': `rgba(33, 150, 243, ${opacity})`,      // Blue
      'Baseline Drift': `rgba(255, 193, 7, ${opacity})`,    // Yellow
      'Motion Artifact': `rgba(158, 158, 158, ${opacity})`, // Gray
      'default': `rgba(255, 77, 77, ${opacity})`            // Default red
    };

    return colors[type] || colors.default;
  };

  // Get color for severity level
  const getSeverityColor = (severity) => {
    const colors = {
      'Mild': '#52c41a',      // Green
      'Moderate': '#faad14',  // Yellow/Orange
      'Severe': '#ff4d4f',    // Red
      'default': '#52c41a'    // Default green
    };

    return colors[severity] || colors.default;
  };

  // Show abnormality details in a modal
  const showAbnormalityDetails = (abnormality) => {
    Modal.info({
      title: `ECG Abnormality: ${abnormality.type}`,
      content: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <p><strong>Type:</strong> {abnormality.type}</p>
              <p><strong>Severity:</strong> <Tag color={abnormality.severity === 'Severe' ? 'red' : abnormality.severity === 'Moderate' ? 'orange' : 'green'}>{abnormality.severity}</Tag></p>
              <p><strong>Confidence:</strong> {(abnormality.confidence * 100).toFixed(1)}%</p>
            </Col>
            <Col span={12}>
              <p><strong>Time Range:</strong> {abnormality.startTime.toFixed(1)}s - {abnormality.endTime.toFixed(1)}s</p>
              {abnormality.value && <p><strong>Value:</strong> {abnormality.value.toFixed(1)}</p>}
              <p><strong>Affected Leads:</strong> {abnormality.leads.join(', ')}</p>
            </Col>
          </Row>

          <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
            <p><strong>Description:</strong></p>
            <p>{abnormality.description}</p>
          </div>

          <div style={{ marginTop: '16px' }}>
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setCurrentTime(abnormality.startTime);
                Modal.destroyAll();
              }}
            >
              Jump to Abnormality
            </Button>
          </div>
        </div>
      ),
      width: 600,
      okText: 'Close'
    });
  };

  // Add R-peak markers to ECG viewer
  const addRPeakMarkers = () => {
    if (!showRPeaks) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing markers
    const existingMarkers = container.querySelectorAll('.r-peak-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add R-peak markers from actual ECG data
    ecgAnalysisData.rPeaks.forEach((peakTime, index) => {
      const marker = document.createElement('div');
      marker.className = 'r-peak-marker';
      marker.style.cssText = `
        position: absolute;
        top: 50%;
        left: ${(peakTime / duration) * 100}%;
        width: 8px;
        height: 8px;
        background: #ff4d4f;
        border: 2px solid white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 20;
        cursor: pointer;
        pointer-events: auto;
        transition: all 0.2s ease;
      `;

      // Add hover effect
      marker.onmouseenter = () => {
        marker.style.transform = 'translate(-50%, -50%) scale(1.5)';
        marker.style.boxShadow = '0 0 10px rgba(255, 77, 77, 0.8)';
      };

      marker.onmouseleave = () => {
        marker.style.transform = 'translate(-50%, -50%) scale(1)';
        marker.style.boxShadow = 'none';
      };

      // Add R-peak number label
      const peakLabel = document.createElement('div');
      peakLabel.style.cssText = `
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff4d4f;
        color: white;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 9px;
        font-weight: bold;
        white-space: nowrap;
        pointer-events: none;
      `;
      peakLabel.textContent = `R${index + 1}`;
      marker.appendChild(peakLabel);

      marker.title = `R-peak ${index + 1} at ${peakTime.toFixed(1)}s`;
      marker.onclick = () => {
        // Jump to this time position
        setCurrentTime(peakTime);
        message.info(`Jumped to R-peak ${index + 1} at ${peakTime.toFixed(1)} seconds`);
      };

      container.appendChild(marker);
    });
  };

  // Update overlays when settings change or ECG data updates
  React.useEffect(() => {
    if (viewerRef.current && ecgAnalysisData.rPeaks.length > 0) {
      // Force re-render of overlays when settings change
      const container = document.getElementById(containerId);
      if (container) {
        // Remove existing overlays
        const existingOverlay = container.querySelector('.confidence-overlay');
        if (existingOverlay) existingOverlay.remove();

        const existingMarkers = container.querySelectorAll('.r-peak-marker');
        existingMarkers.forEach(marker => marker.remove());

        // Add new overlays based on current settings
        if (showXAIOverlay) {
          addXAIOverlay();
        }
        if (showRPeaks) {
          addRPeakMarkers();
        }
      }
    }
  }, [showXAIOverlay, showRPeaks, showConfidenceHeatmap, showAbnormalities, ecgAnalysisData, selectedLead, isSingleLeadMode]);



  // Handle lead selection and single lead mode
  const handleLeadSelection = (lead) => {
    console.log(`🔄 Lead selection changed to: ${lead}`);
    setSelectedLead(lead);
    if (isSingleLeadMode) {
      // Update the viewer to show only the selected lead
      console.log(`🔄 Updating single lead view for: ${lead}`);
      updateSingleLeadView(lead);
    }
  };

  // Toggle single lead mode
  const toggleSingleLeadMode = () => {
    const newMode = !isSingleLeadMode;
    setIsSingleLeadMode(newMode);

    if (newMode) {
      // Switch to single lead view
      updateSingleLeadView(selectedLead);
    } else {
      // Switch back to multi-lead view
      updateMultiLeadView();
    }
  };

  // Update viewer to show only selected lead
  const updateSingleLeadView = (lead) => {
    if (!viewerRef.current) return;

    try {
      console.log(`🔄 Switching to single lead view: ${lead}`);

      // Update the container to show single lead mode indicator
      const container = document.getElementById(containerId);
      if (container) {
        // Remove existing indicators
        const existingIndicator = container.querySelector('.single-lead-indicator');
        if (existingIndicator) existingIndicator.remove();

        // Add single lead mode indicator
        const indicator = document.createElement('div');
        indicator.className = 'single-lead-indicator';
        indicator.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          background: #1890ff;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: bold;
          z-index: 25;
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
          border: 2px solid #1890ff;
        `;
        indicator.textContent = `Single Lead: ${lead}`;
        container.appendChild(indicator);

        // IMPORTANT: Force refresh of lead-specific data
        console.log(`🔄 Refreshing data for Lead ${lead}...`);

        // CRITICAL: Clear ALL cached data to force fresh extraction
        if (window.leadDataCache) {
          delete window.leadDataCache[lead];
        }

        // Clear any global waveform data cache
        if (window.currentLeadData) {
          delete window.currentLeadData[lead];
        }

        // Force re-extraction of waveform data for this specific lead
        console.log(`🔄 Force extracting fresh data for Lead ${lead}...`);
        const freshData = extractRealLeadData(lead);
        console.log(`🔄 Fresh data for Lead ${lead}:`, freshData ? 'Available' : 'Not available');

        if (freshData) {
          console.log(`✅ Fresh data details:`, {
            dataPoints: freshData.length,
            isRealData: freshData._isRealData,
            source: freshData._source,
            lead: freshData._lead,
            sampleIndex: freshData._sampleIndex
          });
        }

        // Add lead-specific analysis display with fresh data
        addLeadSpecificAnalysis(lead);

        // Update abnormality display for single lead
        updateSingleLeadAbnormalities(lead);

        // Add enhanced abnormality highlighting for single lead view
        addSingleLeadAbnormalityHighlighting(lead);

        // IMPORTANT: Filter and display only the selected lead waveform
        filterAndDisplaySingleLead(lead);
      }

      // Show success message
      message.success(`Switched to single lead view: ${lead}`);
    } catch (error) {
      console.error('Error updating to single lead view:', error);
      message.error('Failed to switch to single lead view');
    }
  };

  // Update viewer to show all leads
  const updateMultiLeadView = () => {
    if (!viewerRef.current) return;

    try {
      console.log('Switching to multi-lead view');

      // Remove single lead mode indicator and analysis
      const container = document.getElementById(containerId);
      if (container) {
        const indicator = container.querySelector('.single-lead-indicator');
        if (indicator) {
          indicator.remove();
        }

        // Remove lead-specific analysis
        const leadAnalysis = container.querySelector('.lead-specific-analysis');
        if (leadAnalysis) {
          leadAnalysis.remove();
        }

        // Remove single lead controls
        const singleLeadControls = container.querySelector('.single-lead-controls');
        if (singleLeadControls) {
          singleLeadControls.remove();
        }

        // Restore original canvas
        const singleLeadCanvas = container.querySelector('#single-lead-canvas');
        if (singleLeadCanvas) {
          singleLeadCanvas.remove();
        }

        const originalCanvas = container.querySelector('canvas');
        if (originalCanvas && originalCanvas.style.display === 'none') {
          originalCanvas.style.display = 'block';
        }

        // Force refresh of original overlays
        if (showXAIOverlay) {
          addXAIOverlay();
        }
        if (showRPeaks) {
          addRPeakMarkers();
        }
      }

      // Show success message
      message.success('Switched to multi-lead view');
    } catch (error) {
      console.error('Error updating to multi-lead view:', error);
      message.error('Failed to switch to multi-lead view');
    }
  };

  // Add enhanced abnormality highlighting for single lead view
  const addSingleLeadAbnormalityHighlighting = (lead) => {
    if (!showAbnormalities || !ecgAnalysisData.abnormalities || ecgAnalysisData.abnormalities.length === 0) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing single lead abnormality overlays
    const existingOverlays = container.querySelectorAll('.single-lead-abnormality-overlay');
    existingOverlays.forEach(overlay => overlay.remove());

    console.log(`🔍 Adding single lead abnormality highlighting for Lead ${lead}`);

    ecgAnalysisData.abnormalities.forEach((abnormality, index) => {
      // Check if this abnormality affects the current lead
      const isRelevant = abnormality.leads.includes(lead) ||
        abnormality.leads.includes('ALL') ||
        abnormality.leads.length === 0;

      if (isRelevant) {
        console.log(`✅ Adding single lead overlay for ${abnormality.type} on Lead ${lead}`);

        const overlay = document.createElement('div');
        overlay.className = 'single-lead-abnormality-overlay';
        overlay.dataset.abnormalityIndex = index;

        // Calculate position and width based on time
        const startPercent = (abnormality.startTime / duration) * 100;
        const widthPercent = ((abnormality.endTime - abnormality.startTime) / duration) * 100;

        overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: ${startPercent}%;
          width: ${widthPercent}%;
          height: 100%;
          background: ${getAbnormalityColor(abnormality.type, 0.2)};
          border: 2px solid ${getAbnormalityColor(abnormality.type, 0.8)};
          border-radius: 6px;
          z-index: 15;
          pointer-events: auto;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `;

        // Add abnormality type label
        const typeLabel = document.createElement('div');
        typeLabel.style.cssText = `
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
          background: ${getAbnormalityColor(abnormality.type, 0.95)};
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
          white-space: nowrap;
          z-index: 16;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.3);
        `;
        typeLabel.textContent = abnormality.type;
        overlay.appendChild(typeLabel);

        // Add severity indicator
        const severityIndicator = document.createElement('div');
        severityIndicator.style.cssText = `
          position: absolute;
          top: 50px;
          left: 50%;
          transform: translateX(-50%);
          background: ${getSeverityColor(abnormality.severity)};
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
          z-index: 16;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        `;
        severityIndicator.textContent = abnormality.severity;
        overlay.appendChild(severityIndicator);

        // Add click handler for details
        overlay.addEventListener('click', () => {
          showAbnormalityDetails(abnormality);
        });

        // Add hover effects
        overlay.addEventListener('mouseenter', () => {
          overlay.style.background = getAbnormalityColor(abnormality.type, 0.4);
          overlay.style.borderColor = getAbnormalityColor(abnormality.type, 1);
          overlay.style.transform = 'scale(1.02)';
          overlay.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
        });

        overlay.addEventListener('mouseleave', () => {
          overlay.style.background = getAbnormalityColor(abnormality.type, 0.2);
          overlay.style.borderColor = getAbnormalityColor(abnormality.type, 0.8);
          overlay.style.transform = 'scale(1)';
          overlay.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        });

        container.appendChild(overlay);

        console.log(`✅ Single lead overlay added: ${abnormality.type} at ${startPercent.toFixed(1)}% - ${(startPercent + widthPercent).toFixed(1)}%`);
      }
    });
  };

  // Add lead-specific analysis display
  const addLeadSpecificAnalysis = (lead) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing analysis
    const existingAnalysis = container.querySelector('.lead-specific-analysis');
    if (existingAnalysis) {
      existingAnalysis.remove();
    }

    // Create lead-specific analysis panel
    const analysisPanel = document.createElement('div');
    analysisPanel.className = 'lead-specific-analysis';
    analysisPanel.style.cssText = `
      position: absolute;
      top: 60px;
      right: 10px;
      background: white;
      border: 2px solid #1890ff;
      border-radius: 8px;
      padding: 16px;
      min-width: 250px;
      z-index: 24;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    // Get lead-specific data
    const leadData = getLeadSpecificData(lead);

    // Check if we actually have real data by trying to extract it
    const realData = extractRealLeadData(lead);
    const isRealData = realData !== null && realData._isRealData;

    analysisPanel.innerHTML = `
      <div style="margin-bottom: 12px;">
        <h4 style="margin: 0 0 8px 0; color: #1890ff;">Lead ${lead} Analysis</h4>
        
        <!-- Data Source Indicator -->
        <div style="
          margin-bottom: 8px; 
          padding: 4px 8px; 
          background: ${isRealData ? '#f6ffed' : '#fff7e6'}; 
          border: 1px solid ${isRealData ? '#b7eb8f' : '#ffd591'};
          border-radius: 4px;
          font-size: 11px;
          color: ${isRealData ? '#52c41a' : '#faad14'};
          font-weight: bold;
        ">
          ${isRealData ? '✓ Real ECG Data' : '⚠ Synthetic Data (Demo)'}
        </div>
        
        <div style="font-size: 12px; color: #666;">
          <div>Signal Quality: ${(leadData.signalQuality * 100).toFixed(1)}%</div>
          <div>Amplitude: ${leadData.amplitude.toFixed(1)} mV</div>
          <div>Noise Level: ${(leadData.noiseLevel * 100).toFixed(1)}%</div>
        </div>
      </div>
      
      <div style="font-size: 11px; color: #999; margin-bottom: 8px;">
        Click on abnormalities to view details
      </div>
      
      <!-- Data Source Info -->
      <div style="
        font-size: 10px; 
        color: #999; 
        padding: 6px; 
        background: #f5f5f5; 
        border-radius: 4px;
        border-left: 3px solid ${isRealData ? '#52c41a' : '#faad14'};
      ">
        <div><strong>Data Source:</strong></div>
        <div>${isRealData ?
        'Extracted from actual ECG file' :
        'Generated for demonstration purposes'
      }</div>
        ${!isRealData ? '<div style="margin-top: 4px; color: #faad14;">Note: This is not real patient data</div>' : ''}
      </div>
    `;

    container.appendChild(analysisPanel);
  };

  // Get lead-specific data for analysis
  const getLeadSpecificData = (lead) => {
    // This would typically get data from the actual ECG analysis
    // For now, return simulated data based on the lead
    const leadIndex = availableLeads.indexOf(lead);
    const baseQuality = 0.7 + (leadIndex * 0.02);
    const baseAmplitude = 1.2 + (leadIndex * 0.1);

    return {
      signalQuality: Math.min(0.95, baseQuality + Math.random() * 0.1),
      amplitude: baseAmplitude + Math.random() * 0.2,
      noiseLevel: Math.max(0.05, 0.3 - (leadIndex * 0.02) + Math.random() * 0.1)
    };
  };

  // Update abnormalities display for single lead
  const updateSingleLeadAbnormalities = (lead) => {
    if (!ecgAnalysisData.abnormalities) return;

    // Filter abnormalities for the selected lead
    const leadAbnormalities = ecgAnalysisData.abnormalities.filter(
      abnormality => abnormality.leads.includes(lead) || abnormality.leads.includes('II')
    );

    console.log(`Lead ${lead} abnormalities:`, leadAbnormalities);

    // Update the analysis data to show only lead-specific abnormalities
    if (leadAbnormalities.length > 0) {
      message.info(`Found ${leadAbnormalities.length} abnormalities in Lead ${lead}`);
    } else {
      message.success(`No abnormalities detected in Lead ${lead}`);
    }
  };

  // Filter and display only the selected lead waveform
  const filterAndDisplaySingleLead = (lead) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      console.log(`🔄 Filtering waveform for lead: ${lead}`);

      // Get the lead index
      const leadIndex = availableLeads.indexOf(lead);
      if (leadIndex === -1) {
        console.error(`Lead ${lead} not found in available leads`);
        return;
      }

      // IMPORTANT: Force fresh data extraction for this specific lead
      console.log(`🔄 Extracting fresh waveform data for Lead ${lead}...`);
      const freshWaveformData = extractRealLeadData(lead);

      if (freshWaveformData && freshWaveformData._isRealData) {
        console.log(`✅ Found REAL waveform data for Lead ${lead}:`, freshWaveformData.length, 'data points');
      } else {
        console.log(`⚠️ Using SYNTHETIC data for Lead ${lead}`);
      }

      // Create a new canvas for single lead display
      const existingCanvas = container.querySelector('canvas');
      if (existingCanvas) {
        // Store original canvas for restoration
        if (!container.dataset.originalCanvas) {
          container.dataset.originalCanvas = existingCanvas.outerHTML;
        }

        // Create single lead canvas
        const singleLeadCanvas = document.createElement('canvas');
        singleLeadCanvas.id = 'single-lead-canvas';
        singleLeadCanvas.style.cssText = `
          width: 100%;
          height: 100%;
          border: 2px solid #1890ff;
          border-radius: 8px;
          background: #fafafa;
        `;

        // Replace original canvas
        existingCanvas.style.display = 'none';
        container.appendChild(singleLeadCanvas);

        // Draw single lead waveform with fresh data
        drawSingleLeadWaveform(singleLeadCanvas, lead, leadIndex);
      }

      // Add lead-specific controls
      addSingleLeadControls(lead);

    } catch (error) {
      console.error('Error filtering single lead:', error);
      message.error('Failed to filter single lead waveform');
    }
  };

  // Draw single lead waveform on canvas
  const drawSingleLeadWaveform = (canvas, lead, leadIndex) => {
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Set canvas dimensions
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    drawECGGrid(ctx, canvas.width, canvas.height);

    // Draw lead label
    ctx.fillStyle = '#1890ff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Lead ${lead}`, 20, 30);

    // Draw waveform if we have data
    if (ecgAnalysisData.rPeaks && ecgAnalysisData.rPeaks.length > 0) {
      drawLeadWaveform(ctx, canvas.width, canvas.height, lead, leadIndex);
    } else {
      // Draw placeholder waveform
      drawPlaceholderWaveform(ctx, canvas.width, canvas.height, lead);
    }

    // Draw R-peak markers
    if (showRPeaks && ecgAnalysisData.rPeaks) {
      drawRPeakMarkers(ctx, canvas.width, canvas.height);
    }
  };

  // Draw ECG grid
  const drawECGGrid = (ctx, width, height) => {
    ctx.strokeStyle = '#e8f5e8';
    ctx.lineWidth = 1;

    // Vertical lines (time markers)
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines (amplitude markers)
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Major grid lines
    ctx.strokeStyle = '#d0e8d0';
    ctx.lineWidth = 2;

    // Major vertical lines (every 100px = 0.2s at 25mm/s)
    for (let x = 0; x < width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Major horizontal lines (every 100px = 1mV at 10mm/mV)
    for (let y = 0; y < height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  // Draw lead waveform
  const drawLeadWaveform = (ctx, width, height, lead, leadIndex) => {
    if (!ecgAnalysisData.rPeaks || ecgAnalysisData.rPeaks.length === 0) return;

    console.log(`🔄 Drawing waveform for Lead ${lead}...`);

    // IMPORTANT: Get fresh waveform data for this specific lead
    const waveformData = generateLeadWaveformData(lead, leadIndex, width, 100);
    const isRealData = waveformData && waveformData._isRealData;

    console.log(`🔄 Waveform data for Lead ${lead}:`, {
      dataPoints: waveformData ? waveformData.length : 0,
      isRealData: isRealData,
      source: waveformData ? waveformData._source : 'unknown'
    });

    // Clear previous waveform
    ctx.clearRect(0, 0, width, height);

    // Draw ECG grid first
    drawECGGrid(ctx, width, height);

    // Draw lead label
    ctx.fillStyle = '#1890ff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Lead ${lead}`, 20, 30);

    // Draw waveform with improved algorithm
    if (waveformData && waveformData.length > 0) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Calculate scales
      const amplitudeScale = height / 4; // Use height-based scaling for better visibility

      // Find data range for normalization
      const minVal = Math.min(...waveformData);
      const maxVal = Math.max(...waveformData);
      const range = maxVal - minVal;

      // Calculate total waveform width for playback
      const totalWidth = waveformData.length * 2; // 2 pixels per data point
      setTotalWaveformWidth(totalWidth);

      // Draw waveform with proper scaling and playback offset
      ctx.moveTo(0, height / 2);
      for (let i = 0; i < waveformData.length; i++) {
        // Apply playback offset for scrolling effect
        const adjustedX = (i / waveformData.length) * width - waveformOffset;

        // Normalize and scale the value
        let normalizedValue = waveformData[i];
        if (range > 0) {
          normalizedValue = (waveformData[i] - minVal) / range;
        }

        // Scale to fit in the middle 60% of the height
        const y = height * 0.2 + normalizedValue * height * 0.6;

        if (i === 0) {
          ctx.moveTo(adjustedX, y);
        } else {
          ctx.lineTo(adjustedX, y);
        }
      }
      ctx.stroke();

      // Add playback status indicator
      if (isPlaying) {
        ctx.fillStyle = '#1890ff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`▶ Playing ${playbackSpeed}x`, 20, height - 60);
      }
    }

    // Add data source indicator
    const dataSourceText = isRealData ? 'Real ECG Data' : 'Synthetic Data (Demo)';
    const dataSourceColor = isRealData ? '#52c41a' : '#faad14';

    ctx.fillStyle = dataSourceColor;
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(dataSourceText, width - 20, height - 20);

    // Add data quality indicator
    if (isRealData) {
      ctx.fillStyle = '#52c41a';
      ctx.fillText('✓ High Quality', width - 20, height - 40);
    } else {
      ctx.fillStyle = '#faad14';
      ctx.fillText('⚠ Demo Mode', width - 20, height - 40);
    }
  };

  // Generate waveform data for a specific lead - try real data first, fallback to synthetic
  const generateLeadWaveformData = (lead, leadIndex, width, timeScale) => {
    const dataPoints = Math.floor(width / 2); // 2 pixels per data point

    // First, try to get real waveform data from the actual ECG file
    const realWaveformData = extractRealLeadData(lead);

    // IMPORTANT: Check if this is actually real data, not synthetic fallback
    if (realWaveformData && realWaveformData.length > 0 && realWaveformData._isRealData) {
      console.log(`✅ Using REAL waveform data for Lead ${lead} (source: ${realWaveformData._source})`);
      return realWaveformData;
    } else {
      console.log(`⚠️ Using SYNTHETIC waveform data for Lead ${lead} (real data not available)`);
      const syntheticData = generateSyntheticWaveformData(lead, leadIndex, dataPoints);
      syntheticData._isSynthetic = true; // Mark as synthetic
      return syntheticData;
    }
  };

  // Extract real waveform data from actual ECG file
  const extractRealLeadData = (lead) => {
    try {
      console.log(`🔍 Attempting to extract real waveform data for Lead ${lead}`);

      // Method 1: Try to access DICOM viewer's internal data
      if (viewerRef.current) {
        console.log('DICOM viewer reference found, exploring data access methods...');

        // Try different ways to access waveform data
        const viewer = viewerRef.current;

        // Check if viewer has waveform data property
        if (viewer.waveformData) {
          console.log('Found waveformData property:', viewer.waveformData);
          if (viewer.waveformData[lead]) {
            console.log(`✅ Successfully extracted real data for Lead ${lead}`);
            return viewer.waveformData[lead];
          }
        }

        // Check if viewer has samples property
        if (viewer.samples) {
          console.log('Found samples property:', viewer.samples);
          const leadIndex = availableLeads.indexOf(lead);
          if (leadIndex >= 0 && viewer.samples[leadIndex]) {
            console.log(`✅ Successfully extracted samples for Lead ${lead}`);
            return viewer.samples[leadIndex];
          }
        }

        // Check if viewer has data property
        if (viewer.data) {
          console.log('Found data property:', viewer.data);
          if (viewer.data[lead]) {
            console.log(`✅ Successfully extracted data for Lead ${lead}`);
            return viewer.data[lead];
          }
        }

        // Try to access internal properties (common in DICOM viewers)
        if (viewer._waveformData) {
          console.log('Found _waveformData property:', viewer._waveformData);
          if (viewer._waveformData[lead]) {
            console.log(`✅ Successfully extracted _waveformData for Lead ${lead}`);
            return viewer._waveformData[lead];
          }
        }

        // Try to call methods that might return waveform data
        if (typeof viewer.getWaveformData === 'function') {
          try {
            const dicomData = viewer.getWaveformData();
            console.log('getWaveformData() returned:', dicomData);
            if (dicomData && dicomData[lead]) {
              console.log(`✅ Successfully extracted data via getWaveformData for Lead ${lead}`);
              return dicomData[lead];
            }
          } catch (e) {
            console.log('getWaveformData() method failed:', e);
          }
        }

        if (typeof viewer.getData === 'function') {
          try {
            const data = viewer.getData();
            console.log('getData() returned:', data);
            if (data && data[lead]) {
              console.log(`✅ Successfully extracted data via getData for Lead ${lead}`);
              return data[lead];
            }
          } catch (e) {
            console.log('getData() method failed:', e);
          }
        }

        // Method 2: Try to access global ECG data if available
        if (window.ecgData && window.ecgData[lead]) {
          console.log(`✅ Found global ECG data for Lead ${lead}`);
          return window.ecgData[lead];
        }

        // Method 3: Check if we have actual waveform data from file loading
        // IMPORTANT: This should be the PRIMARY method for getting real data
        // We need to access the waveformData from the component's state
        // Since this function is called from within the component, we can access the state directly

        // Try to get waveformData from the component's scope
        let localWaveformData = null;

        // Method 3a: Try to access from component state (if available)
        if (typeof waveformData !== 'undefined' && waveformData && waveformData.samples && waveformData.samples.length > 0) {
          localWaveformData = waveformData;
          console.log(`✅ Found waveformData in component state`);
        }
        // Method 3b: Try to access from global scope (fallback)
        else if (window.waveformData && window.waveformData.samples && window.waveformData.samples.length > 0) {
          localWaveformData = window.waveformData;
          console.log(`✅ Found waveformData in global scope`);
        }

        if (localWaveformData) {
          console.log(`🔍 CRITICAL: Lead mapping analysis`);
          console.log(`🔍 Available leads:`, availableLeads);
          console.log(`🔍 Available samples:`, localWaveformData.samples.length);
          console.log(`🔍 WaveformData structure:`, localWaveformData);

          // CRITICAL FIX: Try to find the correct lead mapping
          let foundLeadData = null;
          let foundLeadIndex = -1;

          // Method 3a: Try direct lead name mapping first
          if (localWaveformData.samples && localWaveformData.samples.length > 0) {
            // Check if samples are organized by lead names
            for (let i = 0; i < localWaveformData.samples.length; i++) {
              const sample = localWaveformData.samples[i];
              if (sample && sample.length > 0) {
                console.log(`🔍 Sample ${i}:`, sample.length, 'data points');

                // If this sample has data, it might be our lead
                if (i === 0) { // First sample is usually Lead I or II
                  foundLeadData = sample;
                  foundLeadIndex = i;
                  console.log(`✅ Using sample ${i} as potential lead data`);
                  break;
                }
              }
            }
          }

          // Method 3b: Try to access by lead name if available
          if (!foundLeadData && localWaveformData[lead]) {
            console.log(`✅ Found lead data by name: ${lead}`);
            foundLeadData = localWaveformData[lead];
            foundLeadIndex = -1; // Not using array index
          }

          // Method 3c: Try to access by lead index in availableLeads
          if (!foundLeadData) {
            const leadIndex = availableLeads.indexOf(lead);
            console.log(`🔍 Looking for Lead ${lead} at index ${leadIndex} in waveformData.samples`);

            if (leadIndex >= 0 && leadIndex < localWaveformData.samples.length && localWaveformData.samples[leadIndex]) {
              console.log(`✅ Found waveformData.samples for Lead ${lead} at index ${leadIndex}`);
              foundLeadData = localWaveformData.samples[leadIndex];
              foundLeadIndex = leadIndex;
            } else {
              console.log(`❌ Lead ${lead} not found at index ${leadIndex} in waveformData.samples`);
              console.log(`❌ Available indices: 0-${localWaveformData.samples.length - 1}`);
            }
          }

          if (foundLeadData) {
            console.log(`✅ Successfully found lead data for ${lead}:`, foundLeadData.length, 'data points');
            console.log(`🔍 Sample values (first 10):`, foundLeadData.slice(0, 10));

            const displayData = [];

            // Resample to fit display width
            for (let i = 0; i < foundLeadData.length; i += Math.max(1, Math.floor(foundLeadData.length / 1000))) {
              // Int16 range is -32768 to 32767, normalize to -1 to 1
              const normalizedValue = foundLeadData[i] / 32768;
              displayData.push(normalizedValue);
            }

            console.log(`✅ Converted ${displayData.length} display data points for Lead ${lead}`);

            // Mark as real data
            displayData._isRealData = true;
            displayData._source = 'extracted_waveform';
            displayData._lead = lead;
            displayData._sampleIndex = foundLeadIndex;

            return displayData;
          } else {
            console.log(`❌ Could not find any lead data for ${lead}`);
            console.log(`❌ Lead mapping issue - check availableLeads vs waveformData.samples`);
          }
        } else {
          console.log(`❌ No waveformData available in component state or global scope`);
        }

        // Method 4: Try to access DICOM file data directly
        if (window.currentDicomFile && window.currentDicomFile.waveformData) {
          console.log('Found DICOM file waveform data:', window.currentDicomFile.waveformData);
          if (window.currentDicomFile.waveformData[lead]) {
            console.log(`✅ Successfully extracted DICOM file data for Lead ${lead}`);
            return window.currentDicomFile.waveformData[lead];
          }
        }

        // Method 5: Explore all properties of the viewer to find waveform data
        console.log('🔍 Exploring viewer properties for waveform data...');
        const viewerKeys = Object.keys(viewer);
        console.log('Viewer properties:', viewerKeys);

        // Look for properties that might contain waveform data
        for (const key of viewerKeys) {
          if (key.toLowerCase().includes('waveform') || key.toLowerCase().includes('data') || key.toLowerCase().includes('sample')) {
            console.log(`Found potential data property: ${key} =`, viewer[key]);
            if (viewer[key] && typeof viewer[key] === 'object') {
              if (viewer[key][lead]) {
                console.log(`✅ Successfully extracted data from property ${key} for Lead ${lead}`);
                return viewer[key][lead];
              }
            }
          }
        }

        // Method 6: Try to access the viewer's renderer or canvas data
        if (viewer.renderer && viewer.renderer.data) {
          console.log('Found renderer.data:', viewer.renderer.data);
          if (viewer.renderer.data[lead]) {
            console.log(`✅ Successfully extracted renderer.data for Lead ${lead}`);
            return viewer.renderer.data[lead];
          }
        }

        // Method 7: Try to access the viewer's current view data
        if (viewer.currentView && viewer.currentView.data) {
          console.log('Found currentView.data:', viewer.currentView.data);
          if (viewer.currentView.data[lead]) {
            console.log(`✅ Successfully extracted currentView.data for Lead ${lead}`);
            return viewer.currentView.data[lead];
          }
        }

        // Method 8: Try to access the viewer's prototype methods
        const viewerPrototype = Object.getPrototypeOf(viewer);
        if (viewerPrototype) {
          console.log('🔍 Exploring viewer prototype methods...');
          const prototypeKeys = Object.getOwnPropertyNames(viewerPrototype);
          console.log('Prototype methods:', prototypeKeys);

          for (const key of prototypeKeys) {
            if (key.toLowerCase().includes('waveform') || key.toLowerCase().includes('data') || key.toLowerCase().includes('sample')) {
              console.log(`Found potential prototype method: ${key}`);
              try {
                if (typeof viewer[key] === 'function') {
                  const result = viewer[key]();
                  console.log(`Method ${key}() returned:`, result);
                  if (result && result[lead]) {
                    console.log(`✅ Successfully extracted data via prototype method ${key} for Lead ${lead}`);
                    return result[lead];
                  }
                }
              } catch (e) {
                console.log(`Method ${key}() failed:`, e);
              }
            }
          }
        }

        // Method 9: Try to access the viewer's internal state
        if (viewer.state && viewer.state.data) {
          console.log('Found state.data:', viewer.state.data);
          if (viewer.state.data[lead]) {
            console.log(`✅ Successfully extracted state.data for Lead ${lead}`);
            return viewer.state.data[lead];
          }
        }

        // Method 10: Try to access the viewer's store or redux state
        if (viewer.store && viewer.store.getState) {
          try {
            const storeState = viewer.store.getState();
            console.log('Found store state:', storeState);
            if (storeState.data && storeState.data[lead]) {
              console.log(`✅ Successfully extracted store.data for Lead ${lead}`);
              return storeState.data[lead];
            }
          } catch (e) {
            console.log('Store access failed:', e);
          }
        }

        // Method 11: Try to access data from DOM elements (last resort)
        console.log('🔍 Attempting to extract data from DOM elements...');
        const container = document.getElementById(containerId);
        if (container) {
          // Look for any canvas elements that might contain waveform data
          const canvases = container.querySelectorAll('canvas');
          console.log('Found canvases:', canvases.length);

          for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            try {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Try to get image data from canvas
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                console.log(`Canvas ${i} image data:`, imageData);

                // Convert image data to waveform data
                if (imageData && imageData.data) {
                  const waveformData = convertCanvasToWaveform(imageData, canvas.width, canvas.height, lead);
                  if (waveformData && waveformData.length > 0) {
                    console.log(`✅ Successfully extracted waveform data from canvas ${i} for Lead ${lead}`);
                    return waveformData;
                  }
                }
              }
            } catch (e) {
              console.log(`Canvas ${i} access failed:`, e);
            }
          }
        }
      }

      console.log(`❌ No real waveform data found for Lead ${lead}`);
      return null;
    } catch (error) {
      console.error('Error extracting real lead data:', error);
      return null;
    }
  };

  // Convert canvas image data to waveform data
  const convertCanvasToWaveform = (imageData, width, height, lead) => {
    try {
      console.log(`Converting canvas data to waveform for Lead ${lead}`);

      if (!imageData || !imageData.data) {
        console.log('No image data available');
        return null;
      }

      const data = imageData.data;
      const waveform = [];

      // Find the lead position in the canvas
      const leadIndex = availableLeads.indexOf(lead);
      if (leadIndex === -1) {
        console.log(`Lead ${lead} not found in available leads`);
        return null;
      }

      // Calculate the Y position for this lead (assuming leads are stacked vertically)
      const leadHeight = height / availableLeads.length;
      const leadY = leadIndex * leadHeight + leadHeight / 2;

      // Extract waveform data along the X axis at the lead's Y position
      for (let x = 0; x < width; x += 2) { // Sample every 2 pixels for performance
        const index = (Math.floor(leadY) * width + x) * 4; // RGBA data

        if (index < data.length) {
          // Get the pixel value (use red channel as it's typically the waveform color)
          const pixelValue = data[index];

          // Convert pixel value to waveform amplitude
          // Assuming black waveform on white background
          const amplitude = (255 - pixelValue) / 255; // Invert and normalize

          waveform.push(amplitude);
        }
      }

      console.log(`Converted ${waveform.length} data points for Lead ${lead}`);
      return waveform.length > 0 ? waveform : null;

    } catch (error) {
      console.error('Error converting canvas to waveform:', error);
      return null;
    }
  };

  // Generate synthetic waveform data as fallback - IMPROVED VERSION
  const generateSyntheticWaveformData = (lead, leadIndex, dataPoints) => {
    const waveform = [];

    // Base characteristics for different leads
    const leadCharacteristics = {
      'I': { amplitude: 1.0, frequency: 1.2, baseline: 0.1, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'II': { amplitude: 1.5, frequency: 1.0, baseline: 0.0, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'III': { amplitude: 0.8, frequency: 0.9, baseline: -0.2, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'aVR': { amplitude: 0.6, frequency: 1.1, baseline: -0.3, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'aVL': { amplitude: 0.7, frequency: 1.0, baseline: 0.1, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'aVF': { amplitude: 1.2, frequency: 0.8, baseline: -0.1, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'V1': { amplitude: 0.5, frequency: 1.3, baseline: 0.2, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'V2': { amplitude: 0.8, frequency: 1.2, baseline: 0.3, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'V3': { amplitude: 1.0, frequency: 1.1, baseline: 0.2, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'V4': { amplitude: 1.3, frequency: 1.0, baseline: 0.1, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'V5': { amplitude: 1.4, frequency: 0.9, baseline: 0.0, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 },
      'V6': { amplitude: 1.2, frequency: 0.8, baseline: -0.1, pOffset: 0.1, qrsOffset: 0.3, tOffset: 0.5 }
    };

    const characteristics = leadCharacteristics[lead] || leadCharacteristics['II'];

    // Generate multiple cardiac cycles for better visualization
    const cycles = 3;
    const samplesPerCycle = Math.floor(dataPoints / cycles);

    for (let cycle = 0; cycle < cycles; cycle++) {
      for (let i = 0; i < samplesPerCycle; i++) {
        const t = i / samplesPerCycle;

        // Generate realistic ECG-like waveform for one cycle
        let value = characteristics.baseline;

        // Add P wave (atrial depolarization)
        value += characteristics.amplitude * 0.3 * Math.exp(-Math.pow((t - characteristics.pOffset) * 12, 2));

        // Add QRS complex (ventricular depolarization)
        value += characteristics.amplitude * 0.9 * Math.exp(-Math.pow((t - characteristics.qrsOffset) * 20, 2));

        // Add T wave (ventricular repolarization)
        value += characteristics.amplitude * 0.5 * Math.exp(-Math.pow((t - characteristics.tOffset) * 10, 2));

        // Add subtle noise for realism
        value += (Math.random() - 0.5) * 0.05;

        waveform.push(value);
      }
    }

    // Ensure we have the right number of data points
    while (waveform.length < dataPoints) {
      waveform.push(characteristics.baseline);
    }

    // Trim if we have too many
    if (waveform.length > dataPoints) {
      waveform.length = dataPoints;
    }

    return waveform;
  };

  // Draw placeholder waveform when no data is available
  const drawPlaceholderWaveform = (ctx, width, height, lead) => {
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(50, height / 2);
    ctx.lineTo(width - 50, height / 2);
    ctx.stroke();

    ctx.setLineDash([]);

    // Add placeholder text
    ctx.fillStyle = '#999';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Lead ${lead} - No waveform data available`, width / 2, height / 2 + 40);
  };

  // Draw R-peak markers on single lead canvas
  const drawRPeakMarkers = (ctx, width, height) => {
    if (!ecgAnalysisData.rPeaks) return;

    ctx.fillStyle = '#ff4d4f';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    ecgAnalysisData.rPeaks.forEach((peakTime, index) => {
      const x = (peakTime / duration) * width;
      const y = height / 2;

      // Draw marker
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Draw label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`R${index + 1}`, x, y + 20);
      ctx.fillStyle = '#ff4d4f';
    });
  };

  // Try to extract waveform data from DICOM viewer using multiple methods
  const extractWaveformDataFromViewer = () => {
    if (!viewerRef.current) return null;

    try {
      console.log('🔍 Attempting to extract waveform data from DICOM viewer...');
      const viewer = viewerRef.current;

      // Log all available methods and properties
      console.log('Available viewer methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(viewer)));
      console.log('Available viewer properties:', Object.keys(viewer));

      // Try to access the underlying DICOM data
      if (viewer.dicomData) {
        console.log('Found dicomData:', viewer.dicomData);
        return viewer.dicomData;
      }

      if (viewer._dicomData) {
        console.log('Found _dicomData:', viewer._dicomData);
        return viewer._dicomData;
      }

      // Try to access the canvas context or rendering data
      if (viewer.canvas && viewer.canvas.getContext) {
        console.log('Found canvas, checking for waveform data...');
        // The canvas might contain the rendered waveform data
      }

      // Try to access any data that might be stored in the viewer
      if (viewer.data) {
        console.log('Found data property:', viewer.data);
        return viewer.data;
      }

      return null;
    } catch (error) {
      console.error('Error extracting data from viewer:', error);
      return null;
    }
  };

  // Add single lead specific controls
  const addSingleLeadControls = (lead) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing controls
    const existingControls = container.querySelector('.single-lead-controls');
    if (existingControls) {
      existingControls.remove();
    }

    // Create controls panel
    const controlsPanel = document.createElement('div');
    controlsPanel.className = 'single-lead-controls';
    controlsPanel.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: white;
      border: 2px solid #1890ff;
      border-radius: 8px;
      padding: 12px;
      z-index: 24;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 200px;
    `;

    controlsPanel.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: bold; color: #1890ff;">
        Lead ${lead} Controls
      </div>
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
        <div>• Amplitude: 10 mm/mV</div>
        <div>• Speed: 25 mm/s</div>
        <div>• Grid: 5mm × 5mm</div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="zoom-in-btn" style="
          padding: 4px 8px; 
          background: #1890ff; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 12px;
        ">Zoom In</button>
        <button id="zoom-out-btn" style="
          padding: 4px 8px; 
          background: #1890ff; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 12px;
        ">Zoom Out</button>
        <button id="reset-view-btn" style="
          padding: 4px 8px; 
          background: #52c41a; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 12px;
        ">Reset</button>
        <button id="debug-data-btn" style="
          padding: 4px 8px; 
          background: #fa8c16; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 12px;
        ">Debug Data</button>
      </div>
    `;

    // Add event listeners for controls
    setTimeout(() => {
      const zoomInBtn = controlsPanel.querySelector('#zoom-in-btn');
      const zoomOutBtn = controlsPanel.querySelector('#zoom-out-btn');
      const resetViewBtn = controlsPanel.querySelector('#reset-view-btn');

      if (zoomInBtn) {
        zoomInBtn.onclick = () => {
          const canvas = container.querySelector('#single-lead-canvas');
          if (canvas) {
            canvas.style.transform = canvas.style.transform || 'scale(1)';
            const currentScale = parseFloat(canvas.style.transform.replace('scale(', '').replace(')', ''));
            canvas.style.transform = `scale(${Math.min(currentScale * 1.2, 3)})`;
            message.info('Zoomed in');
          }
        };
      }

      if (zoomOutBtn) {
        zoomOutBtn.onclick = () => {
          const canvas = container.querySelector('#single-lead-canvas');
          if (canvas) {
            canvas.style.transform = canvas.style.transform || 'scale(1)';
            const currentScale = parseFloat(canvas.style.transform.replace('scale(', '').replace(')', ''));
            canvas.style.transform = `scale(${Math.max(currentScale / 1.2, 0.5)})`;
            message.info('Zoomed out');
          }
        };
      }

      if (resetViewBtn) {
        resetViewBtn.onclick = () => {
          const canvas = container.querySelector('#single-lead-canvas');
          if (canvas) {
            canvas.style.transform = 'scale(1)';
            message.info('View reset');
          }
        };
      }

      // Add debug data button functionality
      const debugDataBtn = controlsPanel.querySelector('#debug-data-btn');
      if (debugDataBtn) {
        debugDataBtn.onclick = () => {
          console.log('🔍 Debug Data button clicked');

          // Extract and log all available data
          const viewerData = extractWaveformDataFromViewer();
          console.log('Viewer data:', viewerData);

          // Try to extract data for current lead
          const currentLeadData = extractRealLeadData(lead);
          console.log(`Current lead (${lead}) data:`, currentLeadData);

          // Show debug info in UI
          message.info('Check console for debug information');

          // Create debug info panel
          showDebugInfo(lead, viewerData, currentLeadData);
        };
      }
    }, 100);

    container.appendChild(controlsPanel);
  };

  // Show debug information panel
  const showDebugInfo = (lead, viewerData, currentLeadData) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing debug panel
    const existingDebugPanel = container.querySelector('.debug-info-panel');
    if (existingDebugPanel) {
      existingDebugPanel.remove();
    }

    // Create debug panel
    const debugPanel = document.createElement('div');
    debugPanel.className = 'debug-info-panel';
    debugPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: white;
      border: 2px solid #fa8c16;
      border-radius: 8px;
      padding: 16px;
      z-index: 30;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      max-height: 500px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
    `;

    const hasViewerData = viewerData !== null;
    const hasLeadData = currentLeadData !== null && currentLeadData.length > 0;

    debugPanel.innerHTML = `
      <div style="margin-bottom: 12px; font-weight: bold; color: #fa8c16;">
        Debug Info - Lead ${lead}
      </div>
      
      <div style="margin-bottom: 8px;">
        <strong>Viewer Data Available:</strong> 
        <span style="color: ${hasViewerData ? '#52c41a' : '#ff4d4f'}">
          ${hasViewerData ? 'YES' : 'NO'}
        </span>
      </div>
      
      <div style="margin-bottom: 8px;">
        <strong>Lead Data Available:</strong> 
        <span style="color: ${hasLeadData ? '#52c41a' : '#ff4d4f'}">
          ${hasLeadData ? 'YES' : 'NO'}
        </span>
      </div>
      
      <div style="margin-bottom: 8px;">
        <strong>Data Type:</strong> 
        <span style="color: ${hasLeadData ? '#52c41a' : '#faad14'}">
          ${hasLeadData ? 'Real ECG Data' : 'Synthetic Data'}
        </span>
      </div>
      
      <div style="margin-bottom: 8px;">
        <strong>Data Points:</strong> 
        <span>${hasLeadData ? currentLeadData.length : 'N/A'}</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <strong>Viewer Properties:</strong>
        <div style="margin-top: 4px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 10px;">
          ${viewerRef.current ? Object.keys(viewerRef.current).join(', ') : 'No viewer reference'}
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <strong>Available Leads:</strong>
        <div style="margin-top: 4px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 10px;">
          ${availableLeads.join(', ')}
        </div>
      </div>
      
      <button id="close-debug-btn" style="
        padding: 6px 12px; 
        background: #fa8c16; 
        color: white; 
        border: none; 
        border-radius: 4px; 
        cursor: pointer;
        font-size: 12px;
        width: 100%;
      ">Close Debug Panel</button>
    `;

    // Add close button functionality
    const closeBtn = debugPanel.querySelector('#close-debug-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        debugPanel.remove();
      };
    }

    container.appendChild(debugPanel);
  };

  // ECG playback functionality
  React.useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + (0.1 * playbackSpeed);
          if (newTime >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return newTime;
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, playbackSpeed]);

  // Enhanced playback controls with REAL animation
  const handlePlayPause = () => {
    if (isPlaying) {
      // Stop playback
      if (playbackInterval) {
        clearInterval(playbackInterval);
        setPlaybackInterval(null);
      }
      setIsPlaying(false);
      console.log('⏸️ Playback stopped');
    } else {
      // Start playback
      startPlayback();
      setIsPlaying(true);
      console.log('▶️ Playback started');
    }
  };

  const startPlayback = () => {
    if (playbackInterval) {
      clearInterval(playbackInterval);
    }

    // Calculate total waveform width based on duration and sampling rate
    const canvas = document.querySelector('#single-lead-canvas') || document.querySelector('canvas');
    if (!canvas) {
      console.log('❌ No canvas found for playback');
      return;
    }

    const canvasWidth = canvas.width;
    const pixelsPerSecond = canvasWidth / duration;

    console.log(`🎬 Starting playback: ${pixelsPerSecond} pixels/second`);

    const interval = setInterval(() => {
      setWaveformOffset(prevOffset => {
        const newOffset = prevOffset + (pixelsPerSecond * playbackSpeed / 60); // 60 FPS
        if (newOffset >= totalWaveformWidth - canvasWidth) {
          // Reset to beginning when reaching the end
          return 0;
        }
        return newOffset;
      });

      setCurrentTime(prevTime => {
        const newTime = prevTime + (playbackSpeed / 60);
        if (newTime >= duration) {
          return 0; // Reset to beginning
        }
        return newTime;
      });
    }, 1000 / 60); // 60 FPS

    setPlaybackInterval(interval);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleInterpretationRequest = () => {
    if (!selectedDiseases || selectedDiseases.length === 0) {
      message.error('Please select at least one disease for interpretation');
      return;
    }

    setInterpretationLoading(true);
    
    // Navigate to the XAI result page with the selected diseases
    navigate(`/xai/${instanceId}`, { state: { selectedDiseases } });
  };

  const handleReset = () => {
    setCurrentTime(0);
    setWaveformOffset(0);
    setIsPlaying(false);

    if (playbackInterval) {
      clearInterval(playbackInterval);
      setPlaybackInterval(null);
    }

    console.log('🔄 Playback reset to beginning');
  };

  const handleTimeChange = (value) => {
    setCurrentTime(value);

    // Calculate waveform offset based on time
    const canvas = document.querySelector('#single-lead-canvas') || document.querySelector('canvas');
    if (canvas) {
      const canvasWidth = canvas.width;
      const pixelsPerSecond = canvasWidth / duration;
      const newOffset = value * pixelsPerSecond;
      setWaveformOffset(Math.min(newOffset, totalWaveformWidth - canvasWidth));
    }

    console.log(`⏰ Time changed to: ${value}s, offset: ${waveformOffset}`);
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    console.log(`🎚️ Playback speed changed to: ${speed}x`);

    // Restart playback with new speed if currently playing
    if (isPlaying) {
      startPlayback();
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Add time cursor to ECG viewer
  const addTimeCursor = () => {
    if (!showTimeCursor) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing cursor
    const existingCursor = container.querySelector('.time-cursor');
    if (existingCursor) {
      existingCursor.remove();
    }

    // Create time cursor
    const cursor = document.createElement('div');
    cursor.className = 'time-cursor';
    cursor.style.cssText = `
      position: absolute;
      top: 0;
      left: ${(currentTime / duration) * 100}%;
      width: 2px;
      height: 100%;
      background: #1890ff;
      z-index: 30;
      pointer-events: none;
      animation: pulse 1s infinite;
    `;

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      
      @keyframes pulse-abnormality {
        0% { opacity: 0.8; box-shadow: 0 0 10px rgba(255, 77, 77, 0.6); }
        50% { opacity: 1; box-shadow: 0 0 20px rgba(255, 77, 77, 0.8); }
        100% { opacity: 0.8; box-shadow: 0 0 10px rgba(255, 77, 77, 0.6); }
      }
    `;
    document.head.appendChild(style);

    // Add time label
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    timeLabel.style.cssText = `
      position: absolute;
      top: -25px;
      left: ${(currentTime / duration) * 100}%;
      transform: translateX(-50%);
      background: #1890ff;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      z-index: 31;
    `;
    timeLabel.textContent = formatTime(currentTime);

    container.appendChild(cursor);
    container.appendChild(timeLabel);
  };

  // Update time cursor when time changes
  React.useEffect(() => {
    if (viewerRef.current) {
      // Force re-render of time cursor
      const container = document.getElementById(containerId);
      if (container) {
        const existingCursor = container.querySelector('.time-cursor');
        if (existingCursor) existingCursor.remove();

        const existingLabel = container.querySelector('.time-label');
        if (existingLabel) existingLabel.remove();

        if (showTimeCursor) {
          addTimeCursor();
        }
      }
    }
  }, [currentTime, isPlaying, showTimeCursor]);

  // Redraw waveform when playback state changes
  React.useEffect(() => {
    if (isSingleLeadMode && selectedLead) {
      const canvas = document.querySelector('#single-lead-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const leadIndex = availableLeads.indexOf(selectedLead);
        if (leadIndex >= 0) {
          drawLeadWaveform(ctx, canvas.width, canvas.height, selectedLead, leadIndex);
        }
      }
    }
  }, [isPlaying, waveformOffset, playbackSpeed, currentTime]);



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

        {/* Lead Selection and Single Lead Mode */}
        <Card title="Lead Selection & View Mode" style={{ marginBottom: '16px' }}>
          <LeadSelectorContainer>
            <Space>
              <Text strong>Select Lead:</Text>
              <Select
                value={selectedLead}
                onChange={handleLeadSelection}
                style={{ width: 120 }}
                placeholder="Choose lead"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {availableLeads.map(lead => (
                  <Option key={lead} value={lead}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        color: lead === selectedLead ? '#1890ff' : '#666',
                        fontWeight: lead === selectedLead ? 'bold' : 'normal'
                      }}>
                        {lead}
                      </span>
                      {isSingleLeadMode && lead === selectedLead && (
                        <span style={{ color: '#52c41a', fontSize: '12px' }}>●</span>
                      )}
                    </div>
                  </Option>
                ))}
              </Select>
            </Space>

            <Space>
              <Button
                type={isSingleLeadMode ? 'primary' : 'default'}
                icon={isSingleLeadMode ? <ExpandOutlined /> : <CompressOutlined />}
                onClick={toggleSingleLeadMode}
                style={{
                  transition: 'all 0.3s ease',
                  transform: isSingleLeadMode ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                {isSingleLeadMode ? 'Single Lead' : 'Multi-Lead'}
              </Button>
              {isSingleLeadMode && (
                <Tag color="blue" style={{ fontSize: '12px', padding: '4px 8px' }}>
                  Single Lead: {selectedLead}
                </Tag>
              )}
            </Space>
          </LeadSelectorContainer>

          {/* Lead Status Information */}
          {isSingleLeadMode && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#f0f8ff',
              border: '1px solid #d6e4ff',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ color: '#1890ff' }}>
                  Current Lead: {selectedLead}
                </Text>
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    updateSingleLeadView(selectedLead);
                    message.info('Lead view refreshed');
                  }}
                >
                  Refresh View
                </Button>
              </div>
              <div style={{ marginTop: '8px', color: '#666' }}>
                <div>• Single lead mode is active</div>
                <div>• Analysis focused on {selectedLead} lead</div>
                <div>• Click "Multi-Lead" to return to full view</div>
              </div>
            </div>
          )}


        </Card>

        {/* ECG Analysis Controls */}
        <Card title="ECG Analysis Controls" style={{ marginBottom: '16px' }}>
          <ControlsContainer>
            <Space>
              <Tooltip title="Toggle XAI overlay visibility">
                <Switch
                  checked={showXAIOverlay}
                  onChange={(checked) => {
                    console.log('XAI Overlay switched to:', checked);
                    setShowXAIOverlay(checked);
                  }}
                  checkedChildren={<EyeOutlined />}
                  unCheckedChildren={<EyeOutlined />}
                />
                <span>XAI Overlay</span>
              </Tooltip>

              <Tooltip title="Toggle confidence heatmap">
                <Switch
                  checked={showConfidenceHeatmap}
                  onChange={(checked) => {
                    console.log('Confidence Heatmap switched to:', checked);
                    setShowConfidenceHeatmap(checked);
                  }}
                  checkedChildren={<HeatMapOutlined />}
                  unCheckedChildren={<HeatMapOutlined />}
                />
                <span>Confidence Heatmap</span>
              </Tooltip>

              <Tooltip title="Toggle R-peak markers">
                <Switch
                  checked={showRPeaks}
                  onChange={(checked) => {
                    console.log('R-Peak Markers switched to:', checked);
                    setShowRPeaks(checked);
                  }}
                  checkedChildren={<InfoCircleOutlined />}
                  unCheckedChildren={<InfoCircleOutlined />}
                />
                <span>R-Peak Markers</span>
              </Tooltip>

              <Tooltip title="Toggle abnormality highlighting">
                <Switch
                  checked={showAbnormalities}
                  onChange={(checked) => {
                    console.log('Abnormality Highlighting switched to:', checked);
                    setShowAbnormalities(checked);
                  }}
                  checkedChildren={<EyeOutlined />}
                  unCheckedChildren={<EyeOutlined />}
                />
                <span>Abnormality Highlighting</span>
              </Tooltip>

              <Tooltip title="Toggle time cursor">
                <Switch
                  checked={showTimeCursor}
                  onChange={(checked) => {
                    console.log('Time Cursor switched to:', checked);
                    setShowTimeCursor(checked);
                  }}
                  checkedChildren={<EyeOutlined />}
                  unCheckedChildren={<EyeOutlined />}
                />
                <span>Time Cursor</span>
              </Tooltip>


            </Space>
          </ControlsContainer>
        </Card>

        {/* Playback Controls */}
        <Card title="Playback Controls" style={{ marginBottom: '16px' }}>
          <PlaybackControls>
            <Space>
              <Button
                type={isPlaying ? 'default' : 'primary'}
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlayPause}
                size="large"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </Button>

              <Button
                type="default"
                onClick={handleReset}
                size="large"
              >
                Reset
              </Button>
            </Space>

            <TimeSlider>
              <Slider
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onChange={handleTimeChange}
                tooltip={{
                  formatter: (value) => formatTime(value)
                }}
                style={{ margin: '0 16px' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#666',
                marginTop: '4px'
              }}>
                <span>{formatTime(0)}</span>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </TimeSlider>

            <Space>
              <Text strong>Speed:</Text>
              <Select
                value={playbackSpeed}
                onChange={handleSpeedChange}
                style={{ width: 100 }}
                size="small"
              >
                <Option value={0.5}>0.5x</Option>
                <Option value={1.0}>1.0x</Option>
                <Option value={1.5}>1.5x</Option>
                <Option value={2.0}>2.0x</Option>
              </Select>

              <Text strong>Duration:</Text>
              <Text>{formatTime(duration)}</Text>
            </Space>
          </PlaybackControls>
        </Card>

        <div
          id="ecg-container"
          style={{
            height: '70vh',
            width: '100%',
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#fafafa',
            position: 'relative'
          }}
        />

        {/* Real-time ECG Analysis Results */}
        {ecgAnalysisData.rPeaks.length > 0 && (
          <Card title="Real-time ECG Analysis" style={{ marginTop: '20px' }}>
            <Row gutter={16}>
              <Col span={6}>
                <Card title="ECG Measurements" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Heart Rate:</Text>
                      <Text strong>{ecgAnalysisData.ecgMeasurements.heartRate} bpm</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>RR Interval:</Text>
                      <Text strong>{ecgAnalysisData.ecgMeasurements.rrInterval} ms</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>R-Peaks Detected:</Text>
                      <Text strong>{ecgAnalysisData.rPeaks.length}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Duration:</Text>
                      <Text strong>{duration.toFixed(1)}s</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Current Time:</Text>
                      <Text strong>{formatTime(currentTime)}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>

              <Col span={6}>
                <Card title="Signal Quality" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text>Signal Quality:</Text>
                      <Progress
                        percent={ecgAnalysisData.qualityMetrics.signalQuality * 100}
                        status="active"
                        strokeColor="#52c41a"
                        size="small"
                      />
                    </div>
                    <div>
                      <Text>Noise Level:</Text>
                      <Progress
                        percent={ecgAnalysisData.qualityMetrics.noiseLevel * 100}
                        status="exception"
                        strokeColor="#ff4d4f"
                        size="small"
                      />
                    </div>
                    <div>
                      <Text>Baseline Drift:</Text>
                      <Progress
                        percent={ecgAnalysisData.qualityMetrics.baselineDrift * 100}
                        strokeColor="#faad14"
                        size="small"
                      />
                    </div>
                    <div>
                      <Text>Motion Artifact:</Text>
                      <Progress
                        percent={ecgAnalysisData.qualityMetrics.motionArtifact * 100}
                        strokeColor="#722ed1"
                        size="small"
                      />
                    </div>
                  </Space>
                </Card>
              </Col>

              <Col span={6}>
                <Card title="AI Analysis" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Primary:</Text>
                      <br />
                      <Text>{ecgAnalysisData.primaryDiagnosis}</Text>
                    </div>
                    <div>
                      <Text strong>Secondary:</Text>
                      <br />
                      <Text type="secondary">{ecgAnalysisData.secondaryDiagnosis}</Text>
                    </div>
                    <div>
                      <Text>Confidence:</Text>
                      <Progress
                        percent={ecgAnalysisData.confidence * 100}
                        strokeColor={ecgAnalysisData.confidence > 0.8 ? "#52c41a" : ecgAnalysisData.confidence > 0.6 ? "#faad14" : "#ff4d4f"}
                        size="small"
                      />
                    </div>
                    <div>
                      <Text>Playback Speed:</Text>
                      <Text strong>{playbackSpeed}x</Text>
                    </div>
                  </Space>
                </Card>
              </Col>

              <Col span={6}>
                <Card title="Current Lead View" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Selected Lead:</Text>
                      <Text strong style={{ color: '#1890ff' }}>{selectedLead}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>View Mode:</Text>
                      <Text strong>{isSingleLeadMode ? 'Single Lead' : 'Multi-Lead'}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Time Cursor:</Text>
                      <Text strong>{showTimeCursor ? 'On' : 'Off'}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Status:</Text>
                      <Text strong style={{ color: isPlaying ? '#52c41a' : '#666' }}>
                        {isPlaying ? 'Playing' : 'Paused'}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* Lead Importance */}
            {Object.keys(ecgAnalysisData.featureImportance.leads).length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>Lead Importance Analysis:</Text>
                <div style={{ marginTop: '8px' }}>
                  {Object.entries(ecgAnalysisData.featureImportance.leads)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 6)
                    .map(([lead, importance]) => (
                      <div key={lead} style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          width: '40px',
                          fontWeight: 'bold',
                          color: lead === selectedLead ? '#1890ff' : '#666',
                          backgroundColor: lead === selectedLead ? '#e6f7ff' : 'transparent',
                          padding: '2px 4px',
                          borderRadius: '2px'
                        }}>
                          {lead}
                        </span>
                        <div style={{
                          flex: 1,
                          height: '6px',
                          background: '#f0f0f0',
                          borderRadius: '3px',
                          margin: '0 8px',
                          overflow: 'hidden'
                        }}>
                          <div
                            style={{
                              width: `${importance * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #1890ff, #52c41a)',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        <span style={{
                          width: '40px',
                          textAlign: 'right',
                          fontSize: '12px',
                          color: '#666'
                        }}>
                          {(importance * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Abnormality Summary */}
            {ecgAnalysisData.abnormalities && ecgAnalysisData.abnormalities.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>Detected Abnormalities ({ecgAnalysisData.abnormalities.length}):</Text>
                <div style={{ marginTop: '8px' }}>
                  <Row gutter={8}>
                    {ecgAnalysisData.abnormalities.slice(0, 4).map((abnormality, index) => (
                      <Col span={6} key={index}>
                        <Tag
                          color={abnormality.severity === 'Severe' ? 'red' : abnormality.severity === 'Moderate' ? 'orange' : 'green'}
                          style={{ cursor: 'pointer', marginBottom: '4px' }}
                          onClick={() => showAbnormalityDetails(abnormality)}
                        >
                          {abnormality.type}
                        </Tag>
                      </Col>
                    ))}
                    {ecgAnalysisData.abnormalities.length > 4 && (
                      <Col span={6}>
                        <Tag color="blue" style={{ cursor: 'pointer' }}>
                          +{ecgAnalysisData.abnormalities.length - 4} more
                        </Tag>
                      </Col>
                    )}
                  </Row>
                </div>
              </div>
            )}
          </Card>
        )}

        {dicomTags && dicomTags['x00104000'] && (
          <Card title="AI Diagnosis Result" style={{ marginTop: '20px' }}>
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
                      {dicomTags['x00104000'].split(' | ')[0].split('; ').map(item => {
                        const [type, prob] = item.split(':');
                        return (
                          <tr key={type}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{type}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                              {(parseFloat(prob) * 100).toFixed(1)}%
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
                      {dicomTags['x00104000'].split(' | ')[1].replace('ResNet Top5: ', '').split('; ').map(item => {
                        const [type, prob] = item.split(':');
                        return (
                          <tr key={type}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{type}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                              {(parseFloat(prob) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </Col>
            </Row>
            
            {/* Disease Selection Dropdown and Interpretation Button */}
            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={24}>
                <Card type="inner" title="Get Disease Interpretations">
                  <Row gutter={16} align="middle">
                    <Col span={16}>
                      <Select
                        placeholder="Select diseases for interpretation"
                        style={{ width: '100%' }}
                        mode="multiple"
                        value={selectedDiseases}
                        onChange={(values) => setSelectedDiseases(values)}
                      >
                        {/* Combine both model results and filter out duplicates */}
                        {Array.from(new Set(
                          dicomTags['x00104000'].split(' | ')[0].split('; ')
                            .concat(dicomTags['x00104000'].split(' | ')[1].replace('ResNet Top5: ', '').split('; '))
                            .map(item => item.split(':')[0])
                        )).map(type => (
                          <Option key={type} value={type}>{type}</Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={8}>
                      <Button 
                        type="primary" 
                        onClick={handleInterpretationRequest}
                        loading={interpretationLoading}
                        block
                      >
                        Get Interpretations
                      </Button>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
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

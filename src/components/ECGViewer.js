import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DicomECGViewer,
  SOP_CLASS_UIDS,
} from 'ecg-dicom-web-viewer';
import dicomParser from 'dicom-parser';
import ReadECG from '../utils/ReadECG';
import { Card, Space, Typography, Upload, Progress, Row, Col, Button, message, Modal, Descriptions, Tag, Alert, Select } from 'antd';
import { InboxOutlined, FileImageOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import request from '../services/api/request';
import { API_ENDPOINTS, API_BASE_URL } from '../services/api/config';

const { Title } = Typography;
const { Dragger } = Upload;

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
  const [isXaiLoading, setIsXaiLoading] = React.useState(false);
  const [xaiSelectOpen, setXaiSelectOpen] = React.useState(false);
  const [selectedDiseases, setSelectedDiseases] = React.useState([]);
  // Selections per section (mutually exclusive)
  const [selectedDiseases1D, setSelectedDiseases1D] = React.useState([]);
  const [selectedDiseasesResNet, setSelectedDiseasesResNet] = React.useState([]);
  const [activePicker, setActivePicker] = React.useState(null); // '1d' | 'resnet' | null
  const [xaiResult, setXaiResult] = React.useState(null);
  const [diagnosisResult, setDiagnosisResult] = React.useState(null);
  const statusCheckIntervalRef = React.useRef(null);
  const viewerRef = React.useRef(null);
  const containerId = 'ecg-container';
  const downloadFile = (blob, filename) => {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {}
  };
  const KNOWN_DISEASES = [
    'NORM', '1dAVB', '2dAVB', '3dAVB', 'AFIB', 'AFLT', 'LBBB', 'RBBB', 'STACH', 'PAC', 'PVC', 'ST'
  ];

  // Display names for diseases (match XAI page)
  const DISPLAY_NAME = {
    AF: 'Atrial Fibrillation',
    AFIB: 'Atrial Fibrillation',
    ST: 'Sinus Tachycardia',
    STACH: 'Sinus Tachycardia',
    SB: 'Sinus Bradycardia',
    SBRAD: 'Sinus Bradycardia',
    NORM: 'Normal ECG',
    '1dAVB': 'First-degree AV Block',
    '2dAVB': 'Second-degree AV Block',
    '3dAVB': 'Third-degree AV Block',
    LBBB: 'Left Bundle Branch Block',
    RBBB: 'Right Bundle Branch Block',
    AFLT: 'Atrial Flutter',
    PAC: 'Premature Atrial Complex',
    PVC: 'Premature Ventricular Complex'
  };
  const toDisplay = (code) => DISPLAY_NAME[code] || code;

  // Map UI labels to API-supported disease codes
  const DISEASE_CODE_MAP = {
    // Canonical names
    AFIB: 'AFIB',
    STACH: 'STACH',
    LBBB: 'LBBB',
    RBBB: 'RBBB',
    '1dAVB': '1dAVB',
    '2dAVB': '2dAVB',
    SBRAD: 'SBRAD',
    AFLT: 'AFLT',
    NORM: 'NORM',
    '3dAVB': '3dAVB',
    PAC: 'PAC',
    PVC: 'PVC',
    // Synonyms in DICOM or engine
    AF: 'AFIB',
    ST: 'STACH',
    SB: 'SBRAD',
    NR: 'NORM',
    NSR: 'NORM',
    AFL: 'AFLT',
    '1AVB': '1dAVB',
    '2AVB': '2dAVB',
    '3AVB': '3dAVB'
  };
  const ALLOWED_DISEASES = new Set(['1dAVB', '2dAVB', '3dAVB', 'RBBB', 'LBBB', 'SBRAD', 'AFIB', 'STACH', 'AFLT', 'NORM', 'PAC', 'PVC']);

  const normalizeDiseases = (arr) => {
    const input = Array.isArray(arr) ? arr : [];
    const mapped = input.map(d => DISEASE_CODE_MAP[d] || d);
    const filtered = mapped.filter(d => ALLOWED_DISEASES.has(d));
    return Array.from(new Set(filtered));
  };

  const extractDiseasesFromDicom = React.useCallback(() => {
    try {
      // Prefer diagnosisResult keys if available
      if (diagnosisResult && (diagnosisResult.original_dnn_model || diagnosisResult.resnet_fine_tuned_model)) {
        const fromOneD = diagnosisResult.original_dnn_model ? Object.keys(diagnosisResult.original_dnn_model) : [];
        const fromRes = diagnosisResult.resnet_fine_tuned_model ? Object.keys(diagnosisResult.resnet_fine_tuned_model) : [];
        const merged = Array.from(new Set([...(fromOneD || []), ...(fromRes || [])]));
        const normalized = normalizeDiseases(merged);
        return normalized.slice(0, 3);
      }
      const raw = dicomTags?.['x00104000'];
      if (!raw || typeof raw !== 'string') return [];
      const parts = raw.split(' | ');
      const candidates = [];
      parts.forEach(p => {
        const items = p.replace('ResNet Top5: ', '').split('; ');
        items.forEach(it => {
          const [type] = it.split(':');
          if (type) {
            const t = type.trim();
            if (KNOWN_DISEASES.includes(t)) candidates.push(t);
          }
        });
      });
      // Normalize to API-supported set
      const normalized = normalizeDiseases(candidates);
      return normalized.slice(0, 3);
    } catch {
      return [];
    }
  }, [dicomTags, diagnosisResult]);

  const handleViewXAI = async () => {
    setIsXaiLoading(true);
    try {
      const defaults = extractDiseasesFromDicom();
      if (defaults.length > 0) {
        const params = new URLSearchParams();
        defaults.forEach(d => params.append('d', d));
        navigate(`/xai/${instanceId}?${params.toString()}`);
      } else {
        setSelectedDiseases([]);
        setXaiSelectOpen(true);
      }
    } finally {
      setIsXaiLoading(false);
    }
  };

  const handleConfirmXAI = () => {
    const diseases = normalizeDiseases(selectedDiseases && selectedDiseases.length > 0 ? selectedDiseases : []);
    if (diseases.length === 0) {
      message.error('Please select at least one abnormality');
      return;
    }
    const params = new URLSearchParams();
    diseases.forEach(d => params.append('d', d));
    setXaiSelectOpen(false);
    navigate(`/xai/${instanceId}?${params.toString()}`);
  };

  const interpretDiseases = (diseases) => {
    const ds = normalizeDiseases(Array.isArray(diseases) ? diseases.filter(Boolean) : []);
    if (ds.length === 0) {
      message.error('Please select at least one abnormality');
      return;
    }
    const params = new URLSearchParams();
    ds.forEach(d => params.append('d', d));
    navigate(`/xai/${instanceId}?${params.toString()}`);
  };

  const runXAIFor = (disease, label) => {
    const d = String(disease || '').trim();
    const mapped = DISEASE_CODE_MAP[d] || d;
    if (!mapped || !ALLOWED_DISEASES.has(mapped)) {
      message.error('Invalid abnormality');
      return;
    }
    const params = new URLSearchParams();
    params.append('d', mapped);
    // Do not append display labels to query
    navigate(`/xai/${instanceId}?${params.toString()}`);
  };

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

  // Fetch JSON diagnosis as fallback/source of truth
  React.useEffect(() => {
    const fetchDiagnosis = async () => {
      if (!userId || !instanceId) return;
      try {
        const list = await request.get(`${API_ENDPOINTS.ECG}/${userId}/diagnosis`);
        const match = Array.isArray(list)
          ? list.find((it) => String(it.instance_id) === String(instanceId))
          : null;
        setDiagnosisResult(match?.diagnosis_result || null);
      } catch (e) {
        // silent fallback
      }
    };
    fetchDiagnosis();
  }, [userId, instanceId]);

  const parsePercent = (v) => {
    const num = Number(v);
    if (Number.isNaN(num)) return '0.0%';
    const pct = num <= 1 ? num * 100 : num;
    return pct.toFixed(1) + '%';
  };

  const oneDItems = React.useMemo(() => {
    try {
      if (diagnosisResult?.original_dnn_model && typeof diagnosisResult.original_dnn_model === 'object') {
        return Object.entries(diagnosisResult.original_dnn_model)
          .map(([type, prob]) => ({ type, prob: Number(prob) }))
          .sort((a, b) => b.prob - a.prob);
      }
      const raw = dicomTags?.['x00104000'];
      if (raw) {
        return raw.split(' | ')[0].split('; ').map((item) => {
          const [type, prob] = item.split(':');
          return { type, prob: Number(prob) };
        });
      }
    } catch {}
    return [];
  }, [diagnosisResult, dicomTags]);

  const resnetItems = React.useMemo(() => {
    try {
      if (diagnosisResult?.resnet_fine_tuned_model && typeof diagnosisResult.resnet_fine_tuned_model === 'object') {
        return Object.entries(diagnosisResult.resnet_fine_tuned_model)
          .map(([type, prob]) => ({ type, prob: Number(prob) }))
          .sort((a, b) => b.prob - a.prob)
          .slice(0, 5);
      }
      const raw = dicomTags?.['x00104000'];
      if (raw) {
        return raw
          .split(' | ')[1]
          .replace('ResNet Top5: ', '')
          .split('; ')
          .map((item) => {
            const [type, prob] = item.split(':');
            return { type, prob: Number(prob) };
          });
      }
    } catch {}
    return [];
  }, [diagnosisResult, dicomTags]);

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
            title={<span>AI Diagnosis Result</span>}
            style={{ marginTop: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    const raw = activePicker === '1d'
                      ? selectedDiseases1D
                      : activePicker === 'resnet'
                        ? selectedDiseasesResNet
                        : [];
                    const ds = normalizeDiseases(Array.isArray(raw) ? raw : []);
                    if (!ds.length) {
                      message.error('Please select at least one abnormality');
                      return;
                    }
                    const params = new URLSearchParams();
                    ds.forEach(d => params.append('d', d));
                    navigate(`/xai/${instanceId}?${params.toString()}`);
                  }}
                >
                  Interpret
                </Button>
                <Button
                  type="primary"
                  onClick={handleGetDiagnosis}
                  loading={isDiagnosing}
                >
                  Update Diagnose
                </Button>
              </Space>
            </div>
            {(() => {
              const raw = Array.from(new Set([...(selectedDiseases1D || []), ...(selectedDiseasesResNet || [])]));
              const ds = normalizeDiseases(raw);
              return ds.length > 0 ? (
              <div style={{ marginBottom: 8 }}>
                <Space wrap>
                  {ds.map(d => (
                    <Tag key={d}>{d}</Tag>
                  ))}
                </Space>
              </div>
              ) : null;
            })()}
            {dicomTags['x00104000'] ? (
              <Row gutter={16}>
                <Col span={12}>
                  <Card
                    type="inner"
                    title="1D Model Results"
                    extra={
                      <Space size={8}>
                        <Select
                          mode="multiple"
                          size="small"
                          placeholder="Select diseases"
                          value={selectedDiseases1D}
                          onChange={(vals) => {
                            const v = Array.isArray(vals) ? vals : [];
                            if (v.length > 0) {
                              setActivePicker('1d');
                              setSelectedDiseasesResNet([]);
                            } else if (activePicker === '1d') {
                              setActivePicker(null);
                            }
                            setSelectedDiseases1D(v);
                          }}
                          disabled={activePicker === 'resnet'}
                          style={{ minWidth: 160 }}
                        >
                          {(() => {
                            const candidates = (oneDItems && oneDItems.length)
                              ? oneDItems.map(it => it.type)
                              : (dicomTags['x00104000']
                                  .split(' | ')[0]
                                  .split('; ')
                                  .map(item => item.split(':')[0])
                                );
                            const options = normalizeDiseases(candidates);
                            return options.map(code => (
                              <Select.Option key={code} value={code}>{code}</Select.Option>
                            ));
                          })()}
                        </Select>
                      </Space>
                    }
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Probability</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dicomTags['x00104000'].split(' | ')[0].split('; ').map(item => {
                          const [type, prob] = item.split(':');
                          const label = toDisplay(DISEASE_CODE_MAP[type] || type);
                          return (
                            <tr key={type}>
                              <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{type}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                                {(parseFloat(prob) * 100).toFixed(1)}%
                              </td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                                <Button size="small" type="primary" ghost style={{ padding: '0 6px', height: 22, lineHeight: '20px' }} onClick={() => runXAIFor(type, label)}>AI Interpretation</Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    type="inner"
                    title="ResNet Top5 Results"
                    extra={
                      <Space size={8}>
                        <Select
                          mode="multiple"
                          size="small"
                          placeholder="Select diseases"
                          value={selectedDiseasesResNet}
                          onChange={(vals) => {
                            const v = Array.isArray(vals) ? vals : [];
                            if (v.length > 0) {
                              setActivePicker('resnet');
                              setSelectedDiseases1D([]);
                            } else if (activePicker === 'resnet') {
                              setActivePicker(null);
                            }
                            setSelectedDiseasesResNet(v);
                          }}
                          disabled={activePicker === '1d'}
                          style={{ minWidth: 160 }}
                        >
                          {(() => {
                            const candidates = (resnetItems && resnetItems.length)
                              ? resnetItems.map(it => it.type)
                              : (dicomTags['x00104000']
                                  .split(' | ')[1]
                                  .replace('ResNet Top5: ', '')
                                  .split('; ')
                                  .map(item => item.split(':')[0])
                                );
                            const options = normalizeDiseases(candidates);
                            return options.map(code => (
                              <Select.Option key={code} value={code}>{code}</Select.Option>
                            ));
                          })()}
                        </Select>
                      </Space>
                    }
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>Probability</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dicomTags['x00104000'].split(' | ')[1].replace('ResNet Top5: ', '').split('; ').map(item => {
                          const [type, prob] = item.split(':');
                          const label = toDisplay(DISEASE_CODE_MAP[type] || type);
                          return (
                            <tr key={type}>
                              <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{type}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                                {(parseFloat(prob) * 100).toFixed(1)}%
                              </td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                                <Button size="small" type="primary" ghost style={{ padding: '0 6px', height: 22, lineHeight: '20px' }} onClick={() => runXAIFor(type, label)}>AI Interpretation</Button>
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

        <Modal
          title="Select diseases for XAI"
          open={xaiSelectOpen}
          onCancel={() => setXaiSelectOpen(false)}
          onOk={handleConfirmXAI}
          okText="View XAI"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>Select one or more suspected abnormalities to generate XAI:</div>
            <Select
              mode="multiple"
              value={selectedDiseases}
              onChange={setSelectedDiseases}
              placeholder="Select diseases"
              style={{ width: '100%' }}
              options={KNOWN_DISEASES.map(d => ({ label: d, value: d }))}
            />
          </Space>
        </Modal>
      </Space>
    </Card>
  );
};

export default ECGViewer;

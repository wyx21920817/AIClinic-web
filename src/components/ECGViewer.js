import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DicomECGViewer,
  SOP_CLASS_UIDS,
} from 'ecg-dicom-web-viewer';
import dicomParser from 'dicom-parser';
import ReadECG from '../utils/ReadECG';
import { Card, Space, Typography, Upload, Progress, Row, Col, Button, message } from 'antd';
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
  const statusCheckIntervalRef = React.useRef(null);
  const viewerRef = React.useRef(null);
  const containerId = 'ecg-container';

  React.useEffect(() => {
    const loadInstanceFromOrthanc = async () => {
      try {
        setError(null);
        console.log('Starting to load ECG file...');
        
        console.log('Fetching ECG file for user:', userId, 'instance:', instanceId);
        const response = await request.get(
          API_ENDPOINTS.ECG_FILE_DETAIL(userId, instanceId),
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

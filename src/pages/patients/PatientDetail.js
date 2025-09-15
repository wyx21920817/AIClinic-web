import React, { useState, useEffect } from 'react';

import { Card, Descriptions, Button, Space, Upload, List, Tag, message, Modal, Form, Input, Select, DatePicker, Tooltip, Typography, Progress, Checkbox } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { UploadOutlined, EditOutlined, DeleteOutlined, CopyOutlined, UserOutlined, MailOutlined, IdcardOutlined, DatabaseOutlined, ClockCircleOutlined, NumberOutlined, EyeOutlined, ExperimentOutlined, BarChartOutlined, FileTextOutlined } from '@ant-design/icons';

import styled from '@emotion/styled';
import { patientsApi } from '../../services/api/patients';
import { aiDiagnosisAPI } from '../../services/api/ecg';
import request from '../../services/api/request';
import { usersApi } from '../../services/api/users';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
const PERTH_TZ = 'Australia/Perth';



const PageContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .ant-upload-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .ecg-file-list {
    margin-top: 24px;
  }

  .file-actions {
    display: flex;
    gap: 8px;
  }
`;

const PatientDetail = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [patient, setPatient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [ecgFiles, setEcgFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState({});
  const [diagnosisLoading, setDiagnosisLoading] = useState({});
  

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const data = await patientsApi.getPatient(patientId);
      setPatient(data);
    } catch (error) {
      message.error('Failed to fetch patient details');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchEcgFiles = async () => {
    try {
      if (!patient || !patient.id) return;
      const response = await patientsApi.getPatientEcgFiles(patient.id);
      setEcgFiles(response);
    } catch (error) {
      message.error('Failed to fetch ECG files');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  useEffect(() => {
    if (patient) {
      fetchEcgFiles();
    }
  }, [patient]);

  // Fetch signed-in user info for display (username, email, id)
  useEffect(() => {
    const ud = JSON.parse(localStorage.getItem('userData') || '{}');
    const uid = ud.user_id;
    if (!uid) return;
    (async () => {
      try {
        const u = await usersApi.getUserDetail(uid);
        setCurrentUser(u);
      } catch (e) {
        // best-effort; do not block page
      }
    })();
  }, []);

  // Load mock AI diagnosis data for existing instance IDs
  useEffect(() => {
    if (ecgFiles.length > 0) {
      ecgFiles.forEach(file => {
        if (file.instanceIDs && file.instanceIDs.length > 0) {
          const instanceId = file.instanceIDs[0];
          if (mockAiDiagnosisData[instanceId]) {
            setAiDiagnosis(prev => ({ ...prev, [instanceId]: mockAiDiagnosisData[instanceId] }));
          }
        }
      });
    }
  }, [ecgFiles]);

  const handleEditPatient = async (values) => {
    try {
      await patientsApi.updatePatient(patientId, values);
      message.success('Patient information updated successfully');
      setEditModalVisible(false);
      fetchPatient();
    } catch (error) {
      message.error('Failed to update patient information');
    }
  };

  const handleEditFile = async (values) => {
    try {
      if (!patient || !patient.id) {
        message.error('Patient ID not found');
        return;
      }
      await patientsApi.updateEcgFile(patient.id, selectedFile.id, values);
      message.success('ECG file updated successfully');
      setFileModalVisible(false);
      fetchEcgFiles();
    } catch (error) {
      message.error('Failed to update ECG file');
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      if (!patient || !patient.id) {
        message.error('Patient ID not found');
        return;
      }
      await patientsApi.deleteEcgFile(patient.id, fileId);
      message.success('ECG file deleted successfully');
      fetchEcgFiles();
    } catch (error) {
      message.error('Failed to delete ECG file');
    }
  };

  // AI Diagnosis Functions - Connected to AIClinic Engine
  const requestAiDiagnosis = async (instanceId) => {
    if (!instanceId) {
      message.error('No instance ID available for analysis');
      return;
    }

    try {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: true }));
      message.info('Generating AI diagnosis from AIClinic engine...');

      // Call the real AIClinic engine API
      const response = await aiDiagnosisAPI.requestDiagnosis(instanceId);

      console.log('AIClinic engine response:', response);

      // Transform the AIClinic engine response to our display format
      const transformedData = transformAIClinicResponse(response, instanceId);

      setAiDiagnosis(prev => ({ ...prev, [instanceId]: transformedData }));

      message.success('AI diagnosis completed successfully!');
    } catch (error) {
      console.error('Error requesting AI diagnosis:', error);

      // Fallback to mock data if AI server is not available
      if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
        message.warning('AI server not available, using demo data');
        const mockData = mockAiDiagnosisData[instanceId] || generateFallbackData(instanceId);
        setAiDiagnosis(prev => ({ ...prev, [instanceId]: mockData }));
      } else {
        message.error('Failed to generate AI diagnosis');
      }
    } finally {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  // Transform AIClinic engine response to display format
  const transformAIClinicResponse = (response, instanceId) => {
    const predictions = response.predictions || {};
    const originalModel = predictions.original_dnn_model || {};
    const resnetModel = predictions.resnet_fine_tuned_model || {};

    // Get the top predictions
    const topPredictions = Object.entries(originalModel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const diagnoses = topPredictions.map(([disease, confidence], index) => {
      const config = getDiseaseConfig(disease);
      return {
        "title": `${config.name} (${instanceId.slice(-8)})`,
        "lead_name": "II",
        "report_text": `AI analysis detected ${config.name} with ${(confidence * 100).toFixed(1)}% confidence. This is based on the DNN model analysis of the ECG waveform.`,
        "metrics": {
          "confidence_score": confidence,
          "disease_probability": (confidence * 100).toFixed(1),
          "model_type": "DNN",
          "processing_time_seconds": 2.5
        },
        "image_paths": [`/static/ecg_analysis_results/${instanceId.slice(-8)}_${disease}/analysis.png`],
        "processing_time_seconds": 2.5,
        "instance_id": instanceId,
        "disease": disease,
        "confidence": Math.round(confidence * 100),
        "risk_level": config.risk
      };
    });

    return {
      "diagnoses": diagnoses,
      "summary": {
        "total_diagnoses": diagnoses.length,
        "primary_diagnosis": diagnoses[0]?.disease || "NORM",
        "overall_confidence": Math.round(Math.max(...diagnoses.map(d => d.confidence)) || 0),
        "processing_time": 2.5,
        "risk_assessment": diagnoses[0]?.risk_level || "low",
        "original_response": response
      }
    };
  };

  // Generate fallback data when AI server is not available
  const generateFallbackData = (instanceId) => {
    return {
      "diagnoses": [
        {
          "title": `Demo Analysis (${instanceId.slice(-8)})`,
          "lead_name": "II",
          "report_text": "Demo analysis completed successfully. QRS duration analysis shows normal parameters. Rhythm analysis indicates regular sinus rhythm. No significant abnormalities detected in this ECG recording.",
          "metrics": {
            "qrs_mean_s": 0.085,
            "rr_regularity": 0.95,
            "p_wave_presence": 0.98,
            "processing_time_seconds": 1.2
          },
          "image_paths": [`/static/ecg_analysis_results/${instanceId.slice(-8)}/analysis.png`],
          "processing_time_seconds": 1.2,
          "instance_id": instanceId,
          "disease": "NORM",
          "confidence": 92,
          "risk_level": "low"
        }
      ],
      "summary": {
        "total_diagnoses": 1,
        "primary_diagnosis": "NORM",
        "overall_confidence": 92,
        "processing_time": 1.2,
        "risk_assessment": "low"
      }
    };
  };

  const fetchAiDiagnosis = async (instanceId) => {
    if (!instanceId) return;

    try {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: true }));

      // Try to get real AI diagnosis first
      try {
        const response = await aiDiagnosisAPI.getDiagnosis(instanceId);
        const transformedData = transformAIClinicResponse(response, instanceId);
        setAiDiagnosis(prev => ({ ...prev, [instanceId]: transformedData }));
      } catch (error) {
        console.log('Real AI diagnosis not available, using mock data');
        // Fallback to mock data
        const mockData = mockAiDiagnosisData[instanceId];
        if (mockData) {
          setAiDiagnosis(prev => ({ ...prev, [instanceId]: mockData }));
        }
      }
    } catch (error) {
      console.error('Error fetching AI diagnosis:', error);
      message.error(`Failed to load AI diagnosis for ${instanceId}`);
    } finally {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  // XAI Interpretation function
  // XAI interpretation request function is no longer used from Patient Detail page

  const KNOWN_DISEASES = [];

  const openXaiSelector = (instanceId) => {
    // Directly navigate to XAI page; selection UI removed
    navigate(`/xai/${instanceId}`);
  };


  // Removed multi-instance selection; interpret operates on one instance at a time

  // confirmXaiSelector removed along with selection UI

  const handleUpload = async (file) => {
    try {
      if (!patient || !patient.id) {
        message.error('Patient ID not found');
        return false;
      }
      await patientsApi.uploadEcgFile(patient.id, file);
      message.success('ECG file uploaded successfully');
      fetchEcgFiles();
      return false; // Prevent default upload behavior
    } catch (error) {
      message.error('Failed to upload ECG file');
      return false;
    }
  };

  // Mock AI Diagnosis Data (based on your API response structure)
  const mockAiDiagnosisData = {
    "111111111111111111111": {
      "diagnoses": [
        {
          "title": "Left Bundle Branch Block (15592_hr)",
          "lead_name": "II",
          "report_text": "QRS duration is considered prolonged if > 0.12 seconds (typically). Refined Estimation: Mean=0.134s, Min=0.112s, Max=0.140s. 11 out of 12 QRS durations (Refined Estimation > 0.12s).",
          "metrics": {
            "qrs_mean_s": 0.13400000000000004,
            "wide_qrs_count": 11,
            "total_qrs_count": 12
          },
          "image_paths": ["/static/ecg_analysis_results/15592_hr_LBBB/lbbb_qrs_analysis.png"],
          "processing_time_seconds": 1.43,
          "instance_id": "111111111111111111111",
          "disease": "LBBB",
          "confidence": 94,
          "risk_level": "high"
        },
        {
          "title": "Atrial Flutter (00001_lr.dcm)",
          "lead_name": "II",
          "report_text": "P-waves typically absent/fibrillatory. Yellow boxes: Inferred P-wave regions. RR histogram shows 'irregularly irregular' rhythm.",
          "metrics": {
            "rr_variability": 0.45,
            "p_wave_absence": 0.92,
            "irregular_rhythm": 0.88
          },
          "image_paths": ["/static/ecg_analysis_results/00001_lr_AFLT/aflt_rhythm_analysis.png"],
          "processing_time_seconds": 2.1,
          "instance_id": "111111111111111111111",
          "disease": "AFLT",
          "confidence": 87,
          "risk_level": "medium"
        }
      ],
      "summary": {
        "total_diagnoses": 2,
        "primary_diagnosis": "LBBB",
        "overall_confidence": 91,
        "processing_time": 3.53,
        "risk_assessment": "high"
      }
    },
    "222222222222222222222": {
      "diagnoses": [
        {
          "title": "Normal Sinus Rhythm (03041_hr)",
          "lead_name": "II",
          "report_text": "Regular P-waves present. Normal QRS duration. Consistent RR intervals. No significant abnormalities detected.",
          "metrics": {
            "qrs_mean_s": 0.085,
            "rr_regularity": 0.95,
            "p_wave_presence": 0.98
          },
          "image_paths": ["/static/ecg_analysis_results/03041_hr_NR/normal_rhythm_analysis.png"],
          "processing_time_seconds": 0.8,
          "instance_id": "222222222222222222222",
          "disease": "NORM",
          "confidence": 96,
          "risk_level": "low"
        }
      ],
      "summary": {
        "total_diagnoses": 1,
        "primary_diagnosis": "NORM",
        "overall_confidence": 96,
        "processing_time": 0.8,
        "risk_assessment": "low"
      }
    },
    "333333333333333333333": {
      "diagnoses": [
        {
          "title": "First-degree AV Block (00234_lr)",
          "lead_name": "II",
          "report_text": "PR interval prolonged (> 0.20s). Consistent PR intervals. Normal QRS complexes. No dropped beats.",
          "metrics": {
            "pr_interval_s": 0.24,
            "pr_consistency": 0.92,
            "dropped_beats": 0
          },
          "image_paths": ["/static/ecg_analysis_results/00234_lr_1dAVB/av_block_analysis.png"],
          "processing_time_seconds": 1.2,
          "instance_id": "333333333333333333333",
          "disease": "1dAVB",
          "confidence": 89,
          "risk_level": "medium"
        }
      ],
      "summary": {
        "total_diagnoses": 1,
        "primary_diagnosis": "1dAVB",
        "overall_confidence": 89,
        "processing_time": 1.2,
        "risk_assessment": "medium"
      }
    }
  };

  // Disease configuration based on Professor Sonny's recommendations
  const diseaseConfig = {
    "NORM": { name: "Normal", color: "#52c41a", icon: "💚", risk: "low" },
    "NR": { name: "Normal", color: "#52c41a", icon: "💚", risk: "low" },
    "1dAVB": { name: "First-degree AV Block", color: "#faad14", icon: "🟡", risk: "medium" },
    "2dAVB": { name: "Second-degree AV Block", color: "#ff7a45", icon: "🟠", risk: "high" },
    "3dAVB": { name: "Third-degree AV Block", color: "#ff4d4f", icon: "🔴", risk: "critical" },
    "AFIB": { name: "Atrial Fibrillation", color: "#ff7a45", icon: "🟠", risk: "high" },
    "AF": { name: "Atrial Fibrillation", color: "#ff7a45", icon: "🟠", risk: "high" },
    "AFLT": { name: "Atrial Flutter", color: "#ff7a45", icon: "🟠", risk: "high" },
    "LBBB": { name: "Left Bundle Branch Block", color: "#ff4d4f", icon: "🔴", risk: "high" },
    "RBBB": { name: "Right Bundle Branch Block", color: "#ff7a45", icon: "🟠", risk: "medium" },
    "STACH": { name: "Sinus Tachycardia", color: "#faad14", icon: "🟡", risk: "medium" },
    "SBRAD": { name: "Sinus Bradycardia", color: "#faad14", icon: "🟡", risk: "medium" },
    "PAC": { name: "Premature Atrial Complex", color: "#faad14", icon: "🟡", risk: "low" },
    "PVC": { name: "Premature Ventricular Complex", color: "#ff7a45", icon: "🟠", risk: "medium" },
    "ST": { name: "ST Segment Changes", color: "#ff4d4f", icon: "🔴", risk: "high" }
  };

  // Normalize diseases to backend-supported codes
  const DISEASE_CODE_MAP = {
    // Canonical names
    AFIB: 'AFIB',
    STACH: 'STACH',
    LBBB: 'LBBB',
    RBBB: 'RBBB',
    '1dAVB': '1dAVB',
    '2dAVB': '2dAVB',
    SBRAD: 'SB',
    AFLT: 'AFLT',
    NORM: 'NORM',
    // Synonyms from various sources (map to canonical)
    AF: 'AFIB',
    ST: 'STACH',
    SB: 'SBRAD',
    NR: 'NORM',
    NSR: 'NORM',
    AFL: 'AFLT',
    '1AVB': '1dAVB',
    '2AVB': '2dAVB',
    '3AVB': '3dAVB',
    PAC: 'PAC',
    PVC: 'PVC'
  };
  const ALLOWED_DISEASES = new Set(['1dAVB', '2dAVB', '3dAVB', 'RBBB', 'LBBB', 'SB', 'AFIB', 'STACH', 'AFLT', 'NORM', 'PAC', 'PVC']);
  const normalizeDiseases = (arr) => {
    const input = Array.isArray(arr) ? arr : [];
    const mapped = input.map(d => DISEASE_CODE_MAP[d] || d);
    const filtered = mapped.filter(d => ALLOWED_DISEASES.has(d));
    return Array.from(new Set(filtered));
  };

  // Get disease config
  const getDiseaseConfig = (disease) => {
    return diseaseConfig[disease] || { name: disease, color: "#8c8c8c", icon: "❓", risk: "unknown" };
  };

  // Get risk level color
  const getRiskColor = (risk) => {
    const colors = {
      "low": "#52c41a",
      "medium": "#faad14",
      "high": "#ff7a45",
      "critical": "#ff4d4f",
      "unknown": "#8c8c8c"
    };
    return colors[risk] || colors.unknown;
  };

  if (!patient) {
    return null;
  }

  return (
    <PageContainer>
      {/* Resources Summary */}
      {Array.isArray(ecgFiles) && ecgFiles.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DatabaseOutlined style={{ fontSize: 18, color: '#1890ff' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>ECG Files</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{ecgFiles.length}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <NumberOutlined style={{ fontSize: 18, color: '#13c2c2' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Total Instances</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{ecgFiles.reduce((sum, f) => sum + (Array.isArray(f.instanceIDs) ? f.instanceIDs.length : 0), 0)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClockCircleOutlined style={{ fontSize: 18, color: '#faad14' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Last Upload (Perth)</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {(() => {
                    const last = ecgFiles
                      .slice()
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                    return last ? `${dayjs(last.created_at).tz(PERTH_TZ).format('YYYY-MM-DD HH:mm:ss')} (${PERTH_TZ})` : '-';
                  })()}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
      {/* Signed-in user card removed per request */}
      <Card
        title="Patient Information"
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({
                name: patient.name,
                gender: patient.gender,
                birth_date: dayjs(patient.birth_date)
              });
              setEditModalVisible(true);
            }}
          >
            Edit
          </Button>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Patient ID">{patient.patient_id}</Descriptions.Item>
          <Descriptions.Item label="Name">{patient.name}</Descriptions.Item>
          <Descriptions.Item label="Gender">{patient.gender}</Descriptions.Item>
          <Descriptions.Item label="Birth Date">
            {dayjs(patient.birth_date).format('YYYY-MM-DD')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="ECG Files & AI Diagnosis" style={{ marginTop: 24 }}>
        <Upload
          customRequest={({ file }) => handleUpload(file)}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />}>Upload ECG File</Button>
        </Upload>

        {/* Multi-instance interpret controls removed */}

        <List
          className="ecg-file-list"
          loading={loading}
          dataSource={ecgFiles}
          renderItem={(file) => (
            <List.Item
              actions={[
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setSelectedFile(file);
                    form.setFieldsValue({
                      notes: file.notes,
                      tags: file.tags
                    });
                    setFileModalVisible(true);
                  }}
                />,
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Delete ECG File',
                      content: 'Are you sure you want to delete this file?',
                      onOk: () => handleDeleteFile(file.file_id)
                    });
                  }}
                />
              ]}
            >
              <List.Item.Meta
                title={file.filename}
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>created at: {dayjs(file.created_at).tz(PERTH_TZ).format('YYYY-MM-DD HH:mm:ss')} ({PERTH_TZ})</div>
                    {file.content && (
                      <div>
                        Notes:
                        <div style={{ marginTop: 8 }}>
                          {(() => {
                            // Try to parse Orthanc-style notes string and show key info only
                            const raw = String(file.content || '').trim();
                            const tryParse = (text) => {
                              try {
                                // If already valid JSON
                                return JSON.parse(text);
                              } catch (_) {
                                try {
                                  // Convert single quotes to double quotes and quote keys if needed
                                  const normalized = text
                                    .replace(/\n/g, ' ') // remove newlines
                                    .replace(/'/g, '"') // single -> double
                                    .replace(/([,{\s])([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
                                  return JSON.parse(normalized);
                                } catch (e) {
                                  return null;
                                }
                              }
                            };
                            const obj = tryParse(raw);
                            if (!obj) {
                              // Fallback: show truncated raw string
                              return <span style={{ color: '#666' }}>{raw.slice(0, 200)}{raw.length > 200 ? '…' : ''}</span>;
                            }
                            const pick = (k) => obj[k] ?? obj[k.toLowerCase()] ?? obj[k.toUpperCase()];
                            const rows = [
                              { label: 'File Size', value: pick('FileSize') },
                              { label: 'SOP Instance UID', value: pick('SOPInstanceUID') },
                              { label: 'Instance Number', value: pick('InstanceNumber') },
                              { label: 'File UUID', value: pick('FileUuid') },
                              { label: 'ID', value: pick('ID') },
                              { label: 'Type', value: pick('Type') }
                            ].filter(r => r.value !== undefined && r.value !== null && r.value !== '');
                            return (
                              <ul style={{ margin: 0, paddingLeft: 18, color: '#555' }}>
                                {rows.map(r => (
                                  <li key={r.label}><b>{r.label}:</b> <span style={{ wordBreak: 'break-all' }}>{String(r.value)}</span></li>
                                ))}
                              </ul>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    {file.tags && (
                      <div>
                        Tags:
                        {(Array.isArray(file.tags) ? file.tags : String(file.tags).split(',')).map(tag => (
                          <Tag key={tag} style={{ marginLeft: 8 }}>{typeof tag === 'string' ? tag.trim() : tag}</Tag>
                        ))}
                      </div>
                    )}
                    <div>Instance IDs:</div>
                    <List
                      size="small"
                      bordered
                      dataSource={file.instanceIDs || []}
                      renderItem={(instanceId) => (


                        <List.Item
                          actions={[
                            <Tooltip key="copy" title="Copy Instance ID">
                              <Button
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() => {
                                  navigator.clipboard.writeText(instanceId);
                                  message.success('Instance ID copied');
                                }}
                              />
                            </Tooltip>,
                            <Tooltip key="view" title="Open ECG Viewer">
                              <Button
                                type="primary"
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => navigate(`/ecg-view/${file.user_id}/${instanceId}`)}
                              >
                                View ECG Waveform
                              </Button>
                            </Tooltip>,
                            
                          ]}
                        >
                          <Tooltip title={instanceId}>
                            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                              <span
                                onClick={() => navigate(`/ecg-view/${file.user_id}/${instanceId}`)}
                                style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', color: '#1890ff' }}
                                title="Open ECG Viewer"
                              >
                                {instanceId.length > 12 ? `${instanceId.slice(0, 6)}…${instanceId.slice(-6)}` : instanceId}
                              </span>
                            </span>
                          </Tooltip>
                        </List.Item>
                      )}
                      style={{ maxHeight: '200px', overflow: 'auto' }}
                    />
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>


      {/* AI Diagnosis section fully removed */}


      <Modal
        title="Edit Patient Information"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditPatient}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="gender"
            label="Gender"
            rules={[{ required: true, message: 'Please select gender' }]}
          >
            <Select>
              <Select.Option value="M">Male</Select.Option>
              <Select.Option value="F">Female</Select.Option>
              <Select.Option value="Others">Others</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="birth_date"
            label="Birth Date"
            rules={[{ required: true, message: 'Please select birth date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Update</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* XAI selection modal removed */}


      <Modal
        title="Edit ECG File"
        open={fileModalVisible}
        onCancel={() => setFileModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditFile}
        >
          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea />
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags"
            extra="Separate tags with commas"
          >
            <Input />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setFileModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Update</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PatientDetail;

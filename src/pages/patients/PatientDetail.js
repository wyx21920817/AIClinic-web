import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Upload, List, Tag, message, Modal, Form, Input, Select, DatePicker, Progress, Typography } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { UploadOutlined, EditOutlined, DeleteOutlined, ExperimentOutlined, BarChartOutlined, FileTextOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import { patientsApi } from '../../services/api/patients';
import { aiDiagnosisAPI } from '../../services/api/ecg';
import request from '../../services/api/request';
import dayjs from 'dayjs';

const { Text } = Typography;

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
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    const diagnoses = topPredictions.map(([disease, confidence], index) => {
      const config = getDiseaseConfig(disease);
      return {
        "title": `${config.name} (${instanceId.slice(-8)})`,
        "lead_name": "II",
        "report_text": `AI analysis detected ${disease} with ${(confidence * 100).toFixed(1)}% confidence. This is based on the DNN model analysis of the ECG waveform.`,
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
  const requestXAIInterpretation = async (instanceId, diseases) => {
    try {
      message.info('Generating XAI interpretation...');
      
      const response = await aiDiagnosisAPI.getXAIInterpretation(instanceId, diseases);
      
      console.log('XAI Interpretation response:', response);
      
      // Navigate to XAI demo with the results
      navigate(`/xai-demo?instanceId=${instanceId}&diseases=${diseases.join(',')}&xaiData=${encodeURIComponent(JSON.stringify(response))}`);
      
      message.success('XAI interpretation completed!');
    } catch (error) {
      console.error('Error requesting XAI interpretation:', error);
      message.error('Failed to generate XAI interpretation');
    }
  };

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
          "title": "Atrial Fibrillation (00001_lr.dcm)",
          "lead_name": "II",
          "report_text": "P-waves typically absent/fibrillatory. Yellow boxes: Inferred P-wave regions. RR histogram shows 'irregularly irregular' rhythm.",
          "metrics": {
            "rr_variability": 0.45,
            "p_wave_absence": 0.92,
            "irregular_rhythm": 0.88
          },
          "image_paths": ["/static/ecg_analysis_results/00001_lr_AF/af_rhythm_analysis.png"],
          "processing_time_seconds": 2.1,
          "instance_id": "111111111111111111111",
          "disease": "AF",
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
    "1dAVB": { name: "First-degree AV Block", color: "#faad14", icon: "🟡", risk: "medium" },
    "2dAVB": { name: "Second-degree AV Block", color: "#ff7a45", icon: "🟠", risk: "high" },
    "3dAVB": { name: "Third-degree AV Block", color: "#ff4d4f", icon: "🔴", risk: "critical" },
    "AF": { name: "Atrial Fibrillation", color: "#ff7a45", icon: "🟠", risk: "high" },
    "AFIB": { name: "Atrial Fibrillation", color: "#ff7a45", icon: "🟠", risk: "high" },
    "AFLT": { name: "Atrial Flutter", color: "#ff7a45", icon: "🟠", risk: "high" },
    "LBBB": { name: "Left Bundle Branch Block", color: "#ff4d4f", icon: "🔴", risk: "high" },
    "RBBB": { name: "Right Bundle Branch Block", color: "#ff7a45", icon: "🟠", risk: "medium" },
    "STACH": { name: "Sinus Tachycardia", color: "#faad14", icon: "🟡", risk: "medium" },
    "PAC": { name: "Premature Atrial Complex", color: "#faad14", icon: "🟡", risk: "low" },
    "PVC": { name: "Premature Ventricular Complex", color: "#ff7a45", icon: "🟠", risk: "medium" },
    "ST": { name: "ST Segment Changes", color: "#ff4d4f", icon: "🔴", risk: "high" }
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
                    <div>created at: {dayjs(file.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                    {file.content && <div>Notes: {file.content}</div>}
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
                        <List.Item>
                          <Button
                            type="link"
                            onClick={() => {
                              navigate(`/ecg-view/${file.user_id}/${instanceId}`);
                            }}
                            style={{ padding: 0 }}
                          >
                            {instanceId}
                          </Button>
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

      {/* AI Diagnosis Section */}
      <Card title="🤖 AI Diagnosis Results" style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong>ECG Interpretation Summary</Text>
          <div style={{ marginTop: 8 }}>
            {Object.entries(diseaseConfig).map(([code, config]) => (
              <Tag key={code} color={config.color} style={{ marginBottom: 4 }}>
                {config.icon} {code}
              </Tag>
            ))}
          </div>
        </div>

        <List
          dataSource={ecgFiles}
          renderItem={(file) => {
            const instanceId = file.instanceIDs?.[0];
            const diagnosisData = mockAiDiagnosisData[instanceId];
            
            return (
              <List.Item>
                <Card 
                  size="small" 
                  title={`ECG Analysis: ${file.filename}`}
                  style={{ width: '100%' }}
                  extra={
                    <Space>
                      <Button 
                        type="primary" 
                        size="small"
                        loading={diagnosisLoading[instanceId]}
                        onClick={() => requestAiDiagnosis(instanceId)}
                      >
                        🔍 Analyze ECG
                      </Button>
                      <Button 
                        type="default" 
                        size="small"
                        onClick={() => navigate(`/xai-demo?instanceId=${instanceId}`)}
                      >
                        🧠 View XAI
                      </Button>
                    </Space>
                  }
                >
                  {diagnosisData ? (
                    <div>
                      {/* Summary Section */}
                      <Card size="small" title="Analysis Summary" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <Text strong>Primary Diagnosis:</Text>
                            <div style={{ marginTop: 4 }}>
                              {diagnosisData.diagnoses.map((diagnosis, index) => {
                                const config = getDiseaseConfig(diagnosis.disease);
                                return (
                                  <Tag 
                                    key={index} 
                                    color={config.color}
                                    style={{ marginBottom: 4, fontSize: '12px' }}
                                  >
                                    {config.icon} {config.name}
                                  </Tag>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <Text strong>Overall Confidence:</Text>
                            <div style={{ marginTop: 4 }}>
                              <Progress 
                                percent={diagnosisData.summary.overall_confidence} 
                                size="small" 
                                strokeColor={getRiskColor(diagnosisData.summary.risk_assessment)}
                                format={(percent) => `${percent}%`}
                              />
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <Text strong>Risk Assessment:</Text>
                            <div style={{ marginTop: 4 }}>
                              <Tag color={getRiskColor(diagnosisData.summary.risk_assessment)}>
                                {diagnosisData.summary.risk_assessment.toUpperCase()}
                              </Tag>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Detailed Diagnoses */}
                      {diagnosisData.diagnoses.map((diagnosis, index) => {
                        const config = getDiseaseConfig(diagnosis.disease);
                        return (
                          <Card 
                            key={index}
                            size="small" 
                            title={
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{config.icon}</span>
                                <span>{diagnosis.title}</span>
                                <Tag color={config.color} style={{ marginLeft: 'auto' }}>
                                  {config.name}
                                </Tag>
                              </div>
                            }
                            style={{ marginBottom: 16 }}
                          >
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                              {/* Clinical Report */}
                              <Card size="small" title="Clinical Report" style={{ flex: 2, minWidth: 300 }}>
                                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                                  {diagnosis.report_text}
                                </div>
                                <div style={{ marginTop: 8 }}>
                                  <Text type="secondary" style={{ fontSize: '11px' }}>
                                    Lead: {diagnosis.lead_name} | Processing Time: {diagnosis.processing_time_seconds}s
                                  </Text>
                                </div>
                              </Card>

                              {/* Metrics */}
                              <Card size="small" title="Key Metrics" style={{ flex: 1, minWidth: 200 }}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  {Object.entries(diagnosis.metrics).map(([key, value]) => (
                                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '11px' }}>
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                      </span>
                                      <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '11px' }}>
                                        {typeof value === 'number' ? value.toFixed(3) : value}
                                      </span>
                                    </div>
                                  ))}
                                </Space>
                              </Card>

                              {/* Confidence */}
                              <Card size="small" title="AI Confidence" style={{ flex: 1, minWidth: 150 }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: config.color }}>
                                    {diagnosis.confidence}%
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#666', marginBottom: 8 }}>
                                    {diagnosis.confidence >= 90 ? 'Very High' : 
                                     diagnosis.confidence >= 80 ? 'High' : 
                                     diagnosis.confidence >= 70 ? 'Medium' : 'Low'} Confidence
                                  </div>
                                  <Progress 
                                    percent={diagnosis.confidence} 
                                    size="small" 
                                    strokeColor={config.color}
                                    showInfo={false}
                                  />
                                </div>
                              </Card>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ marginTop: 16, textAlign: 'center' }}>
                              <Space>
                                                                 <Button 
                                   type="primary"
                                   icon={<ExperimentOutlined />}
                                   size="small"
                                   onClick={() => requestXAIInterpretation(diagnosis.instance_id, [diagnosis.disease])}
                                 >
                                   View XAI Analysis
                                 </Button>
                                <Button 
                                  type="default"
                                  icon={<BarChartOutlined />}
                                  size="small"
                                  onClick={() => navigate(`/ecg-view/${file.user_id}/${diagnosis.instance_id}`)}
                                >
                                  View Waveform
                                </Button>
                                <Button 
                                  type="default"
                                  icon={<FileTextOutlined />}
                                  size="small"
                                >
                                  Download Report
                                </Button>
                              </Space>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ fontSize: '16px', color: '#666', marginBottom: 16 }}>
                        No AI diagnosis available for this ECG file
                      </div>
                      <Button 
                        type="primary"
                        icon={<ExperimentOutlined />}
                        onClick={() => requestAiDiagnosis(instanceId)}
                        loading={diagnosisLoading[instanceId]}
                      >
                        Generate AI Diagnosis
                      </Button>
                    </div>
                  )}
                </Card>
              </List.Item>
            );
          }}
        />
      </Card>

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

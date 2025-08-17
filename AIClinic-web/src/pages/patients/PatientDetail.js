import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Upload, List, Tag, message, Modal, Form, Input, Select, DatePicker, Row, Col, Typography, Alert, Tooltip, Progress, Divider, Collapse } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { UploadOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ExperimentOutlined, HeartOutlined, CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined, BarChartOutlined, InfoCircleOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import { patientsApi } from '../../services/api/patients';
import { aiDiagnosisAPI } from '../../services/api/ecg';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Panel } = Collapse;

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

  .ai-diagnosis-card {
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    padding: 16px;
    background: #fafafa;
    margin-top: 12px;
  }

  .diagnosis-item {
    padding: 12px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    background: white;
    margin-bottom: 8px;
  }

  .confidence-bar {
    margin: 8px 0;
  }

  .xai-link {
    margin-top: 8px;
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
  const [aiDiagnoses, setAiDiagnoses] = useState({});
  const [diagnosisLoading, setDiagnosisLoading] = useState({});

  // Mock AI diagnoses for demonstration
  const mockAiDiagnoses = {
    '111111111111111111111': [
      {
        title: "Left Bundle Branch Block (15592_hr)",
        lead_name: "II",
        report_text: "QRS duration is considered prolonged if > 0.12 seconds. Refined estimation shows Mean=0.134s, Min=0.112s, Max=0.140s. 11 out of 12 QRS durations (Refined Estimation > 0.12s).",
        metrics: {
          qrs_mean_s: 0.13400000000000004,
          wide_qrs_count: 11,
          total_qrs_count: 12
        },
        image_paths: ["/static/ecg_analysis_results/15592_hr_LBBB/lbbb_qrs_analysis.png"],
        processing_time_seconds: 1.43,
        instance_id: "111111111111111111111",
        disease: "LBBB",
        confidence: 0.89
      },
      {
        title: "Atrial Fibrillation (00001_lr.dcm)",
        lead_name: "II",
        report_text: "P-waves typically absent/fibrillatory. RR histogram shows 'irregularly irregular' rhythm with significant variability in RR intervals.",
        metrics: {
          mean_rr: 0.856,
          rr_std: 0.234,
          irregularity_score: 0.78
        },
        image_paths: ["/static/ecg_analysis_results/00001_lr_AF/afib_rr_histogram.png"],
        processing_time_seconds: 2.1,
        instance_id: "111111111111111111111",
        disease: "AF",
        confidence: 0.92
      }
    ],
    '222222222222222222222': [
      {
        title: "Right Bundle Branch Block (03041_hr)",
        lead_name: "V1",
        report_text: "QRS duration > 120ms with characteristic RSR' pattern in V1. Secondary R wave amplitude > 0.5mV. QRS axis deviation to the right.",
        metrics: {
          qrs_duration: 0.145,
          r_prime_amplitude: 0.67,
          qrs_axis: 125
        },
        image_paths: ["/static/ecg_analysis_results/03041_hr_RBBB/rbbb_leads_analysis.png"],
        processing_time_seconds: 1.78,
        instance_id: "222222222222222222222",
        disease: "RBBB",
        confidence: 0.85
      }
    ],
    '333333333333333333333': [
      {
        title: "First Degree AV Block (00234_lr)",
        lead_name: "II",
        report_text: "PR interval > 200ms consistently across all cardiac cycles. Normal QRS duration maintained. Regular P-wave morphology.",
        metrics: {
          pr_interval: 0.245,
          pr_variability: 0.012,
          cycles_analyzed: 10
        },
        image_paths: ["/static/ecg_analysis_results/00234_lr_1dAVB/avb1_pr_intervals_corrected.png"],
        processing_time_seconds: 1.12,
        instance_id: "333333333333333333333",
        disease: "1dAVB",
        confidence: 0.94
      }
    ],
    '444444444444444444444': [
      {
        title: "Normal Sinus Rhythm (01484_hr)",
        lead_name: "II",
        report_text: "Regular rhythm with normal PR interval (120-200ms), QRS duration (80-120ms), and QT interval. P-waves present and consistent.",
        metrics: {
          pr_interval: 0.156,
          qrs_duration: 0.089,
          qt_interval: 0.412,
          heart_rate: 72
        },
        image_paths: ["/static/ecg_analysis_results/01484_hr_NR/sinus_tachycardia_analysis.png"],
        processing_time_seconds: 0.95,
        instance_id: "444444444444444444444",
        disease: "NORM",
        confidence: 0.97
      }
    ],
    '555555555555555555555': [
      {
        title: "Sinus Tachycardia (04408_hr)",
        lead_name: "II",
        report_text: "Heart rate > 100 bpm with regular rhythm. Normal P-wave morphology and PR interval. No evidence of atrial fibrillation.",
        metrics: {
          heart_rate: 118,
          pr_interval: 0.142,
          rr_variability: 0.023
        },
        image_paths: ["/static/ecg_analysis_results/04408_hr_ST/sinus_tachycardia_analysis.png"],
        processing_time_seconds: 1.34,
        instance_id: "555555555555555555555",
        disease: "STACH",
        confidence: 0.88
      }
    ]
  };

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
      
      // Fetch AI diagnoses for each instance ID
      if (response && response.length > 0) {
        response.forEach(file => {
          if (file.instanceIDs && file.instanceIDs.length > 0) {
            file.instanceIDs.forEach(instanceId => {
              fetchAiDiagnosis(instanceId);
            });
          }
        });
      }
    } catch (error) {
      message.error('Failed to fetch ECG files');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiDiagnosis = async (instanceId) => {
    try {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: true }));
      
      // Check if we have mock data for this instance ID
      if (mockAiDiagnoses[instanceId]) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAiDiagnoses(prev => ({
          ...prev,
          [instanceId]: mockAiDiagnoses[instanceId]
        }));
        return;
      }
      
      // Fallback to real API
      const diagnosis = await aiDiagnosisAPI.getDiagnosis(instanceId);
      if (diagnosis && diagnosis.length > 0) {
        setAiDiagnoses(prev => ({
          ...prev,
          [instanceId]: diagnosis
        }));
      }
    } catch (error) {
      console.error('Error fetching AI diagnosis:', error);
      message.error(`Failed to load AI diagnosis for ${instanceId}`);
    } finally {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  const requestAiDiagnosis = async (instanceId) => {
    try {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: true }));
      
      // Check if we have mock data for this instance ID
      if (mockAiDiagnoses[instanceId]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setAiDiagnoses(prev => ({
          ...prev,
          [instanceId]: mockAiDiagnoses[instanceId]
        }));
        message.success('AI diagnosis completed successfully!');
        return;
      }
      
      // Fallback to real API
      const diagnosis = await aiDiagnosisAPI.requestDiagnosis(instanceId);
      if (diagnosis && diagnosis.length > 0) {
        setAiDiagnoses(prev => ({
          ...prev,
          [instanceId]: diagnosis
        }));
        message.success('AI diagnosis completed successfully!');
      }
    } catch (error) {
      console.error('Error requesting AI diagnosis:', error);
      message.error('Failed to request AI diagnosis');
    } finally {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  const getDiagnosisColor = (disease) => {
    const colors = {
      'LBBB': '#1890ff',
      'RBBB': '#52c41a',
      'AF': '#fa541c',
      '1dAVB': '#722ed1',
      'NORM': '#52c41a',
      'STACH': '#faad14',
      '2dAVB': '#eb2f96',
      '3dAVB': '#f5222d',
      'AFLT': '#fa8c16',
      'PAC': '#13c2c2',
      'PVC': '#eb2f96'
    };
    return colors[disease] || '#666666';
  };

  const getDiagnosisIcon = (disease) => {
    const icons = {
      'LBBB': <HeartOutlined style={{ color: '#1890ff' }} />,
      'RBBB': <HeartOutlined style={{ color: '#52c41a' }} />,
      'AF': <ExclamationCircleOutlined style={{ color: '#fa541c' }} />,
      '1dAVB': <InfoCircleOutlined style={{ color: '#722ed1' }} />,
      'NORM': <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      'STACH': <BarChartOutlined style={{ color: '#faad14' }} />,
      '2dAVB': <ExclamationCircleOutlined style={{ color: '#eb2f96' }} />,
      '3dAVB': <ExclamationCircleOutlined style={{ color: '#f5222d' }} />,
      'AFLT': <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />,
      'PAC': <InfoCircleOutlined style={{ color: '#13c2c2' }} />,
      'PVC': <ExclamationCircleOutlined style={{ color: '#eb2f96' }} />
    };
    return icons[disease] || <InfoCircleOutlined />;
  };

  // Render AI diagnosis for a specific instance ID
  const renderAiDiagnosis = (instanceId) => {
    const diagnoses = aiDiagnoses[instanceId] || [];
    const isLoading = diagnosisLoading[instanceId];

    if (isLoading) {
      return (
        <div className="ai-diagnosis-card">
          <div style={{ textAlign: 'center', padding: 20 }}>
            <LoadingOutlined style={{ fontSize: 24, marginRight: 8 }} />
            <Text>Loading AI diagnosis...</Text>
          </div>
        </div>
      );
    }

    if (diagnoses.length === 0) {
      return (
        <div className="ai-diagnosis-card">
          <Alert
            message="No AI Diagnosis Available"
            description="This ECG has not been analyzed by AI yet."
            type="info"
            showIcon
            action={
              <Button
                size="small"
                type="primary"
                onClick={() => requestAiDiagnosis(instanceId)}
              >
                Request AI Diagnosis
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div className="ai-diagnosis-card">
        <Card
          title={
            <Space>
              <ExperimentOutlined />
              <Text strong>AI Diagnosis Results</Text>
              <Tag color="blue">{diagnoses.length} condition{diagnoses.length > 1 ? 's' : ''} detected</Tag>
            </Space>
          }
          size="small"
        >
          {diagnoses.map((diagnosis, index) => (
            <div key={index} className="diagnosis-item" style={{ marginBottom: index < diagnoses.length - 1 ? 16 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Space>
                  {getDiagnosisIcon(diagnosis.disease)}
                  <Text strong>{diagnosis.title}</Text>
                  <Tag color={getDiagnosisColor(diagnosis.disease)} size="large">
                    {diagnosis.disease}
                  </Tag>
                </Space>
                <Space>
                  <Text type="secondary">Confidence:</Text>
                  <Progress
                    type="circle"
                    size={40}
                    percent={Math.round((diagnosis.confidence || 0) * 100)}
                    format={(percent) => `${percent}%`}
                    strokeColor={getDiagnosisColor(diagnosis.disease)}
                  />
                </Space>
              </div>
              
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">{diagnosis.report_text}</Text>
              </div>
              
              {diagnosis.metrics && (
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Key Metrics:</Text>
                  <div style={{ marginTop: 4 }}>
                    {Object.entries(diagnosis.metrics).map(([key, value]) => (
                      <Tag key={key} style={{ marginRight: 4, marginBottom: 4 }}>
                        {key}: {typeof value === 'number' ? value.toFixed(3) : value}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Processing time: {diagnosis.processing_time_seconds}s
                </Text>
                <Button
                  type="primary"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/xai-demo?instanceId=${instanceId}&disease=${diagnosis.disease}`)}
                >
                  View Detailed XAI Explanation
                </Button>
              </div>
              
              {index < diagnoses.length - 1 && <Divider style={{ margin: '12px 0' }} />}
            </div>
          ))}
        </Card>
      </div>
    );
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  useEffect(() => {
    if (patient) {
      fetchEcgFiles();
    }
  }, [patient]);

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
                    
                    {/* Instance IDs with AI Diagnosis and XAI View */}
                    {file.instanceIDs && file.instanceIDs.length > 0 && (
                      <div>
                        <Text strong>ECG Analysis Results:</Text>
                        {file.instanceIDs.map((instanceId) => (
                          <div key={instanceId} style={{ marginTop: 8 }}>
                            <Space>
                              <Text type="secondary">Instance ID: {instanceId}</Text>
                              <Button
                                type="link"
                                size="small"
                                onClick={() => {
                                  navigate(`/ecg-view/${file.user_id}/${instanceId}`);
                                }}
                              >
                                View ECG
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                icon={<ExperimentOutlined />}
                                onClick={() => {
                                  navigate(`/xai-demo?instanceId=${instanceId}`);
                                }}
                              >
                                View XAI Analysis
                              </Button>
                            </Space>
                            {renderAiDiagnosis(instanceId)}
                          </div>
                        ))}
                      </div>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
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

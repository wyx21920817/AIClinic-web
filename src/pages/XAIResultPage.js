import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Button, Spin, Alert, Row, Col, Divider, Tag, Space, Progress, Tabs, Image, Form, Input, Checkbox, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons';
import { aiDiagnosisAPI, ecgAPI } from '../services/api/ecg';

const { Title, Text, Paragraph } = Typography;

// Function to format report text with proper line breaks and structure
const formatReportText = (text) => {
  if (!text) return '';
  
  // Since the text already has line breaks, we'll just do minimal formatting
  return text
    // Ensure there's a double line break before 'Simple Conclusion:' or similar section headers
    // if there isn't already a sufficient break
    .replace(/([^\n])\n(Simple Conclusion:|Conclusion:|Summary:|Assessment:)/g, '$1\n\n$2')
    // Clean up any excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const XAIResultPage = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interpretationData, setInterpretationData] = useState(null);
  const [activeTab, setActiveTab] = useState('0');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [form] = Form.useForm();
  const [userId, setUserId] = useState(null); // We'll need the user ID for the API call
  const [ecgInfo, setEcgInfo] = useState({
    notes: '',
    tags: '',
    approved_status: false
  });
  
  // Get the selected diseases from location state
  const selectedDiseases = location.state?.selectedDiseases || [];

  useEffect(() => {
    const fetchInterpretation = async () => {
      if (!selectedDiseases || selectedDiseases.length === 0) {
        setError('No diseases selected for interpretation');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Call the API to get interpretation for the selected diseases
        const result = await aiDiagnosisAPI.getXAIInterpretation(instanceId, selectedDiseases);
        setInterpretationData(result);
        
        // Set the active tab to the first result if available
        if (result && result.results && result.results.length > 0) {
          setActiveTab('0');
        }
        
        // Extract user ID from the ecg_file data if available
        if (result && result.ecg_file) {
          setUserId(result.ecg_file.patient_id); // Using patient_id as user_id
          
          // Set initial form values and ecgInfo state
          const notes = result.ecg_file.notes || '';
          const tags = Array.isArray(result.ecg_file.tags) 
            ? result.ecg_file.tags.join(', ') 
            : '';
          const approved = result.ecg_file.approved_status || false;
          
          setEcgInfo({
            notes,
            tags,
            approved_status: approved
          });
          
          form.setFieldsValue({
            notes,
            tags,
            approved_status: approved
          });
        }
      } catch (err) {
        console.error('Error fetching interpretation:', err);
        setError(err.message || 'Failed to fetch interpretation');
      } finally {
        setLoading(false);
      }
    };

    fetchInterpretation();
  }, [instanceId, selectedDiseases, form]);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };
  
  const handleUpdateECG = async (values) => {
    if (!userId || !instanceId) {
      message.error('Missing user ID or instance ID');
      return;
    }
    
    try {
      setUpdateLoading(true);
      
      // Convert tags string to array if needed by the API
      const tagsString = values.tags;
      
      // Call the API to update the ECG file
      await ecgAPI.updateECGFile(
        userId,
        instanceId,
        values.notes,
        tagsString,
        values.approved_status
      );
      
      // Update local state
      setEcgInfo({
        notes: values.notes,
        tags: values.tags,
        approved_status: values.approved_status
      });
      
      message.success('ECG file updated successfully');
    } catch (err) {
      console.error('Error updating ECG file:', err);
      message.error(err.message || 'Failed to update ECG file');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  const handleApprove = async () => {
    if (!userId || !instanceId) {
      message.error('Missing user ID or instance ID');
      return;
    }
    
    try {
      setApproveLoading(true);
      
      // Call the API to update just the approved status
      await ecgAPI.updateECGFile(
        userId,
        instanceId,
        ecgInfo.notes,
        ecgInfo.tags,
        true // Set to approved
      );
      
      // Update local state
      setEcgInfo({
        ...ecgInfo,
        approved_status: true
      });
      
      // Update form values
      form.setFieldsValue({
        ...form.getFieldsValue(),
        approved_status: true
      });
      
      message.success('ECG file approved successfully');
    } catch (err) {
      console.error('Error approving ECG file:', err);
      message.error(err.message || 'Failed to approve ECG file');
    } finally {
      setApproveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '20px', textAlign: 'center' }}>
        <Spin size="large" tip="Loading interpretation..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" style={{ padding: '20px' }}>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={handleBack}>
              Go Back
            </Button>
          }
        />
      </div>
    );
  }

  // Render a disease tab content
  const renderDiseaseTab = (result, index) => {
    if (!result || !result.report) {
      return <Alert message="No report data available" type="warning" />;
    }

    const { report } = result;
    
    return (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card type="inner" title="Disease Information">
              <Title level={4}>
                {result.abnormality}
                <Tag color={result.status === 'ok' ? 'green' : 'orange'} style={{ marginLeft: '8px' }}>
                  {result.status || 'N/A'}
                </Tag>
              </Title>
              <div 
                style={{ 
                  whiteSpace: 'pre-line',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  backgroundColor: '#f9f9f9',
                  padding: '16px',
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}
              >
                {typeof report.report_text === 'string' 
                  ? formatReportText(report.report_text)
                  : typeof report.report_text === 'object' 
                    ? JSON.stringify(report.report_text) 
                    : 'No description available'
                }
              </div>
            </Card>
          </Col>
          
          {report.metrics && (
            <Col span={24}>
              <Card type="inner" title="Metrics">
                <Row gutter={[16, 16]}>
                  {Object.entries(report.metrics).map(([key, value]) => (
                    <Col key={key} span={8}>
                      <Card size="small">
                        <Text strong>{key.replace(/_/g, ' ')}: </Text>
                        <Text>
                          {typeof value === 'number' 
                            ? value.toFixed(3) 
                            : typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : String(value)
                          }
                        </Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          )}
          
          {report.image_paths && (
            <Col span={24}>
              <Card type="inner" title="Images">
                <Row gutter={[16, 16]}>
                  {Object.entries(report.image_paths).map(([key, url]) => (
                    <Col key={key} span={12}>
                      <Card size="small" title={key.replace(/_/g, ' ').replace('.png', '')}>
                        <Image src={url} alt={key} />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          )}
          
          {report.validation && (
            <Col span={24}>
              <Card type="inner" title="Validation">
                <div>
                  <Text strong>Status: </Text>
                  <Tag color={report.validation.status === 'pass' ? 'green' : 'orange'}>
                    {report.validation.status}
                  </Tag>
                </div>
                
                {report.validation.reasons && report.validation.reasons.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <Text strong>Reasons: </Text>
                    <ul>
                      {report.validation.reasons.map((reason, idx) => (
                        <li key={idx}><Text>{reason}</Text></li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {report.validation.metrics_used && (
                  <div style={{ marginTop: '10px' }}>
                    <Text strong>Metrics Used: </Text>
                    <ul>
                      {Object.entries(report.validation.metrics_used).map(([key, value]) => (
                        <li key={key}>
                          <Text>
                            {key}: {typeof value === 'number' 
                              ? value.toFixed(3) 
                              : typeof value === 'object' 
                                ? JSON.stringify(value) 
                                : String(value)
                            }
                          </Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </Col>
          )}
        </Row>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={handleBack} 
        style={{ marginBottom: '16px' }}
      >
        Back to ECG Viewer
      </Button>
      
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>ECG Interpretation Results</Title>
        </div>
        
        {interpretationData?.ecg_file && (
          <Card style={{ marginBottom: '16px' }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateECG}
              initialValues={{
                notes: interpretationData.ecg_file.notes || '',
                tags: Array.isArray(interpretationData.ecg_file.tags) 
                  ? interpretationData.ecg_file.tags.join(', ') 
                  : '',
                approved_status: interpretationData.ecg_file.approved_status || false
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="notes"
                    label="Notes"
                    rules={[{ required: true, message: 'Please enter notes' }]}
                  >
                    <Input.TextArea rows={4} placeholder="Enter notes about this ECG" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="tags"
                    label="Tags"
                    rules={[{ required: true, message: 'Please enter tags' }]}
                  >
                    <Input placeholder="Enter tags separated by commas" />
                  </Form.Item>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <Text strong>Status: </Text>
                    <Tag color={ecgInfo.approved_status ? 'green' : 'orange'}>
                      {ecgInfo.approved_status ? 'Approved' : 'Not Approved'}
                    </Tag>
                  </div>
                </Col>
              </Row>
              
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={updateLoading}>
                    Update ECG Information
                  </Button>
                  {!ecgInfo.approved_status && (
                    <Button 
                      type="primary" 
                      danger 
                      onClick={handleApprove} 
                      loading={approveLoading}
                    >
                      Approve ECG
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}
        
        <Divider />
        
        {interpretationData && interpretationData.results && interpretationData.results.length > 0 ? (
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            type="card"
            style={{ marginTop: '16px' }}
            items={interpretationData.results.map((result, index) => ({
              key: index.toString(),
              label: (
                <span>
                  {result.abnormality}
                  <Tag 
                    color={result.status === 'ok' ? 'green' : 'orange'} 
                    style={{ marginLeft: '8px' }}
                  >
                    {result.status || 'N/A'}
                  </Tag>
                  {result.report?.validation && (
                    <Tag 
                      color={result.report.validation.status === 'pass' ? 'green' : 'orange'} 
                      style={{ marginLeft: '4px' }}
                    >
                      Validation: {result.report.validation.status}
                    </Tag>
                  )}
                </span>
              ),
              children: renderDiseaseTab(result, index)
            }))}
          />
        ) : (
          <Alert 
            message="No interpretation results available" 
            description="There are no disease interpretations available for this ECG." 
            type="info" 
          />
        )}
      </Card>
    </div>
  );
};

export default XAIResultPage;

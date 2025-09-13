import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Button, Spin, Alert, Row, Col, Divider, Tag, Space, Progress, Tabs, Image, Form, Input, Checkbox, Modal, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons';
import { aiDiagnosisAPI, ecgAPI, feedbackAPI } from '../services/api/ecg';
import { API_BASE_URL } from '../services/api/config';

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
  const [interpretationData, setInterpretationData] = useState(null); // used for single-instance view
  const [activeTab, setActiveTab] = useState('0'); // disease tab key for single-instance view
  const [interpretationsByInstance, setInterpretationsByInstance] = useState({}); // multi-instance results
  const [activeInstanceKey, setActiveInstanceKey] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [form] = Form.useForm();
  const [userId, setUserId] = useState(null); // We'll need the user ID for the API call
  const [ecgInfo, setEcgInfo] = useState({
    notes: '',
    tags: '',
    approved_status: false
  });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  
  // Get the selected diseases from navigation state or URL query (?d=AFIB&d=LBBB)
  const queryDiseases = (() => {
    try {
      const search = new URLSearchParams(location.search || '');
      return search.getAll('d');
    } catch (_) {
      return [];
    }
  })();
  const selectedDiseases = (location.state?.selectedDiseases && location.state.selectedDiseases.length > 0)
    ? location.state.selectedDiseases
    : queryDiseases;

  // Support multi-instance via query: ?i=ID1&i=ID2; fallback to URL param instanceId
  const queryInstanceIds = (() => {
    try {
      const search = new URLSearchParams(location.search || '');
      return search.getAll('i');
    } catch (_) {
      return [];
    }
  })();
  const instanceIds = (queryInstanceIds && queryInstanceIds.length > 0)
    ? queryInstanceIds
    : (instanceId ? [instanceId] : []);
  const isMultiInstance = instanceIds.length > 1;
  const currentInstanceId = isMultiInstance ? activeInstanceKey || instanceIds[0] : instanceId;

  useEffect(() => {
    const fetchInterpretations = async () => {
      if (!selectedDiseases || selectedDiseases.length === 0) {
        setError('No diseases selected for interpretation');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        if (isMultiInstance) {
          setActiveInstanceKey(instanceIds[0]);
          const results = await Promise.all(
            instanceIds.map(async (id) => {
              const res = await aiDiagnosisAPI.getXAIInterpretation(id, selectedDiseases);
              return [id, res];
            })
          );
          const map = {};
          results.forEach(([id, res]) => { map[id] = res; });
          setInterpretationsByInstance(map);
        } else if (instanceIds[0]) {
          const result = await aiDiagnosisAPI.getXAIInterpretation(instanceIds[0], selectedDiseases);
          setInterpretationData(result);
          if (result && result.results && result.results.length > 0) {
            setActiveTab('0');
          }
          if (result && result.ecg_file) {
            setUserId(result.ecg_file.patient_id);
            const notes = result.ecg_file.notes || '';
            const tags = Array.isArray(result.ecg_file.tags) ? result.ecg_file.tags.join(', ') : '';
            const approved = result.ecg_file.approved_status || false;
            setEcgInfo({ notes, tags, approved_status: approved });
            form.setFieldsValue({ notes, tags, approved_status: approved });
          }
        }
      } catch (err) {
        console.error('Error fetching interpretation:', err);
        setError(err.message || 'Failed to fetch interpretation');
      } finally {
        setLoading(false);
      }
    };

    fetchInterpretations();
  }, [JSON.stringify(instanceIds), JSON.stringify(selectedDiseases), form]);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };
  
  // Update ECG handler removed with inline notes section
  
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
  
  // Handle downloading the interpretation PDF
  const handleDownloadPDF = async () => {
    if (!instanceId) {
      message.error('Missing instance ID');
      return;
    }
    
    try {
      setPdfLoading(true);
      
      // Call API to get the PDF URL
      const result = await aiDiagnosisAPI.getInterpretationPDF(instanceId, selectedDiseases);
      
      if (result && result.pdf_url) {
        // Create a download link element
        const downloadLink = document.createElement('a');
        downloadLink.href = result.pdf_url;
        
        // Set the download attribute to force download instead of navigation
        // Use the instance ID as the filename with .pdf extension
        downloadLink.download = `ECG_Interpretation_${instanceId}.pdf`;
        
        // Append to the document
        document.body.appendChild(downloadLink);
        
        // Trigger the download
        downloadLink.click();
        
        // Clean up
        document.body.removeChild(downloadLink);
        
        message.success('PDF report download started');
      } else {
        message.error('Failed to generate PDF report');
      }
    } catch (err) {
      console.error('Error generating PDF report:', err);
      message.error(err.message || 'Failed to generate PDF report');
    } finally {
      setPdfLoading(false);
    }
  };

  // PDF for a specified instance (used in multi-instance view)
  const handleDownloadPDFFor = async (id) => {
    if (!id) return;
    try {
      setPdfLoading(true);
      const result = await aiDiagnosisAPI.getInterpretationPDF(id, selectedDiseases);
      if (result && result.pdf_url) {
        const a = document.createElement('a');
        a.href = result.pdf_url;
        a.download = `ECG_Interpretation_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        message.success('PDF report download started');
      } else {
        message.error('Failed to generate PDF report');
      }
    } catch (err) {
      console.error('Error generating PDF report:', err);
      message.error(err.message || 'Failed to generate PDF report');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleApproveCurrent = async () => {
    const id = currentInstanceId;
    if (!id) return;
    try {
      setApproveLoading(true);
      const info = isMultiInstance ? (interpretationsByInstance[id]?.ecg_file || {}) : ecgInfo;
      const uid = isMultiInstance ? interpretationsByInstance[id]?.ecg_file?.patient_id : userId;
      if (!uid) throw new Error('Missing user ID');
      await ecgAPI.updateECGFile(
        uid,
        id,
        info.notes || '',
        Array.isArray(info.tags) ? info.tags.join(', ') : (info.tags || ''),
        true
      );
      if (!isMultiInstance) {
        setEcgInfo({ ...ecgInfo, approved_status: true });
        form.setFieldsValue({ ...form.getFieldsValue(), approved_status: true });
      }
      message.success('ECG approved successfully');
    } catch (err) {
      console.error('Approve error:', err);
      message.error(err.message || 'Failed to approve ECG');
    } finally {
      setApproveLoading(false);
    }
  };

  // Removed Update ECG modal/logic per request

  const handleSubmitFeedback = async (values) => {
    try {
      const id = currentInstanceId;
      await feedbackAPI.submitFeedback({
        instance_id: id,
        feedback: values.feedback,
        tags: values.tags || ''
      });
      message.success('Feedback submitted');
      setFeedbackOpen(false);
    } catch (err) {
      console.error('Feedback error:', err);
      message.error(err.message || 'Failed to submit feedback');
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

  // Render panel for one instance (simplified when multiple)
  const renderInstancePanel = (id, data) => {
    return (
      <div>
        {data && data.results && data.results.length > 0 ? (
          <Tabs
            type="card"
            items={data.results.map((result, index) => ({
              key: index.toString(),
              label: (
                <span>
                  {result.abnormality}
                  <Tag color={result.status === 'ok' ? 'green' : 'orange'} style={{ marginLeft: '8px' }}>
                    {result.status || 'N/A'}
                  </Tag>
                  {result.report?.validation && (
                    <Tag color={result.report.validation.status === 'pass' ? 'green' : 'orange'} style={{ marginLeft: '4px' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Title level={2}>ECG Interpretation Results</Title>
          <Space wrap>
            <Button onClick={() => setFeedbackOpen(true)}>Doctor Feedback</Button>
            <Button onClick={handleApproveCurrent} type="primary" danger loading={approveLoading}>Approve ECG</Button>
            <Button onClick={() => (isMultiInstance ? handleDownloadPDFFor(currentInstanceId) : handleDownloadPDF())} icon={<DownloadOutlined />} loading={pdfLoading}>
              Download PDF
            </Button>
          </Space>
        </div>
        
        {/* Inline notes/tags section removed to avoid duplication */}
        
        <Divider />
        {isMultiInstance ? (
          <Tabs
            activeKey={activeInstanceKey}
            onChange={setActiveInstanceKey}
            type="line"
            items={instanceIds.map(id => ({
              key: id,
              label: id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id,
              children: renderInstancePanel(id, interpretationsByInstance[id])
            }))}
          />
        ) : (
          interpretationData && interpretationData.results && interpretationData.results.length > 0 ? (
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
          )
        )}
      </Card>

      {/* Doctor Feedback Modal */}
      <Modal
        title="Doctor Feedback"
        open={feedbackOpen}
        onCancel={() => setFeedbackOpen(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleSubmitFeedback}>
          <Form.Item name="feedback" label="Feedback" rules={[{ required: true, message: 'Please enter feedback' }]}>
            <Input.TextArea rows={4} placeholder="Your clinical feedback" />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Input placeholder="Comma separated" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setFeedbackOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Submit</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Update ECG Modal removed per request */}
    </div>
  );
};

export default XAIResultPage;

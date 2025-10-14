import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Button, Spin, Alert, Row, Col, Divider, Tag, Space, Tabs, Image, Form, Input, List, message, Modal, Table, Statistic } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { aiDiagnosisAPI, ecgAPI, feedbackAPI } from '../services/api/ecg';

const { Title, Text } = Typography;

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

// Pretty print snake_case keys and attach common units for readability
const prettyLabel = (key) => String(key || '')
  .replace(/_/g, ' ')
  .replace(/\b([a-z])/g, (m, c) => c.toUpperCase());

const valueWithUnit = (key, value) => {
  if (value === null || value === undefined) return '' + value;
  const n = Number(value);
  const isNum = !Number.isNaN(n);
  const fmt = (v) => {
    if (!isNum) return String(value);
    if (Math.abs(n) >= 100) return n.toFixed(0);
    if (Math.abs(n) >= 10) return n.toFixed(1);
    if (Math.abs(n) >= 1) return n.toFixed(2);
    return n.toFixed(3);
  };
  const unitsByKey = {
    average_heart_rate_bpm: ' bpm',
    rr_cv: '',
    pr_mean_s: ' s',
    pr_min_s: ' s',
    pr_max_s: ' s'
  };
  if (Object.prototype.hasOwnProperty.call(unitsByKey, key)) return `${fmt(n)}${unitsByKey[key]}`;
  if (/_bpm$/.test(key)) return `${fmt(n)} bpm`;
  if (/_ms$/.test(key)) return `${fmt(n)} ms`;
  if (/_s$/.test(key)) return `${fmt(n)} s`;
  return isNum ? fmt(n) : String(value);
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
  const [feedbackForm] = Form.useForm();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [userId, setUserId] = useState(null); // We'll need the user ID for the API call
  const [ecgInfo, setEcgInfo] = useState({
    notes: '',
    tags: '',
    approved_status: false
  });
  // Doctor feedback modal removed; using only bottom feedback form
  const [feedbackList, setFeedbackList] = useState([]);
  
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

  // Map abnormality codes to detailed names for header display
  const DISEASE_FULL_NAMES = {
    AFIB: 'Atrial Fibrillation',
    AFLT: 'Atrial Flutter',
    STACH: 'Sinus Tachycardia',
    SB: 'Sinus Bradycardia',
    SBRAD: 'Sinus Bradycardia',
    '1dAVB': 'First-degree AV Block',
    '2dAVB': 'Second-degree AV Block',
    '3dAVB': 'Third-degree AV Block',
    LBBB: 'Left Bundle Branch Block',
    RBBB: 'Right Bundle Branch Block',
    PAC: 'Premature Atrial Complex',
    PVC: 'Premature Ventricular Complex',
    NORM: 'Normal Rhythm',
    NR: 'Normal Rhythm',
  };
  const selectedDiseaseFullNames = (selectedDiseases || []).map((code) => DISEASE_FULL_NAMES[code] || code);

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
  // Removed global approved badge in feedback section to avoid duplicate status

  const normalizeFeedbackList = (list) => {
    const arr = Array.isArray(list) ? list.slice() : [];
    return arr.sort((a, b) => new Date(a.timestamp || a.created_at || 0) - new Date(b.timestamp || b.created_at || 0));
  };

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
          // Load feedback for the first instance
          const active = instanceIds[0];
          try {
            const fb = await feedbackAPI.getFeedbackHistory(active);
            setFeedbackList(normalizeFeedbackList(fb));
          } catch (_) {}
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
            // Load feedback for the single instance
            try {
              const fb = await feedbackAPI.getFeedbackHistory(instanceIds[0]);
              setFeedbackList(normalizeFeedbackList(fb));
            } catch (_) {}
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

  // Refresh feedback when switching active instance tab
  useEffect(() => {
    const loadFeedbackForActive = async () => {
      if (!isMultiInstance || !activeInstanceKey) return;
      try {
        const fb = await feedbackAPI.getFeedbackHistory(activeInstanceKey);
        setFeedbackList(normalizeFeedbackList(fb));
      } catch (_) {}
    };
    loadFeedbackForActive();
  }, [isMultiInstance, activeInstanceKey]);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };
  
  // Update ECG handler removed with inline notes section
  
  // removed unused handleApprove
  
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
      } else {
        setInterpretationsByInstance(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            ecg_file: { ...(prev[id]?.ecg_file || {}), approved_status: true }
          }
        }));
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
      const uid = isMultiInstance ? (interpretationsByInstance[id]?.ecg_file?.patient_id) : userId;
      if (!uid) throw new Error('Missing user ID');
      // Replace notes with only the latest note (no history)
      const newNotes = `[${new Date().toLocaleString()}] Doctor feedback: ${values.feedback}`;
      // Save notes only; omit approved_status
      await ecgAPI.updateECGFile(uid, id, newNotes, '', undefined);
      if (!isMultiInstance) {
        setEcgInfo(prev => ({ ...prev, notes: newNotes }));
      } else {
        setInterpretationsByInstance(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            ecg_file: { ...(prev[id]?.ecg_file || {}), notes: newNotes }
          }
        }));
      }
      // Append to bottom of list
      setFeedbackList(prev => [...prev, {
        id: `local-${Date.now()}`,
        instance_id: id,
        details: values.feedback,
        tags: values.tags || '',
        status: 'notes',
        timestamp: new Date().toISOString()
      }]);
      // Close and reset modal form
      try { feedbackForm.resetFields(); } catch (_) {}
      setShowFeedbackModal(false);
      message.success('Feedback submitted');
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

  // Do not hard-stop the page on error; show banner instead

  // Render a disease tab content
  const renderDiseaseTab = (result, index) => {
    if (!result || !result.report) {
      return <Alert message="No report data available" type="warning" />;
    }

    const { report } = result;
    const statistics = result.statistics || report.statistics;
    
    return (
      <div>
        <Row gutter={[16, 16]}>
          {/* Summary (new) */}
          {report.summary && (
            <Col span={24}>
              <Card type="inner" title="Summary">
                <div style={{ whiteSpace: 'pre-line' }}>
                  <Text>
                    {typeof report.summary.report_text === 'string'
                      ? report.summary.report_text
                      : JSON.stringify(report.summary)}
                  </Text>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {typeof report.summary.is_abnormality_present === 'boolean' && (
                    <Tag color={report.summary.is_abnormality_present ? 'red' : 'green'}>
                      {report.summary.is_abnormality_present ? 'Abnormality Present' : 'No Abnormality'}
                    </Tag>
                  )}
                  {typeof report.summary.abnormality_count === 'number' && (
                    <Tag color="blue">Abnormality Count: {report.summary.abnormality_count}</Tag>
                  )}
                </div>
              </Card>
            </Col>
          )}

          <Col span={24}>
            <Card type="inner" title="Detailed Report">
              <Title level={4}>
                {result.abnormality}
                <Tag color={result.status === 'ok' ? 'green' : 'orange'} style={{ marginLeft: '8px' }}>
                  {result.status || 'N/A'}
                </Tag>
              </Title>
              {Array.isArray(report.report_text) ? (
                <div>
                  {report.report_text.map((sec, idx) => (
                    <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                      {sec?.section_title && (
                        <Title level={5} style={{ marginTop: 0 }}>{sec.section_title}</Title>
                      )}
                      {sec?.content && (
                        <div style={{ whiteSpace: 'pre-line' }}>
                          <Text>{sec.content}</Text>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
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
              )}
            </Card>
          </Col>
          
          {/* Statistics (new) */}
          {statistics && (
            <Col span={24}>
              <Card type="inner" title="Statistics">
                <Row gutter={[16, 16]}>
                  {Object.entries(statistics).map(([key, val]) => (
                    <Col key={key} xs={24} sm={12} md={8} lg={6}>
                      <Card size="small">
                        <Text strong>{prettyLabel(key)}: </Text>
                        <Text>{valueWithUnit(key, val)}</Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          )}

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
      <style>
        {`
          .xai-tab-label { cursor: pointer; padding: 4px 10px; border: 1px solid #e8e8e8; border-radius: 8px; background: #fff; }
          .ant-tabs-tab:hover .xai-tab-label { background: #f0f5ff; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
        `}
      </style>
      {error && (
        <Alert
          style={{ marginBottom: 12 }}
          message="Interpretation Error"
          description={error}
          type="error"
          showIcon
        />
      )}
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
            <Button onClick={handleApproveCurrent} type="primary" loading={approveLoading} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>Approve ECG</Button>
            <Button onClick={() => setShowFeedbackModal(true)}>Doctor Feedback</Button>
            <Button onClick={() => (isMultiInstance ? handleDownloadPDFFor(currentInstanceId) : handleDownloadPDF())} icon={<DownloadOutlined />} loading={pdfLoading}>
              Download PDF
            </Button>
          </Space>
        </div>
        {selectedDiseaseFullNames && selectedDiseaseFullNames.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Text strong>Abnormalities selected: </Text>
            <Text>{selectedDiseaseFullNames.join(', ')}</Text>
          </div>
        )}
        
        {/* Inline notes/tags section removed to avoid duplication */}
        
        <Divider />
        {isMultiInstance ? (
          <Tabs
            activeKey={activeInstanceKey}
            onChange={setActiveInstanceKey}
            type="line"
            tabBarGutter={8}
            items={instanceIds.map(id => ({
              key: id,
              label: (
                <span className="xai-tab-label">
                  {id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id}
                </span>
              ),
              children: renderInstancePanel(id, interpretationsByInstance[id])
            }))}
          />
        ) : (
          interpretationData && interpretationData.results && interpretationData.results.length > 0 ? (
            <>
              {interpretationData.results.length > 1 && (
                <Alert style={{ marginBottom: 8 }} type="info" message="Tip: Click an abnormality tab to view its interpretation." showIcon />
              )}
              <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              type="card"
              style={{ marginTop: '16px' }}
              tabBarGutter={8}
              items={interpretationData.results.map((result, index) => ({
                key: index.toString(),
                label: (
                  <span className="xai-tab-label">
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
            </>
          ) : (
            <Alert 
              message="No interpretation results available" 
              description="There are no disease interpretations available for this ECG." 
              type="info" 
            />
          )
        )}
      </Card>

      {/* Feedback history at bottom - centered layout */}
      <Card title="Doctor Feedback" headStyle={{ textAlign: 'center' }} style={{ marginTop: 16 }}>
        <Row justify="center">
          <Col xs={24} sm={20} md={16} lg={12} xl={10}>
            {feedbackList && feedbackList.length > 0 ? (
              (() => {
                const last = feedbackList[feedbackList.length - 1] || {};
                return (
                  <Card size="small" bodyStyle={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(last.timestamp || last.created_at || Date.now()).toLocaleString()}
                      </Text>
                    </div>
                    <div style={{ whiteSpace: 'pre-line', marginTop: 8 }}>
                      <Text strong>Doctor feedback: </Text>
                      <Text>{last.details || last.feedback || ''}</Text>
                    </div>
                    {(last.tags && String(last.tags).trim() !== '') && (
                      <div style={{ marginTop: 8 }}>
                        <Tag>{last.tags}</Tag>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                      <Button type="primary" onClick={() => setShowFeedbackModal(true)}>Give Feedback</Button>
                      {feedbackList && feedbackList.length > 0 && (
                        <Button onClick={() => setShowHistoryModal(true)}>View Feedback History</Button>
                      )}
                    </div>
                  </Card>
                );
              })()
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">No feedback yet.</Text>
                <div style={{ marginTop: 12 }}>
                  <Button type="primary" onClick={() => setShowFeedbackModal(true)}>Give Feedback</Button>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* Doctor Feedback Modal */}
      <Modal
        title="Doctor Feedback"
        open={showFeedbackModal}
        onCancel={() => setShowFeedbackModal(false)}
        onOk={() => feedbackForm.submit()}
        okText="Submit"
      >
        <Form layout="vertical" form={feedbackForm} onFinish={handleSubmitFeedback}>
          <Form.Item name="tags" label="Tags">
            <Input placeholder="Comma separated" />
          </Form.Item>
          <Form.Item name="feedback" label="Feedback" rules={[{ required: true, message: 'Please enter feedback' }]}> 
            <Input.TextArea rows={4} placeholder="Your clinical feedback" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Feedback History Modal (tabular) */}
      <Modal
        title="Feedback History"
        open={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        footer={null}
        width={800}
      >
        <Table
          size="middle"
          pagination={{ pageSize: 8 }}
          rowKey={(r, idx) => r.id || `${r.instance_id || 'inst'}-${r.timestamp || idx}`}
          dataSource={(feedbackList || []).map((f) => ({
            time: new Date(f.timestamp || f.created_at || Date.now()).toLocaleString(),
            feedback: f.details || f.feedback || '',
            tags: f.tags || '',
            status: f.status || ''
          }))}
          columns={[
            { title: 'Time', dataIndex: 'time', key: 'time', width: 200 },
            { title: 'Doctor Feedback', dataIndex: 'feedback', key: 'feedback' },
            { title: 'Tags', dataIndex: 'tags', key: 'tags', width: 180 },
            { title: 'Status', dataIndex: 'status', key: 'status', width: 120 }
          ]}
        />
      </Modal>

      

      {/* Doctor Feedback Modal removed */}

      {/* Update ECG Modal removed per request */}
    </div>
  );
};

export default XAIResultPage;

import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Divider, 
  Alert, 
  Row, 
  Col, 
  Tag, 
  Progress, 
  List, 
  Collapse,
  Badge,
  Tooltip,
  Modal
} from 'antd';
import { 
  FileTextOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ExperimentOutlined,
  CodeOutlined,
  EyeOutlined,
  CommentOutlined,
  FilePdfOutlined,
  ApiOutlined,
  TrophyOutlined,
  StarOutlined
} from '@ant-design/icons';
import AIInterpretationUI from './AIInterpretationUI';
import DoctorFeedbackInterface from './DoctorFeedbackInterface';
import PDFReportExport from './PDFReportExport';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const TestDeliverablesSidebar = () => {
  const [showAIOverlay, setShowAIOverlay] = useState(true);
  const [showAIView, setShowAIView] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Mock data for testing
  const sampleEcgData = {
    recordingDate: '2025-08-01',
    duration: '10 seconds',
    leads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
    imageUrl: 'https://via.placeholder.com/400x200?text=ECG+Image'
  };

  const sampleAiDiagnosis = {
    confidence: 85,
    primary: 'Normal Sinus Rhythm',
    secondary: ['ST segment elevation in V2-V4', 'T wave inversion in lead III'],
    highlighted_leads: ['V2', 'V3', 'V4'],
    recommendations: 'Consider further evaluation for possible myocardial ischemia.',
    details: {
      primary: 'Normal Sinus Rhythm with ST segment elevation',
      secondary: ['ST segment elevation in V2-V4', 'T wave inversion in lead III'],
      recommendations: 'Consider further evaluation for possible myocardial ischemia.'
    }
  };

  const samplePatientInfo = {
    name: 'John Doe',
    id: 'P12345',
    birthDate: '1980-05-15',
    gender: 'M'
  };

  const sampleFeedback = {
    approved: true,
    comment: 'AI diagnosis is accurate. Patient shows typical signs of anterior wall ischemia.',
    confidence: 4,
    timestamp: new Date().toISOString()
  };

  const deliverables = [
    {
      id: 'ai-interpretation',
      name: 'AI Interpretation UI',
      icon: <EyeOutlined />,
      status: 'completed',
      hours: 50,
      description: 'Display AI diagnosis with confidence scores and highlighted leads',
      features: [
        'Confidence scoring display',
        'Highlighted leads visualization',
        'Toggle AI overlay controls',
        'Modular component design'
      ],
      component: 'AIInterpretationUI'
    },
    {
      id: 'doctor-feedback',
      name: 'Doctor Feedback Interface',
      icon: <CommentOutlined />,
      status: 'completed',
      hours: 40,
      description: 'Clinical review interface for doctors to approve/correct AI diagnoses',
      features: [
        'Approve/Correct buttons',
        'Comment system with validation',
        'Confidence rating',
        'Re-analysis requests'
      ],
      component: 'DoctorFeedbackInterface'
    },
    {
      id: 'pdf-export',
      name: 'PDF Report Export',
      icon: <FilePdfOutlined />,
      status: 'completed',
      hours: 30,
      description: 'Professional clinical report generation with AI insights',
      features: [
        'Clinical-grade PDF reports',
        'AI diagnosis integration',
        'Doctor feedback inclusion',
        'Customizable templates'
      ],
      component: 'PDFReportExport'
    },
    {
      id: 'api-integration',
      name: 'Frontend API Integration',
      icon: <ApiOutlined />,
      status: 'completed',
      hours: 30,
      description: 'Complete API service layer with error handling',
      features: [
        'ECG API services',
        'AI diagnosis API',
        'Feedback API',
        'PDF generation API'
      ],
      component: 'API Services'
    }
  ];

  const totalHours = deliverables.reduce((sum, item) => sum + item.hours, 0);
  const completedHours = deliverables.filter(item => item.status === 'completed').reduce((sum, item) => sum + item.hours, 0);
  const completionPercentage = (completedHours / totalHours) * 100;

  const handleComponentClick = (component) => {
    setSelectedComponent(component);
    setIsModalVisible(true);
  };

  const handleFeedbackSubmit = (feedbackData) => {
    console.log('Feedback submitted:', feedbackData);
    alert('Feedback submitted successfully! (Mock - no backend required)');
  };

  const handleExportComplete = (fileName) => {
    console.log('PDF exported:', fileName);
    alert('PDF report generated successfully! (Mock - no backend required)');
  };

  const renderComponentModal = () => {
    if (!selectedComponent) return null;

    const component = deliverables.find(d => d.id === selectedComponent);
    
    return (
      <Modal
        title={
          <Space>
            {component.icon}
            <span>{component.name}</span>
            <Tag color="green">COMPLETED</Tag>
          </Space>
        }
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="Live Component Demo"
            description="This is a working demo of the component with mock data. No backend required."
            type="info"
            showIcon
          />
          
          {component.id === 'ai-interpretation' && (
            <AIInterpretationUI
              ecgData={sampleEcgData}
              aiDiagnosis={sampleAiDiagnosis}
              onToggleAIOverlay={() => setShowAIOverlay(!showAIOverlay)}
              showAIOverlay={showAIOverlay}
            />
          )}
          
          {component.id === 'doctor-feedback' && (
            <DoctorFeedbackInterface
              aiDiagnosis={sampleAiDiagnosis}
              onFeedbackSubmit={handleFeedbackSubmit}
              onToggleAIView={() => setShowAIView(!showAIView)}
              showAIView={showAIView}
              patientId="test-patient-123"
              ecgFileId="test-ecg-456"
              doctorId="test-doctor-789"
            />
          )}
          
          {component.id === 'pdf-export' && (
            <PDFReportExport
              ecgData={sampleEcgData}
              aiDiagnosis={sampleAiDiagnosis}
              doctorFeedback={sampleFeedback}
              patientInfo={samplePatientInfo}
              onExportComplete={handleExportComplete}
            />
          )}
          
          {component.id === 'api-integration' && (
            <Card title="API Service Layer">
              <List
                dataSource={component.features}
                renderItem={item => (
                  <List.Item>
                    <CheckCircleOutlined style={{ color: 'green', marginRight: 8 }} />
                    {item}
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Space>
      </Modal>
    );
  };

  return (
    <div style={{ padding: 16, maxWidth: 400 }}>
      {/* Header */}
      <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
          <TrophyOutlined style={{ fontSize: 32, color: '#fff' }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            Frontend Deliverables
          </Title>
          <Text style={{ color: '#fff', opacity: 0.8 }}>
            {completedHours}/{totalHours} hours completed
          </Text>
          <Progress 
            percent={completionPercentage} 
            size="small" 
            strokeColor="#fff"
            trailColor="rgba(255,255,255,0.3)"
          />
        </Space>
      </Card>

      {/* Deliverables List */}
      <Card title="🎯 Your Deliverables" style={{ marginBottom: 16 }}>
        <List
          dataSource={deliverables}
          renderItem={item => (
            <List.Item
              style={{ 
                padding: '12px 0',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0'
              }}
              onClick={() => handleComponentClick(item.id)}
            >
              <List.Item.Meta
                avatar={
                  <Badge status="success" dot>
                    {item.icon}
                  </Badge>
                }
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    <Tag color="green">COMPLETED</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">{item.description}</Text>
                    <Space>
                      <Text type="secondary">{item.hours}h</Text>
                      <Tooltip title="Click to view live demo">
                        <EyeOutlined style={{ color: '#1890ff' }} />
                      </Tooltip>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Quick Stats */}
      <Card title="📊 Quick Stats" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ color: '#52c41a', margin: 0 }}>
                {deliverables.length}
              </Title>
              <Text type="secondary">Components</Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ color: '#1890ff', margin: 0 }}>
                {totalHours}h
              </Title>
              <Text type="secondary">Total Work</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Integration Status */}
      <Card title="🔗 Integration Status" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="Frontend Ready"
            description="All components implemented and tested"
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
          <Alert
            message="Backend Integration"
            description="Waiting for API endpoints from teammates"
            type="warning"
            showIcon
            icon={<ClockCircleOutlined />}
          />
        </Space>
      </Card>

      {/* Quick Actions */}
      <Card title="⚡ Quick Actions">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            type="primary" 
            block 
            icon={<ExperimentOutlined />}
            onClick={() => window.open('/test-deliverables', '_blank')}
          >
            View Full Demo
          </Button>
          <Button 
            block 
            icon={<CodeOutlined />}
            onClick={() => window.open('/ai-engine-showcase', '_blank')}
          >
            AI Engine Showcase
          </Button>
        </Space>
      </Card>

      {/* Component Modal */}
      {renderComponentModal()}
    </div>
  );
};

export default TestDeliverablesSidebar; 
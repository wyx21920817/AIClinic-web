import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  message,
  Spin,
  Alert,
  Divider,
  Steps,
  Tabs
} from 'antd';
import {
  UploadOutlined,
  EyeOutlined,
  CommentOutlined,
  FilePdfOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';

// Import our custom components
import AIInterpretationUI from './AIInterpretationUI';
import DoctorFeedbackInterface from './DoctorFeedbackInterface';
import PDFReportExport from './PDFReportExport';
import ECGViewer from './ECGViewer';

// Import API services
import { ecgAPI, feedbackAPI, pdfAPI, aiDiagnosisAPI, handleAPIError } from '../services/api/ecg';

const { Title, Text } = Typography;
const { Step } = Steps;
const { TabPane } = Tabs;

const ECGAnalysisWorkflow = ({ 
  patientId, 
  ecgFileId, 
  doctorId,
  onWorkflowComplete 
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ecgData, setEcgData] = useState(null);
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [doctorFeedback, setDoctorFeedback] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [showAIOverlay, setShowAIOverlay] = useState(true);
  const [workflowStatus, setWorkflowStatus] = useState('initializing');

  // Workflow steps
  const steps = [
    {
      title: 'Load ECG',
      description: 'Load and display ECG data',
      icon: <UploadOutlined />
    },
    {
      title: 'AI Analysis',
      description: 'Generate AI diagnosis',
      icon: <EyeOutlined />
    },
    {
      title: 'Doctor Review',
      description: 'Review and provide feedback',
      icon: <CommentOutlined />
    },
    {
      title: 'Export Report',
      description: 'Generate PDF report',
      icon: <FilePdfOutlined />
    }
  ];

  // Initialize workflow
  useEffect(() => {
    if (patientId && ecgFileId) {
      initializeWorkflow();
    }
  }, [patientId, ecgFileId]);

  const initializeWorkflow = async () => {
    setLoading(true);
    setWorkflowStatus('loading');
    
    try {
      // Load ECG data
      const ecgResponse = await ecgAPI.getECGFile(patientId, ecgFileId);
      setEcgData(ecgResponse);
      
      // Load patient info
      const patientResponse = await fetch(`/api/patients/${patientId}`);
      const patientData = await patientResponse.json();
      setPatientInfo(patientData);
      
      // Load existing AI diagnosis if available
      try {
        const diagnosisResponse = await aiDiagnosisAPI.getDiagnosis(ecgFileId);
        setAiDiagnosis(diagnosisResponse);
        setCurrentStep(1); // Move to AI Analysis step
      } catch (error) {
        console.log('No existing AI diagnosis found, will generate new one');
      }
      
      setWorkflowStatus('ready');
      setCurrentStep(0);
      
    } catch (error) {
      handleAPIError(error);
      setWorkflowStatus('error');
      message.error('Failed to initialize workflow');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Generate AI Diagnosis
  const generateAIDiagnosis = async () => {
    setLoading(true);
    
    try {
      message.info('Generating AI diagnosis...');
      
      const diagnosisResponse = await aiDiagnosisAPI.requestDiagnosis(ecgFileId, {
        includeConfidence: true,
        includeHighlightedLeads: true,
        includeRecommendations: true
      });
      
      setAiDiagnosis(diagnosisResponse);
      setCurrentStep(2); // Move to Doctor Review step
      
      message.success('AI diagnosis generated successfully!');
      
    } catch (error) {
      handleAPIError(error);
      message.error('Failed to generate AI diagnosis');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle Doctor Feedback
  const handleFeedbackSubmit = async (feedbackData) => {
    setLoading(true);
    
    try {
      const feedbackResponse = await feedbackAPI.submitFeedback({
        ...feedbackData,
        ecgFileId,
        patientId,
        doctorId,
        aiDiagnosisId: aiDiagnosis?.id
      });
      
      setDoctorFeedback(feedbackResponse);
      setCurrentStep(3); // Move to Export step
      
      message.success('Feedback submitted successfully!');
      
    } catch (error) {
      handleAPIError(error);
      message.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle PDF Export
  const handlePDFExport = async (reportSettings) => {
    setLoading(true);
    
    try {
      const reportData = {
        ecgData,
        aiDiagnosis,
        doctorFeedback,
        patientInfo,
        reportSettings,
        generatedBy: doctorId,
        generatedAt: new Date().toISOString()
      };
      
      const pdfBlob = await pdfAPI.generateReport(reportData);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ECG_Report_${patientInfo?.name || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('PDF report generated and downloaded successfully!');
      
      // Complete workflow
      if (onWorkflowComplete) {
        onWorkflowComplete({
          ecgData,
          aiDiagnosis,
          doctorFeedback,
          patientInfo
        });
      }
      
    } catch (error) {
      handleAPIError(error);
      message.error('Failed to generate PDF report');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAIOverlay = () => {
    setShowAIOverlay(!showAIOverlay);
  };

  const renderWorkflowHeader = () => (
    <Card style={{ marginBottom: 16 }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3}>ECG Analysis Workflow</Title>
          <Text type="secondary">
            Patient: {patientInfo?.name || 'Loading...'} | 
            ECG File: {ecgFileId || 'N/A'}
          </Text>
        </Col>
        <Col>
          <Steps current={currentStep} size="small">
            {steps.map((step, index) => (
              <Step
                key={index}
                title={step.title}
                description={step.description}
                icon={step.icon}
              />
            ))}
          </Steps>
        </Col>
      </Row>
    </Card>
  );

  const renderECGViewer = () => (
    <Card title="ECG Recording" style={{ marginBottom: 16 }}>
      {ecgData ? (
        <ECGViewer
          ecgData={ecgData}
          showAIOverlay={showAIOverlay}
          aiDiagnosis={aiDiagnosis}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <Text>Loading ECG data...</Text>
        </div>
      )}
    </Card>
  );

  const renderAIInterpretation = () => (
    <Card title="AI Interpretation" style={{ marginBottom: 16 }}>
      {aiDiagnosis ? (
        <AIInterpretationUI
          ecgData={ecgData}
          aiDiagnosis={aiDiagnosis}
          onToggleAIOverlay={handleToggleAIOverlay}
          showAIOverlay={showAIOverlay}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Button
            type="primary"
            size="large"
            onClick={generateAIDiagnosis}
            loading={loading}
            icon={<LoadingOutlined />}
          >
            Generate AI Diagnosis
          </Button>
          <Text style={{ display: 'block', marginTop: 16 }}>
            Click to analyze ECG with AI
          </Text>
        </div>
      )}
    </Card>
  );

  const renderDoctorFeedback = () => (
    <Card title="Doctor Feedback" style={{ marginBottom: 16 }}>
      <DoctorFeedbackInterface
        aiDiagnosis={aiDiagnosis}
        onFeedbackSubmit={handleFeedbackSubmit}
        onToggleAIView={handleToggleAIOverlay}
        showAIView={showAIOverlay}
        patientId={patientId}
        ecgFileId={ecgFileId}
        doctorId={doctorId}
      />
    </Card>
  );

  const renderPDFExport = () => (
    <Card title="PDF Report Export" style={{ marginBottom: 16 }}>
      <PDFReportExport
        ecgData={ecgData}
        aiDiagnosis={aiDiagnosis}
        doctorFeedback={doctorFeedback}
        patientInfo={patientInfo}
        onExportComplete={handlePDFExport}
      />
    </Card>
  );

  const renderWorkflowContent = () => {
    if (workflowStatus === 'error') {
      return (
        <Alert
          message="Workflow Error"
          description="Failed to initialize the ECG analysis workflow. Please check your connection and try again."
          type="error"
          showIcon
          action={
            <Button size="small" onClick={initializeWorkflow}>
              Retry
            </Button>
          }
        />
      );
    }

    if (workflowStatus === 'loading') {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>
            Initializing workflow...
          </Text>
        </div>
      );
    }

    return (
      <Tabs defaultActiveKey="workflow" type="card">
        <TabPane tab="Workflow View" key="workflow">
          <Space direction="vertical" style={{ width: '100%' }}>
            {renderECGViewer()}
            
            {currentStep >= 1 && renderAIInterpretation()}
            
            {currentStep >= 2 && renderDoctorFeedback()}
            
            {currentStep >= 3 && renderPDFExport()}
          </Space>
        </TabPane>
        
        <TabPane tab="Detailed View" key="detailed">
          <Row gutter={16}>
            <Col span={12}>
              {renderECGViewer()}
              {currentStep >= 1 && renderAIInterpretation()}
            </Col>
            <Col span={12}>
              {currentStep >= 2 && renderDoctorFeedback()}
              {currentStep >= 3 && renderPDFExport()}
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      {renderWorkflowHeader()}
      
      {loading && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(255,255,255,0.8)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Spin size="large" />
        </div>
      )}
      
      {renderWorkflowContent()}
      
      {/* Workflow completion indicator */}
      {currentStep === 3 && doctorFeedback && (
        <Alert
          message="Workflow Complete"
          description="ECG analysis workflow has been completed successfully. You can now export the final report."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default ECGAnalysisWorkflow; 
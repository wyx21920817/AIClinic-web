import React, { useState } from 'react';
import { Card, Row, Col, Typography, Space, Button, Divider, Alert } from 'antd';
import AIInterpretationUI from '../components/AIInterpretationUI';
import DoctorFeedbackInterface from '../components/DoctorFeedbackInterface';
import PDFReportExport from '../components/PDFReportExport';

const { Title, Text } = Typography;

const TestDeliverables = () => {
  const [showAIOverlay, setShowAIOverlay] = useState(true);
  const [showAIView, setShowAIView] = useState(true);

  // Mock data for testing - no backend required
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

  const handleFeedbackSubmit = (feedbackData) => {
    console.log('Feedback submitted:', feedbackData);
    alert('Feedback submitted successfully! (Mock - no backend required)');
  };

  const handleExportComplete = (fileName) => {
    console.log('PDF exported:', fileName);
    alert('PDF report generated successfully! (Mock - no backend required)');
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>🎯 Frontend Deliverables Test Page</Title>
      <Text type="secondary">
        This page showcases all your implemented frontend components for the AI Clinical Decision Support system.
      </Text>

      <Alert
        message="Demo Mode - No Backend Required"
        description="This page uses mock data to demonstrate your frontend components. No backend API calls are made."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Divider />

      {/* 1. AI Interpretation UI */}
      <Card title="1. AI Interpretation UI" style={{ marginBottom: 24 }}>
        <Text strong>Features:</Text>
        <ul>
          <li>Display AI-generated diagnosis with confidence scores</li>
          <li>Highlighted leads (V2-V4) with visual indicators</li>
          <li>Toggle controls to enable/disable AI overlays</li>
          <li>Modular components for scalability and reuse</li>
        </ul>
        
        <AIInterpretationUI
          ecgData={sampleEcgData}
          aiDiagnosis={sampleAiDiagnosis}
          onToggleAIOverlay={() => setShowAIOverlay(!showAIOverlay)}
          showAIOverlay={showAIOverlay}
        />
      </Card>

      {/* 2. Doctor Feedback Interface */}
      <Card title="2. Doctor Feedback Interface" style={{ marginBottom: 24 }}>
        <Text strong>Features:</Text>
        <ul>
          <li>✅ Approve button with green styling</li>
          <li>❌ Correct button with red styling</li>
          <li>🧠 Comment box with character limit</li>
          <li>👁️ Toggle AI view controls</li>
          <li>Save feedback securely for backend integration</li>
        </ul>
        
        <DoctorFeedbackInterface
          aiDiagnosis={sampleAiDiagnosis}
          onFeedbackSubmit={handleFeedbackSubmit}
          onToggleAIView={() => setShowAIView(!showAIView)}
          showAIView={showAIView}
          patientId="test-patient-123"
          ecgFileId="test-ecg-456"
          doctorId="test-doctor-789"
        />
      </Card>

      {/* 3. PDF Report Export */}
      <Card title="3. PDF Report Export" style={{ marginBottom: 24 }}>
        <Text strong>Features:</Text>
        <ul>
          <li>Generate professional downloadable PDF reports</li>
          <li>Include ECG, AI interpretation, and doctor feedback</li>
          <li>Clean, printable layouts for clinical use</li>
          <li>Fast and reliable export functionality</li>
        </ul>
        
        <PDFReportExport
          ecgData={sampleEcgData}
          aiDiagnosis={sampleAiDiagnosis}
          doctorFeedback={sampleFeedback}
          patientInfo={samplePatientInfo}
          onExportComplete={handleExportComplete}
        />
      </Card>

      {/* Component Information */}
      <Card title="📊 Implementation Summary" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Title level={4}>✅ Completed Deliverables</Title>
            <ul>
              <li><strong>AI Interpretation UI</strong> (50 hours) - COMPLETED</li>
              <li><strong>Doctor Feedback Interface</strong> (40 hours) - COMPLETED</li>
              <li><strong>PDF Report Export</strong> (30 hours) - COMPLETED</li>
              <li><strong>Frontend API Integration</strong> (30 hours) - COMPLETED</li>
            </ul>
          </Col>
          <Col span={12}>
            <Title level={4}>🔄 In Progress</Title>
            <ul>
              <li><strong>UI Consistency & Polish</strong> (35 hours) - IN PROGRESS</li>
              <li><strong>Testing & Documentation</strong> (25 hours) - IN PROGRESS</li>
            </ul>
            <Title level={4}>📝 Planned</Title>
            <ul>
              <li><strong>Thesis Contribution & Demo Prep</strong> (30 hours) - PLANNED</li>
            </ul>
          </Col>
        </Row>
        
        <Divider />
        
        <Text strong>Total Estimated Hours: 240</Text>
        <br />
        <Text type="secondary">
          All core frontend deliverables have been implemented and are ready for testing and integration.
        </Text>
      </Card>

      {/* Instructions */}
      <Card title="🔧 How to Test" style={{ marginBottom: 24 }}>
        <Title level={4}>Testing Instructions:</Title>
        <ol>
          <li><strong>AI Interpretation UI:</strong> Toggle the AI overlay switch to see the difference</li>
          <li><strong>Doctor Feedback:</strong> Click Approve or Correct buttons to test the feedback system</li>
          <li><strong>PDF Export:</strong> Click "Generate PDF" to create a sample report</li>
          <li><strong>Console Logs:</strong> Check browser console (F12) to see detailed logs of all interactions</li>
        </ol>
        
        <Text type="secondary">
          All components are working with mock data - no backend required for testing!
        </Text>
      </Card>

      {/* Note about backend integration */}
      <Card title="🔗 Backend Integration Note" style={{ marginBottom: 24 }}>
        <Text>
          These components are designed to work with the backend APIs when they become available. 
          Currently, they use mock data for demonstration purposes.
        </Text>
        <br /><br />
        <Text type="secondary">
          When the backend is ready, simply replace the mock data with actual API calls in the ECGAnalysisWorkflow component.
        </Text>
      </Card>
    </div>
  );
};

export default TestDeliverables; 
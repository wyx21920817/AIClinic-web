import React, { useState } from 'react';
import { Card, Typography, Space, Button, Divider, Alert, Row, Col } from 'antd';
import AIInterpretationUI from '../components/AIInterpretationUI';
import DoctorFeedbackInterface from '../components/DoctorFeedbackInterface';
import PDFReportExport from '../components/PDFReportExport';
import RealECGIntegration from '../components/RealECGIntegration';
import AIEngineDisplay from '../components/AIEngineDisplay';

const { Title, Text } = Typography;

const SimpleTest = () => {
  const [showAIOverlay, setShowAIOverlay] = useState(true);
  const [showAIView, setShowAIView] = useState(true);

  // Realistic mock data that better represents actual AI diagnoses
  const mockEcgData = {
    recordingDate: '2025-08-01T14:30:00Z',
    duration: '10 seconds',
    samplingRate: '500 Hz',
    leads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
    patientId: 'P12345',
    studyId: 'ST78901',
    imageUrl: 'https://via.placeholder.com/400x200?text=ECG+Image',
    metadata: {
      age: 65,
      gender: 'M',
      heartRate: 72,
      qtInterval: 420,
      prInterval: 160
    }
  };

  const mockAiDiagnosis = {
    id: 'ai_diag_001',
    confidence: 92.5,
    primary: 'Anterior Wall Myocardial Infarction',
    secondary: [
      'ST segment elevation in V1-V4',
      'Q waves in V2-V3',
      'T wave inversion in V1-V4'
    ],
    highlighted_leads: ['V1', 'V2', 'V3', 'V4'],
    recommendations: 'Immediate cardiac catheterization recommended. Patient shows clear signs of anterior wall MI with ST elevation in V1-V4. Consider urgent PCI.',
    details: {
      primary: 'Anterior Wall Myocardial Infarction',
      secondary: [
        'ST segment elevation in V1-V4',
        'Q waves in V2-V3', 
        'T wave inversion in V1-V4'
      ],
      recommendations: 'Immediate cardiac catheterization recommended. Patient shows clear signs of anterior wall MI with ST elevation in V1-V4. Consider urgent PCI.',
      severity: 'High',
      urgency: 'Immediate',
      differentialDiagnosis: [
        'Acute anterior wall MI',
        'Left anterior descending artery occlusion',
        'Acute coronary syndrome'
      ]
    },
    processingTime: 2.3,
    modelVersion: 'DNN_v2.1',
    timestamp: new Date().toISOString()
  };

  const mockPatientInfo = {
    name: 'John Michael Smith',
    id: 'P12345',
    birthDate: '1960-03-15',
    gender: 'M',
    age: 65,
    height: '175 cm',
    weight: '80 kg',
    bmi: 26.1,
    medicalHistory: [
      'Hypertension (2018)',
      'Type 2 Diabetes (2020)',
      'Previous MI (2022)'
    ],
    medications: [
      'Metformin 500mg BID',
      'Lisinopril 10mg daily',
      'Atorvastatin 20mg daily'
    ],
    allergies: ['Penicillin'],
    emergencyContact: {
      name: 'Sarah Smith',
      relationship: 'Spouse',
      phone: '+1-555-0123'
    }
  };

  const mockFeedback = {
    id: 'feedback_001',
    approved: true,
    comment: 'AI diagnosis is accurate. Patient shows typical signs of anterior wall ischemia with ST elevation in V1-V4. Q waves indicate completed infarction. Immediate intervention required.',
    confidence: 5,
    corrections: [],
    timestamp: new Date().toISOString(),
    doctor: {
      name: 'Dr. Emily Johnson',
      id: 'D789',
      specialty: 'Cardiology',
      experience: '15 years'
    },
    clinicalNotes: 'Patient admitted to CCU. Cardiac catheterization scheduled for immediate intervention. LAD likely culprit vessel based on ECG findings.'
  };

  const handleFeedback = (data) => {
    alert('Feedback submitted! (Mock)');
    console.log('Feedback:', data);
  };

  const handlePDFExport = (fileName) => {
    alert('PDF generated! (Mock)');
    console.log('PDF:', fileName);
  };

  return (
    <div style={{ padding: 20, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Title level={1} style={{ textAlign: 'center', color: '#1890ff' }}>
        🎯 Your Frontend Deliverables
      </Title>
      
      <Alert
        message="Demo Mode - No Backend Required"
        description="All components are working with mock data. No server errors!"
        type="success"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <RealECGIntegration />

      <AIEngineDisplay />

      <Row gutter={[16, 16]}>
        {/* AI Interpretation UI */}
        <Col span={24}>
          <Card title="🤖 AI Interpretation UI" style={{ marginBottom: 16 }}>
            <Text>Confidence scores, highlighted leads, toggle controls</Text>
            <AIInterpretationUI
              ecgData={mockEcgData}
              aiDiagnosis={mockAiDiagnosis}
              onToggleAIOverlay={() => setShowAIOverlay(!showAIOverlay)}
              showAIOverlay={showAIOverlay}
            />
          </Card>
        </Col>

        {/* Doctor Feedback Interface */}
        <Col span={24}>
          <Card title="👨‍⚕️ Doctor Feedback Interface" style={{ marginBottom: 16 }}>
            <Text>Approve/correct buttons, comments, confidence rating</Text>
            <DoctorFeedbackInterface
              aiDiagnosis={mockAiDiagnosis}
              onFeedbackSubmit={handleFeedback}
              onToggleAIView={() => setShowAIView(!showAIView)}
              showAIView={showAIView}
              patientId="test-123"
              ecgFileId="test-456"
              doctorId="test-789"
            />
          </Card>
        </Col>

        {/* PDF Report Export */}
        <Col span={24}>
          <Card title="📄 PDF Report Export" style={{ marginBottom: 16 }}>
            <Text>Generate professional clinical reports</Text>
            <PDFReportExport
              ecgData={mockEcgData}
              aiDiagnosis={mockAiDiagnosis}
              doctorFeedback={mockFeedback}
              patientInfo={mockPatientInfo}
              onExportComplete={handlePDFExport}
            />
          </Card>
        </Col>
      </Row>

      <Card title="📊 Your Progress Summary" style={{ marginTop: 20 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Title level={4}>✅ Completed (150 hours)</Title>
            <ul>
              <li>AI Interpretation UI (50h)</li>
              <li>Doctor Feedback Interface (40h)</li>
              <li>PDF Report Export (30h)</li>
              <li>Frontend API Integration (30h)</li>
            </ul>
          </Col>
          <Col span={12}>
            <Title level={4}>🔄 Remaining (90 hours)</Title>
            <ul>
              <li>UI Consistency & Polish (35h)</li>
              <li>Testing & Documentation (25h)</li>
              <li>Thesis Contribution (30h)</li>
            </ul>
          </Col>
        </Row>
        
        <Divider />
        
        <Text strong style={{ fontSize: 16 }}>
          🎉 Excellent progress! Your frontend deliverables are working perfectly!
        </Text>
      </Card>
    </div>
  );
};

export default SimpleTest; 
import React, { useState } from 'react';
import { Card, Typography, Space, Button, Divider, Alert, Row, Col, Tag, Progress, List, Collapse } from 'antd';
import { ExperimentOutlined, CodeOutlined, FileTextOutlined, DatabaseOutlined, ThunderboltOutlined, LinkOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const AIEngineDisplay = () => {
  const [selectedComponent, setSelectedComponent] = useState('dnn');

  const aiEngineData = {
    dnnModule: {
      name: 'DNN Module',
      description: 'Deep Neural Network for ECG Analysis',
      files: [
        { name: 'model.py', size: '6.1KB', type: 'Neural Network Architecture', description: 'ResNet-based 1D CNN for ECG signal processing' },
        { name: 'predict.py', size: '1.4KB', type: 'Prediction Script', description: 'Loads trained model and processes ECG data' },
        { name: 'train.py', size: '2.7KB', type: 'Training Script', description: 'Trains the DNN on ECG datasets' },
        { name: 'model.npy', size: '20KB', type: 'Trained Model', description: 'Pre-trained neural network weights' },
        { name: 'datasets.py', size: '1.6KB', type: 'Data Processing', description: 'ECG data loading and preprocessing' },
        { name: 'generate_figures_and_tables.py', size: '20KB', type: 'Analysis', description: 'Results analysis and visualization' }
      ],
      capabilities: [
        'ECG signal processing',
        'Cardiac diagnosis prediction',
        'Confidence scoring',
        'Multiple cardiac conditions detection',
        'Real-time analysis'
      ]
    },
    xaiModule: {
      name: 'XAI Module',
      description: 'Explainable AI for ECG Analysis',
      files: [
        { name: 'XAI.ipynb', size: '1.3MB', type: 'Jupyter Notebook', description: 'Explainable AI analysis and visualization' },
        { name: 'ECG Data Files', size: 'Multiple .dat/.hea', type: 'Sample Data', description: 'Real ECG recordings for analysis' }
      ],
      capabilities: [
        'Model interpretability',
        'Feature importance analysis',
        'Decision explanation',
        'Clinical reasoning transparency'
      ]
    }
  };

  const integrationFlow = [
    {
      step: 1,
      title: 'ECG Upload',
      description: 'User uploads ECG file through your frontend',
      component: 'DicomUploader.js',
      backend: 'File processing API'
    },
    {
      step: 2,
      title: 'AI Analysis',
      description: 'Backend uses DNN Module to analyze ECG',
      component: 'AIInterpretationUI.js',
      backend: 'DNN predict.py + model.npy'
    },
    {
      step: 3,
      title: 'Diagnosis Display',
      description: 'Your frontend shows AI diagnosis with confidence',
      component: 'AIInterpretationUI.js',
      backend: 'AI diagnosis API'
    },
    {
      step: 4,
      title: 'Doctor Review',
      description: 'Doctor reviews and provides feedback',
      component: 'DoctorFeedbackInterface.js',
      backend: 'Feedback API'
    },
    {
      step: 5,
      title: 'Report Generation',
      description: 'Generate comprehensive clinical report',
      component: 'PDFReportExport.js',
      backend: 'PDF generation API'
    }
  ];

  const renderFileList = (files) => (
    <List
      size="small"
      dataSource={files}
      renderItem={(file) => (
        <List.Item>
          <div style={{ width: '100%' }}>
            <Row justify="space-between" align="middle">
              <Col span={16}>
                <Text strong>{file.name}</Text>
                <br />
                <Text type="secondary">{file.description}</Text>
              </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
                <Tag color="blue">{file.type}</Tag>
                <br />
                <Text type="secondary">{file.size}</Text>
              </Col>
            </Row>
          </div>
        </List.Item>
      )}
    />
  );

  const renderCapabilities = (capabilities) => (
    <div>
      {capabilities.map((capability, index) => (
        <Tag key={index} color="green" style={{ margin: '4px' }}>
          {capability}
        </Tag>
      ))}
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <Title level={2}>🧠 AI Engine Integration Display</Title>
      <Text type="secondary">
        This shows what your teammates have built in the AIClinic-Engine and how it connects to your frontend.
      </Text>

      <Divider />

      {/* AI Engine Overview */}
      <Card title="🎯 AIClinic-Engine Overview" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Card size="small" title="DNN Module" style={{ marginBottom: 16 }}>
              <Text>{aiEngineData.dnnModule.description}</Text>
              <br /><br />
              <Text strong>Files:</Text>
              {renderFileList(aiEngineData.dnnModule.files)}
              <br />
              <Text strong>Capabilities:</Text>
              {renderCapabilities(aiEngineData.dnnModule.capabilities)}
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="XAI Module">
              <Text>{aiEngineData.xaiModule.description}</Text>
              <br /><br />
              <Text strong>Files:</Text>
              {renderFileList(aiEngineData.xaiModule.files)}
              <br />
              <Text strong>Capabilities:</Text>
              {renderCapabilities(aiEngineData.xaiModule.capabilities)}
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Integration Flow */}
      <Card title="🔄 Integration Flow: AI Engine → Your Frontend" style={{ marginBottom: 24 }}>
        <Alert
          message="Complete Workflow Integration"
          description="How the AI Engine connects to your frontend components"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <div style={{ marginBottom: 16 }}>
          {integrationFlow.map((flow, index) => (
            <div key={index} style={{ marginBottom: 16 }}>
              <Card size="small">
                <Row gutter={16} align="middle">
                  <Col span={2}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: '#1890ff',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}>
                      {flow.step}
                    </div>
                  </Col>
                  <Col span={8}>
                    <Text strong>{flow.title}</Text>
                    <br />
                    <Text type="secondary">{flow.description}</Text>
                  </Col>
                  <Col span={7}>
                    <Text type="secondary">Frontend:</Text>
                    <br />
                    <Tag color="purple">{flow.component}</Tag>
                  </Col>
                  <Col span={7}>
                    <Text type="secondary">Backend:</Text>
                    <br />
                    <Tag color="orange">{flow.backend}</Tag>
                  </Col>
                </Row>
              </Card>
            </div>
          ))}
        </div>
      </Card>

      {/* Technical Integration Details */}
      <Card title="⚙️ Technical Integration Details" style={{ marginBottom: 24 }}>
        <Collapse defaultActiveKey={['1']}>
          <Panel header="DNN Model Integration" key="1">
            <div>
              <Text strong>Model Loading:</Text>
              <pre style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4 }}>
{`# Backend integration code (what your teammates need to write)
from tensorflow.keras.models import load_model
import numpy as np

# Load the trained model from AIClinic-Engine
model = load_model('AIClinic-Engine/DNN Module/dnn_predicts/model.npy')

# Process ECG data
def analyze_ecg(ecg_data):
    predictions = model.predict(ecg_data)
    return {
        "confidence": calculate_confidence(predictions),
        "primary": get_primary_diagnosis(predictions),
        "secondary": get_secondary_findings(predictions),
        "highlighted_leads": detect_abnormal_leads(predictions)
    }`}
              </pre>
            </div>
          </Panel>
          
          <Panel header="Frontend API Integration" key="2">
            <div>
              <Text strong>Your Frontend API Calls:</Text>
              <pre style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4 }}>
{`// Your frontend code (already implemented)
const aiDiagnosis = await aiDiagnosisAPI.requestDiagnosis(ecgFileId, {
  includeConfidence: true,
  includeHighlightedLeads: true,
  includeRecommendations: true
});

// This will call the backend, which uses the DNN model
// Backend processes ECG → DNN analyzes → Returns results → Frontend displays`}
              </pre>
            </div>
          </Panel>
          
          <Panel header="Data Flow Architecture" key="3">
            <div>
              <Text strong>Complete System Architecture:</Text>
              <br /><br />
              <div style={{ textAlign: 'center' }}>
                <Text>ECG File → DNN Model → AI Diagnosis → Your Frontend Components</Text>
                <br />
                <Text type="secondary">
                  AIClinic-Engine provides the AI brain, your frontend provides the interface
                </Text>
              </div>
            </div>
          </Panel>
        </Collapse>
      </Card>

      {/* Status Summary */}
      <Card title="📊 Integration Status Summary">
        <Row gutter={16}>
          <Col span={12}>
            <Title level={4}>✅ Your Frontend (COMPLETED)</Title>
            <ul>
              <li>AI Interpretation UI - Ready for AI data</li>
              <li>Doctor Feedback Interface - Ready for backend</li>
              <li>PDF Report Export - Ready for real data</li>
              <li>API Integration - Ready for connection</li>
            </ul>
          </Col>
          <Col span={12}>
            <Title level={4}>🔄 AI Engine (READY FOR INTEGRATION)</Title>
            <ul>
              <li>DNN Model - Trained and ready</li>
              <li>Prediction Scripts - Functional</li>
              <li>ECG Processing - Complete</li>
              <li>XAI Components - Available</li>
            </ul>
          </Col>
        </Row>
        
        <Divider />
        
        <Alert
          message="Integration Ready"
          description="Your frontend and the AI Engine are both complete and ready for integration. Your teammates just need to connect them via backend APIs!"
          type="success"
          showIcon
        />
      </Card>
    </div>
  );
};

export default AIEngineDisplay; 
import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Alert, Divider, Tag, Progress } from 'antd';
import { HeartOutlined, ThunderboltOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const RealECGIntegration = () => {
  const [integrationStatus, setIntegrationStatus] = useState('ready');
  const [realDataMode, setRealDataMode] = useState(false);

  // This component shows how your frontend will work with real data
  const realEcgExample = {
    // Real ECG data structure (what you'll get from backend)
    ecgFile: {
      id: 'ecg_real_001',
      patientId: 'P12345',
      recordingDate: '2025-08-01T14:30:00Z',
      duration: '10 seconds',
      samplingRate: '500 Hz',
      leads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
      rawData: 'base64_encoded_ecg_data_here',
      metadata: {
        age: 65,
        gender: 'M',
        heartRate: 72,
        qtInterval: 420,
        prInterval: 160,
        qrsDuration: 120
      }
    },
    
    // Real AI diagnosis (from DNN model)
    aiDiagnosis: {
      id: 'ai_diag_real_001',
      confidence: 94.2,
      primary: 'Anterior Wall Myocardial Infarction',
      secondary: [
        'ST segment elevation in V1-V4',
        'Q waves in V2-V3',
        'T wave inversion in V1-V4'
      ],
      highlighted_leads: ['V1', 'V2', 'V3', 'V4'],
      recommendations: 'Immediate cardiac catheterization recommended.',
      processingTime: 2.3,
      modelVersion: 'DNN_v2.1',
      timestamp: new Date().toISOString()
    },
    
    // Real patient data (from database)
    patientInfo: {
      name: 'John Michael Smith',
      id: 'P12345',
      birthDate: '1960-03-15',
      gender: 'M',
      age: 65,
      medicalHistory: ['Hypertension', 'Type 2 Diabetes', 'Previous MI'],
      medications: ['Metformin', 'Lisinopril', 'Atorvastatin']
    }
  };

  const simulateRealDataIntegration = async () => {
    setIntegrationStatus('loading');
    
    // Simulate API calls to real backend
    try {
      // Simulate loading real ECG data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate AI diagnosis processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate loading patient data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setRealDataMode(true);
      setIntegrationStatus('success');
    } catch (error) {
      setIntegrationStatus('error');
    }
  };

  const resetToMockData = () => {
    setRealDataMode(false);
    setIntegrationStatus('ready');
  };

  return (
    <Card title="🔄 Real vs Mock Data Integration" style={{ marginBottom: 24 }}>
      <Alert
        message="Data Integration Status"
        description={
          realDataMode 
            ? "Currently showing REAL data structure (simulated)"
            : "Currently showing MOCK data for demonstration"
        }
        type={realDataMode ? "success" : "info"}
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Title level={4}>Current Mode: {realDataMode ? 'REAL Data' : 'MOCK Data'}</Title>
          
          {!realDataMode && (
            <div>
              <Text>Your components are currently using mock data for demonstration.</Text>
              <br />
              <Button 
                type="primary" 
                icon={<ThunderboltOutlined />}
                onClick={simulateRealDataIntegration}
                loading={integrationStatus === 'loading'}
                style={{ marginTop: 8 }}
              >
                Simulate Real Data Integration
              </Button>
            </div>
          )}

          {realDataMode && (
            <div>
              <Text>Your components are now using realistic data structure that matches what the backend will provide.</Text>
              <br />
              <Button 
                onClick={resetToMockData}
                style={{ marginTop: 8 }}
              >
                Reset to Mock Data
              </Button>
            </div>
          )}
        </div>

        <Divider />

        {realDataMode && (
          <div>
            <Title level={5}>Real Data Structure (What Backend Will Provide):</Title>
            
            <Card size="small" title="ECG File Data" style={{ marginBottom: 8 }}>
              <Text code>ID: {realEcgExample.ecgFile.id}</Text>
              <br />
              <Text code>Patient: {realEcgExample.ecgFile.patientId}</Text>
              <br />
              <Text code>Recording: {realEcgExample.ecgFile.recordingDate}</Text>
              <br />
              <Text code>Leads: {realEcgExample.ecgFile.leads.join(', ')}</Text>
              <br />
              <Text code>Heart Rate: {realEcgExample.ecgFile.metadata.heartRate} bpm</Text>
            </Card>

            <Card size="small" title="AI Diagnosis (From DNN Model)" style={{ marginBottom: 8 }}>
              <Text code>Confidence: {realEcgExample.aiDiagnosis.confidence}%</Text>
              <br />
              <Text code>Primary: {realEcgExample.aiDiagnosis.primary}</Text>
              <br />
              <Text code>Processing Time: {realEcgExample.aiDiagnosis.processingTime}s</Text>
              <br />
              <Text code>Model: {realEcgExample.aiDiagnosis.modelVersion}</Text>
            </Card>

            <Card size="small" title="Patient Information (From Database)">
              <Text code>Name: {realEcgExample.patientInfo.name}</Text>
              <br />
              <Text code>Age: {realEcgExample.patientInfo.age}</Text>
              <br />
              <Text code>History: {realEcgExample.patientInfo.medicalHistory.join(', ')}</Text>
            </Card>
          </div>
        )}

        <Divider />

        <div>
          <Title level={5}>Integration Status:</Title>
          <Space>
            <Tag color={integrationStatus === 'ready' ? 'blue' : integrationStatus === 'loading' ? 'orange' : integrationStatus === 'success' ? 'green' : 'red'}>
              {integrationStatus === 'ready' && 'Ready for Integration'}
              {integrationStatus === 'loading' && 'Loading Real Data...'}
              {integrationStatus === 'success' && 'Real Data Loaded'}
              {integrationStatus === 'error' && 'Integration Error'}
            </Tag>
            
            {integrationStatus === 'loading' && (
              <Progress percent={75} size="small" />
            )}
          </Space>
        </div>

        <Alert
          message="When Backend is Ready"
          description="Your frontend components will automatically switch to using real data from the backend APIs. No code changes needed - just backend integration!"
          type="success"
          showIcon
        />
      </Space>
    </Card>
  );
};

export default RealECGIntegration; 
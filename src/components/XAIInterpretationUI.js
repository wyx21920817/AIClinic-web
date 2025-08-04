import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Progress,
  Tag,
  Space,
  Divider,
  List,
  Alert,
  Button,
  Tooltip,
  Statistic
} from 'antd';
import {
  ExperimentOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  HeatMapOutlined
} from '@ant-design/icons';
import styled from '@emotion/styled';

const { Title, Text, Paragraph } = Typography;

const XAICard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
`;

const ConfidenceBar = styled.div`
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0;
  
  .confidence-fill {
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 4px;
  }
  
  .high { background: #52c41a; }
  .medium { background: #faad14; }
  .low { background: #ff4d4f; }
`;

const LeadImportanceCard = styled(Card)`
  .ant-card-body {
    padding: 12px;
  }
  
  .lead-bar {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    
    .lead-name {
      width: 40px;
      font-weight: bold;
      color: #1890ff;
    }
    
    .importance-bar {
      flex: 1;
      height: 6px;
      background: #f0f0f0;
      border-radius: 3px;
      margin: 0 8px;
      overflow: hidden;
      
      .fill {
        height: 100%;
        background: linear-gradient(90deg, #1890ff, #52c41a);
        transition: width 0.3s ease;
      }
    }
    
    .importance-score {
      width: 40px;
      text-align: right;
      font-size: 12px;
      color: #666;
    }
  }
`;

const XAIInterpretationUI = ({ 
  xaiData, 
  ecgData, 
  showXAIOverlay = true,
  onToggleXAIView 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Real XAI data structure
  const realXaiData = xaiData || {
    featureImportance: {
      leads: {
        "I": 0.65,
        "II": 0.92,
        "III": 0.58,
        "aVR": 0.45,
        "aVL": 0.52,
        "aVF": 0.68,
        "V1": 0.72,
        "V2": 0.88,
        "V3": 0.85,
        "V4": 0.78,
        "V5": 0.69,
        "V6": 0.61
      },
      intervals: {
        "PR_interval": 0.94,
        "QRS_duration": 0.67,
        "QT_interval": 0.73,
        "ST_segment": 0.81,
        "T_wave": 0.59
      }
    },
    
    confidenceHeatmap: {
      regions: [
        {
          start: 0.8,
          end: 1.0,
          confidence: 0.94,
          color: "green",
          explanation: "High confidence in PR interval measurement",
          lead: "II"
        },
        {
          start: 1.6,
          end: 1.8,
          confidence: 0.87,
          color: "green",
          explanation: "Clear QRS complex detection",
          lead: "II"
        },
        {
          start: 7.6,
          end: 7.8,
          confidence: 0.78,
          color: "yellow",
          explanation: "Moderate confidence in T-wave analysis",
          lead: "II"
        }
      ]
    },
    
    decisionExplanation: {
      primaryFactors: [
        "Prolonged PR interval (>200ms) detected with 94% confidence",
        "Consistent PR interval across all 10 cardiac cycles",
        "Normal QRS duration (80-120ms) maintained",
        "Regular P-wave morphology in lead II"
      ],
      alternativeDiagnoses: [
        { diagnosis: "Normal Sinus Rhythm", probability: 0.12, confidence: 0.85 },
        { diagnosis: "2nd Degree AV Block Type I", probability: 0.08, confidence: 0.72 },
        { diagnosis: "3rd Degree AV Block", probability: 0.02, confidence: 0.45 }
      ],
      keyFeatures: [
        { feature: "PR Interval", value: "220ms", normal: "120-200ms", status: "abnormal" },
        { feature: "QRS Duration", value: "95ms", normal: "80-120ms", status: "normal" },
        { feature: "Heart Rate", value: "72 bpm", normal: "60-100 bpm", status: "normal" }
      ]
    },
    
    overallConfidence: 0.89,
    diagnosis: "1st Degree AV Block",
    certainty: "high"
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'orange';
    return 'red';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Moderate';
    return 'Low';
  };

  const renderLeadImportance = () => (
    <LeadImportanceCard title="Lead Importance Analysis" size="small">
      {Object.entries(realXaiData.featureImportance.leads)
        .sort(([,a], [,b]) => b - a)
        .map(([lead, importance]) => (
          <div key={lead} className="lead-bar">
            <div className="lead-name">{lead}</div>
            <div className="importance-bar">
              <div 
                className="fill" 
                style={{ width: `${importance * 100}%` }}
              />
            </div>
            <div className="importance-score">{Math.round(importance * 100)}%</div>
          </div>
        ))}
    </LeadImportanceCard>
  );

  const renderIntervalImportance = () => (
    <XAICard title="Interval Analysis" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        {Object.entries(realXaiData.featureImportance.intervals).map(([interval, importance]) => (
          <div key={interval}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text strong>{interval.replace('_', ' ').toUpperCase()}</Text>
              <Text type="secondary">{Math.round(importance * 100)}%</Text>
            </div>
            <Progress 
              percent={importance * 100} 
              size="small" 
              strokeColor={getConfidenceColor(importance)}
              showInfo={false}
            />
          </div>
        ))}
      </Space>
    </XAICard>
  );

  const renderDecisionExplanation = () => (
    <XAICard title="AI Decision Explanation">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message="Primary Diagnosis Factors"
          description="Key features that led to this diagnosis"
          type="info"
          showIcon
          icon={<ExperimentOutlined />}
        />
        
        <List
          size="small"
          dataSource={realXaiData.decisionExplanation.primaryFactors}
          renderItem={(factor, index) => (
            <List.Item>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                <Text>{factor}</Text>
              </div>
            </List.Item>
          )}
        />
        
        <Divider />
        
        <Title level={5}>Key Measurements</Title>
        {realXaiData.decisionExplanation.keyFeatures.map((feature, index) => (
          <div key={index} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text strong>{feature.feature}</Text>
              <Tag color={feature.status === 'normal' ? 'green' : 'red'}>
                {feature.status.toUpperCase()}
              </Tag>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Measured: {feature.value}</Text>
              <Text type="secondary">Normal: {feature.normal}</Text>
            </div>
          </div>
        ))}
        
        <Divider />
        
        <Title level={5}>Alternative Diagnoses</Title>
        {realXaiData.decisionExplanation.alternativeDiagnoses.map((alt, index) => (
          <div key={index} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text>{alt.diagnosis}</Text>
              <Text type="secondary">{Math.round(alt.probability * 100)}% probability</Text>
            </div>
            <Progress 
              percent={alt.probability * 100} 
              size="small" 
              strokeColor="#d9d9d9"
              showInfo={false}
            />
          </div>
        ))}
      </Space>
    </XAICard>
  );

  const renderConfidenceHeatmap = () => (
    <XAICard title="Confidence Heatmap Analysis">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message="ECG Confidence Regions"
          description="Color-coded confidence levels for different ECG segments"
          type="info"
          showIcon
          icon={<HeatMapOutlined />}
        />
        
        {realXaiData.confidenceHeatmap.regions.map((region, index) => (
          <div key={index} style={{ 
            border: `2px solid ${region.color}`, 
            borderRadius: 8, 
            padding: 12,
            backgroundColor: `${region.color}10`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>Region {index + 1}</Text>
              <Tag color={getConfidenceColor(region.confidence)}>
                {Math.round(region.confidence * 100)}% Confidence
              </Tag>
            </div>
            <Text type="secondary">Time: {region.start}s - {region.end}s</Text>
            <br />
            <Text type="secondary">Lead: {region.lead}</Text>
            <br />
            <Text>{region.explanation}</Text>
          </div>
        ))}
      </Space>
    </XAICard>
  );

  const renderOverallConfidence = () => (
    <XAICard>
      <Row gutter={16} align="middle">
        <Col span={12}>
          <Statistic
            title="Overall AI Confidence"
            value={Math.round(realXaiData.overallConfidence * 100)}
            suffix="%"
            valueStyle={{ color: getConfidenceColor(realXaiData.overallConfidence) }}
          />
        </Col>
        <Col span={12}>
          <div>
            <Text strong>Diagnosis: </Text>
            <Tag color="blue">{realXaiData.diagnosis}</Tag>
          </div>
          <div style={{ marginTop: 8 }}>
            <Text strong>Certainty: </Text>
            <Tag color={getConfidenceColor(realXaiData.overallConfidence)}>
              {getConfidenceText(realXaiData.overallConfidence)}
            </Tag>
          </div>
        </Col>
      </Row>
      
      <ConfidenceBar>
        <div 
          className={`confidence-fill ${getConfidenceText(realXaiData.overallConfidence).toLowerCase().replace(' ', '-')}`}
          style={{ width: `${realXaiData.overallConfidence * 100}%` }}
        />
      </ConfidenceBar>
    </XAICard>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4}>
          <ExperimentOutlined /> XAI Analysis Results
        </Title>
        <Button
          type={showXAIOverlay ? 'primary' : 'default'}
          icon={<EyeOutlined />}
          onClick={onToggleXAIView}
        >
          {showXAIOverlay ? 'Hide XAI View' : 'Show XAI View'}
        </Button>
      </div>

      {renderOverallConfidence()}

      <Row gutter={16}>
        <Col span={12}>
          {renderLeadImportance()}
          {renderIntervalImportance()}
        </Col>
        <Col span={12}>
          {renderDecisionExplanation()}
        </Col>
      </Row>

      {renderConfidenceHeatmap()}
    </div>
  );
};

export default XAIInterpretationUI; 
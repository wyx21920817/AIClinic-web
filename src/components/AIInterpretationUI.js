import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Progress,
  Tag,
  Space,
  Switch,
  Tooltip,
  Alert,
  Divider,
  List,
  Avatar,
  Badge
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  HeartOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const AIInterpretationUI = ({ 
  ecgData, 
  aiDiagnosis, 
  onToggleAIOverlay, 
  showAIOverlay = true,
  onFeedbackSubmit 
}) => {
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [highlightedLeads, setHighlightedLeads] = useState([]);
  const [diagnosisDetails, setDiagnosisDetails] = useState({});

  useEffect(() => {
    if (aiDiagnosis) {
      setConfidenceScore(aiDiagnosis.confidence || 0);
      setHighlightedLeads(aiDiagnosis.highlighted_leads || ['V2', 'V3', 'V4']);
      setDiagnosisDetails(aiDiagnosis.details || {});
    }
  }, [aiDiagnosis]);

  const getConfidenceColor = (score) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const getConfidenceStatus = (score) => {
    if (score >= 80) return 'High Confidence';
    if (score >= 60) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const renderLeadHighlight = (lead) => {
    const isHighlighted = highlightedLeads.includes(lead);
    return (
      <Tag
        key={lead}
        color={isHighlighted ? 'red' : 'default'}
        icon={isHighlighted ? <ExclamationCircleOutlined /> : null}
        style={{
          fontSize: '14px',
          padding: '4px 8px',
          margin: '2px',
          border: isHighlighted ? '2px solid #ff4d4f' : '1px solid #d9d9d9'
        }}
      >
        {lead}
      </Tag>
    );
  };

  const renderDiagnosisCard = () => (
    <Card
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#1890ff' }} />
          <span>AI Diagnosis</span>
          <Badge 
            count={getConfidenceStatus(confidenceScore)} 
            style={{ 
              backgroundColor: getConfidenceColor(confidenceScore),
              fontSize: '10px'
            }} 
          />
        </Space>
      }
      extra={
        <Tooltip title="Toggle AI Overlay">
          <Switch
            checked={showAIOverlay}
            onChange={onToggleAIOverlay}
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
          />
        </Tooltip>
      }
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Confidence Score */}
        <div>
          <Text strong>Confidence Score:</Text>
          <Progress
            percent={confidenceScore}
            strokeColor={getConfidenceColor(confidenceScore)}
            format={(percent) => `${percent}%`}
            style={{ marginTop: 8 }}
          />
        </div>

        {/* Primary Diagnosis */}
        {diagnosisDetails.primary && (
          <Alert
            message="Primary Diagnosis"
            description={diagnosisDetails.primary}
            type="info"
            showIcon
            icon={<HeartOutlined />}
          />
        )}

        {/* Secondary Findings */}
        {diagnosisDetails.secondary && diagnosisDetails.secondary.length > 0 && (
          <div>
            <Text strong>Secondary Findings:</Text>
            <List
              size="small"
              dataSource={diagnosisDetails.secondary}
              renderItem={(item, index) => (
                <List.Item>
                  <Space>
                    <Avatar size="small" style={{ backgroundColor: '#87d068' }}>
                      {index + 1}
                    </Avatar>
                    <Text>{item}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Highlighted Leads */}
        <div>
          <Text strong>Key Leads:</Text>
          <div style={{ marginTop: 8 }}>
            {['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'].map(renderLeadHighlight)}
          </div>
        </div>

        {/* Recommendations */}
        {diagnosisDetails.recommendations && (
          <div>
            <Text strong>AI Recommendations:</Text>
            <Paragraph style={{ marginTop: 8, color: '#666' }}>
              {diagnosisDetails.recommendations}
            </Paragraph>
          </div>
        )}
      </Space>
    </Card>
  );

  const renderModularComponents = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* Confidence Indicator Component */}
      <Card size="small" title="Confidence Indicator">
        <Space align="center">
          <Progress
            type="circle"
            percent={confidenceScore}
            strokeColor={getConfidenceColor(confidenceScore)}
            format={(percent) => `${percent}%`}
            width={60}
          />
          <div>
            <Text strong>{getConfidenceStatus(confidenceScore)}</Text>
            <br />
            <Text type="secondary">AI Model Confidence</Text>
          </div>
        </Space>
      </Card>

      {/* Lead Analysis Component */}
      <Card size="small" title="Lead Analysis">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {highlightedLeads.map(lead => (
            <Tag
              key={lead}
              color="red"
              icon={<ExclamationCircleOutlined />}
              style={{ margin: 2 }}
            >
              {lead} - Abnormal
            </Tag>
          ))}
        </div>
      </Card>
    </Space>
  );

  return (
    <div style={{ padding: 16 }}>
      {renderDiagnosisCard()}
      
      <Divider />
      
      {/* Modular Components for Scalability */}
      <Title level={5}>Detailed Analysis</Title>
      {renderModularComponents()}
    </div>
  );
};

export default AIInterpretationUI; 
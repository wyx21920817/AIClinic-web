import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Progress,
  Button,
  Space,
  Divider,
  Alert,
  Statistic,
  Badge,
  Timeline,
  Descriptions,
  Collapse,
  Avatar,
  Tooltip,
  message
} from 'antd';
import {
  HeartOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const AIECGResultsDemo = () => {
  const [selectedDisease, setSelectedDisease] = useState('LBBB');
  const [showXAI, setShowXAI] = useState(false);

  // Complete disease configuration based on Professor Sonny's recommendations
  const diseaseConfig = {
    "NORM": { 
      name: "Normal Sinus Rhythm", 
      color: "#52c41a", 
      icon: "💚", 
      risk: "low",
      description: "Normal cardiac rhythm with regular intervals"
    },
    "1dAVB": { 
      name: "First-degree AV Block", 
      color: "#faad14", 
      icon: "🟡", 
      risk: "medium",
      description: "Prolonged PR interval (>0.20s)"
    },
    "2dAVB": { 
      name: "Second-degree AV Block", 
      color: "#ff7a45", 
      icon: "🟠", 
      risk: "high",
      description: "Intermittent failure of AV conduction"
    },
    "3dAVB": { 
      name: "Third-degree AV Block", 
      color: "#ff4d4f", 
      icon: "🔴", 
      risk: "critical",
      description: "Complete AV dissociation"
    },
    "AF": { 
      name: "Atrial Fibrillation", 
      color: "#ff7a45", 
      icon: "🟠", 
      risk: "high",
      description: "Irregular atrial rhythm"
    },
    "AFIB": { 
      name: "Atrial Fibrillation", 
      color: "#ff7a45", 
      icon: "🟠", 
      risk: "high",
      description: "Irregular atrial rhythm"
    },
    "AFLT": { 
      name: "Atrial Flutter", 
      color: "#ff7a45", 
      icon: "🟠", 
      risk: "high",
      description: "Regular atrial tachycardia"
    },
    "LBBB": { 
      name: "Left Bundle Branch Block", 
      color: "#ff4d4f", 
      icon: "🔴", 
      risk: "high",
      description: "Delayed left ventricular activation"
    },
    "RBBB": { 
      name: "Right Bundle Branch Block", 
      color: "#ff7a45", 
      icon: "🟠", 
      risk: "medium",
      description: "Delayed right ventricular activation"
    },
    "STACH": { 
      name: "Sinus Tachycardia", 
      color: "#faad14", 
      icon: "🟡", 
      risk: "medium",
      description: "Fast sinus rhythm (>100 bpm)"
    },
    "PAC": { 
      name: "Premature Atrial Complex", 
      color: "#faad14", 
      icon: "🟡", 
      risk: "low",
      description: "Early atrial beat"
    },
    "PVC": { 
      name: "Premature Ventricular Complex", 
      color: "#ff7a45", 
      icon: "🟠", 
      risk: "medium",
      description: "Early ventricular beat"
    },
    "ST": { 
      name: "ST Segment Changes", 
      color: "#ff4d4f", 
      icon: "🔴", 
      risk: "high",
      description: "ST segment elevation or depression"
    }
  };

  // Mock AI diagnosis results for demonstration
  const mockResults = {
    "LBBB": {
      instanceId: "111111111111111111111",
      patientName: "John Smith",
      studyDate: "2024-01-15",
      diagnoses: [
        {
          title: "Left Bundle Branch Block (15592_hr)",
          lead_name: "II",
          report_text: "QRS duration is considered prolonged if > 0.12 seconds (typically). Refined Estimation: Mean=0.134s, Min=0.112s, Max=0.140s. 11 out of 12 QRS durations (Refined Estimation > 0.12s).",
          metrics: {
            qrs_mean_s: 0.134,
            wide_qrs_count: 11,
            total_qrs_count: 12,
            confidence_score: 0.94,
            processing_time_seconds: 1.43
          },
          image_paths: ["/static/ecg_analysis_results/15592_hr_LBBB/lbbb_qrs_analysis.png"],
          disease: "LBBB",
          confidence: 94,
          risk_level: "high"
        }
      ],
      summary: {
        total_diagnoses: 1,
        primary_diagnosis: "LBBB",
        overall_confidence: 94,
        processing_time: 1.43,
        risk_assessment: "high"
      }
    },
    "AF": {
      instanceId: "222222222222222222222",
      patientName: "Mary Johnson",
      studyDate: "2024-01-16",
      diagnoses: [
        {
          title: "Atrial Fibrillation (00001_lr.dcm)",
          lead_name: "II",
          report_text: "P-waves typically absent/fibrillatory. Yellow boxes: Inferred P-wave regions. RR histogram shows 'irregularly irregular' rhythm.",
          metrics: {
            rr_variability: 0.45,
            p_wave_absence: 0.92,
            irregular_rhythm: 0.88,
            confidence_score: 0.87,
            processing_time_seconds: 2.1
          },
          image_paths: ["/static/ecg_analysis_results/00001_lr_AF/af_rhythm_analysis.png"],
          disease: "AF",
          confidence: 87,
          risk_level: "high"
        }
      ],
      summary: {
        total_diagnoses: 1,
        primary_diagnosis: "AF",
        overall_confidence: 87,
        processing_time: 2.1,
        risk_assessment: "high"
      }
    },
    "NORM": {
      instanceId: "333333333333333333333",
      patientName: "David Wilson",
      studyDate: "2024-01-17",
      diagnoses: [
        {
          title: "Normal Sinus Rhythm (03041_hr)",
          lead_name: "II",
          report_text: "Regular P-waves present. Normal QRS duration. Consistent RR intervals. No significant abnormalities detected.",
          metrics: {
            qrs_mean_s: 0.085,
            rr_regularity: 0.95,
            p_wave_presence: 0.98,
            confidence_score: 0.96,
            processing_time_seconds: 0.8
          },
          image_paths: ["/static/ecg_analysis_results/03041_hr_NR/normal_rhythm_analysis.png"],
          disease: "NORM",
          confidence: 96,
          risk_level: "low"
        }
      ],
      summary: {
        total_diagnoses: 1,
        primary_diagnosis: "NORM",
        overall_confidence: 96,
        processing_time: 0.8,
        risk_assessment: "low"
      }
    }
  };

  const getRiskColor = (risk) => {
    const colors = {
      "low": "#52c41a",
      "medium": "#faad14",
      "high": "#ff7a45",
      "critical": "#ff4d4f"
    };
    return colors[risk] || "#8c8c8c";
  };

  const getRiskIcon = (risk) => {
    const icons = {
      "low": <CheckCircleOutlined />,
      "medium": <WarningOutlined />,
      "high": <WarningOutlined />,
      "critical": <ThunderboltOutlined />
    };
    return icons[risk] || <ClockCircleOutlined />;
  };

  const currentResult = mockResults[selectedDisease];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <MedicineBoxOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              ECG AI Results Display Structure
            </Title>
            <Text type="secondary">
              Complete demonstration of how ECG AI diagnosis results should be displayed
            </Text>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<ExperimentOutlined />}
                onClick={() => setShowXAI(!showXAI)}
              >
                {showXAI ? 'Hide' : 'Show'} XAI Demo
              </Button>
              <Button icon={<DownloadOutlined />}>
                Export Results
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Disease Selection */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Select Disease Type to View Results Structure:</Title>
        <Space wrap>
          {Object.entries(diseaseConfig).map(([key, config]) => (
            <Button
              key={key}
              type={selectedDisease === key ? 'primary' : 'default'}
              icon={<span>{config.icon}</span>}
              onClick={() => setSelectedDisease(key)}
              style={{
                borderColor: config.color,
                color: selectedDisease === key ? 'white' : config.color
              }}
            >
              {config.name}
            </Button>
          ))}
        </Space>
      </Card>

      {/* Main Results Display */}
      <Row gutter={[24, 24]}>
        {/* Left Column - Analysis Summary */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <HeartOutlined style={{ color: '#ff4d4f' }} />
                Analysis Summary
              </Space>
            }
            style={{ height: 'fit-content' }}
          >
            {/* Patient Info */}
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Patient Name">
                {currentResult.patientName}
              </Descriptions.Item>
              <Descriptions.Item label="Study Date">
                {currentResult.studyDate}
              </Descriptions.Item>
              <Descriptions.Item label="Instance ID">
                <Text code>{currentResult.instanceId.slice(-8)}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* Primary Diagnosis */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '48px', marginBottom: 8 }}>
                {diseaseConfig[currentResult.summary.primary_diagnosis].icon}
              </div>
              <Title level={3} style={{ margin: 0 }}>
                {diseaseConfig[currentResult.summary.primary_diagnosis].name}
              </Title>
              <Text type="secondary">
                {diseaseConfig[currentResult.summary.primary_diagnosis].description}
              </Text>
            </div>

            {/* Overall Confidence */}
            <div style={{ marginBottom: 16 }}>
              <Text strong>Overall Confidence:</Text>
              <Progress
                percent={currentResult.summary.overall_confidence}
                status={currentResult.summary.overall_confidence > 90 ? 'success' : 'active'}
                strokeColor={getRiskColor(currentResult.summary.risk_assessment)}
              />
            </div>

            {/* Risk Assessment */}
            <Alert
              message={
                <Space>
                  {getRiskIcon(currentResult.summary.risk_assessment)}
                  <span>Risk Assessment: {currentResult.summary.risk_assessment.toUpperCase()}</span>
                </Space>
              }
              type={currentResult.summary.risk_assessment === 'critical' ? 'error' : 
                    currentResult.summary.risk_assessment === 'high' ? 'warning' : 'info'}
              style={{ marginBottom: 16 }}
            />

            {/* Processing Stats */}
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Processing Time"
                  value={currentResult.summary.processing_time}
                  suffix="s"
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Diagnoses Found"
                  value={currentResult.summary.total_diagnoses}
                  prefix={<FileTextOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Right Column - Detailed Analysis */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                Detailed Analysis Results
              </Space>
            }
          >
            {currentResult.diagnoses.map((diagnosis, index) => (
              <Card
                key={index}
                type="inner"
                style={{ marginBottom: 16 }}
                title={
                  <Space>
                    <span>{diseaseConfig[diagnosis.disease].icon}</span>
                    <span>{diagnosis.title}</span>
                    <Badge 
                      count={diagnosis.confidence} 
                      style={{ backgroundColor: getRiskColor(diagnosis.risk_level) }}
                      suffix="%"
                    />
                  </Space>
                }
                extra={
                  <Space>
                    <Tag color={getRiskColor(diagnosis.risk_level)}>
                      {diagnosis.risk_level.toUpperCase()} RISK
                    </Tag>
                    <Button size="small" icon={<EyeOutlined />}>
                      View Waveform
                    </Button>
                  </Space>
                }
              >
                {/* Clinical Report */}
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Clinical Report:</Text>
                  <Paragraph style={{ marginTop: 8 }}>
                    {diagnosis.report_text}
                  </Paragraph>
                </div>

                {/* Key Metrics */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  {Object.entries(diagnosis.metrics).map(([key, value]) => (
                    <Col span={8} key={key}>
                      <Statistic
                        title={key.replace(/_/g, ' ').toUpperCase()}
                        value={typeof value === 'number' ? value.toFixed(3) : value}
                        precision={typeof value === 'number' && value < 1 ? 3 : 0}
                        size="small"
                      />
                    </Col>
                  ))}
                </Row>

                {/* Action Buttons */}
                <Space>
                  <Button 
                    type="primary" 
                    icon={<ExperimentOutlined />}
                    onClick={() => message.info('XAI Analysis would open here')}
                  >
                    View XAI Analysis
                  </Button>
                  <Button icon={<DownloadOutlined />}>
                    Download Report
                  </Button>
                  <Button icon={<EyeOutlined />}>
                    View Images
                  </Button>
                </Space>
              </Card>
            ))}
          </Card>
        </Col>
      </Row>

      {/* XAI Demo Section */}
      {showXAI && (
        <Card 
          title={
            <Space>
              <ExperimentOutlined style={{ color: '#722ed1' }} />
              XAI (Explainable AI) Interpretation Demo
            </Space>
          }
          style={{ marginTop: 24 }}
        >
          <Alert
            message="XAI provides detailed explanations of AI decisions"
            description="This section would show detailed visualizations, feature importance, and clinical reasoning behind the AI diagnosis."
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card size="small" title="Feature Importance">
                <Timeline>
                  <Timeline.Item color="red">QRS Duration (0.134s)</Timeline.Item>
                  <Timeline.Item color="orange">RR Variability (0.45)</Timeline.Item>
                  <Timeline.Item color="blue">P-wave Analysis</Timeline.Item>
                </Timeline>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="Clinical Reasoning">
                <Paragraph>
                  The AI detected prolonged QRS duration (>0.12s) in 11 out of 12 beats, 
                  indicating delayed ventricular activation consistent with bundle branch block.
                </Paragraph>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="Confidence Factors">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Signal Quality">Excellent</Descriptions.Item>
                  <Descriptions.Item label="Lead Coverage">Complete</Descriptions.Item>
                  <Descriptions.Item label="Noise Level">Low</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* Footer Info */}
      <Card style={{ marginTop: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Text type="secondary">
              AI Analysis powered by AIClinic Engine | Based on Professor Sonny's recommendations
            </Text>
          </Col>
          <Col>
            <Space>
              <Avatar icon={<UserOutlined />} />
              <Text>Analyzed by AI System</Text>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default AIECGResultsDemo;

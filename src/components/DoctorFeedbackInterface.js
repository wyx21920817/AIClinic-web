import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Space,
  Typography,
  message,
  Modal,
  Form,
  Rate,
  Tag,
  Divider,
  Alert,
  Tooltip,
  Row,
  Col,
  Radio
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CommentOutlined,
  EyeOutlined,
  SendOutlined,
  SaveOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

const DoctorFeedbackInterface = ({
  aiDiagnosis,
  onFeedbackSubmit,
  onToggleAIView,
  onRequestReanalysis,
  showAIView = true,
  patientId,
  ecgFileId,
  doctorId
}) => {
  const [form] = Form.useForm();
  const [feedback, setFeedback] = useState({
    approved: null,
    comment: '',
    confidence: 0,
    corrections: [],
    timestamp: null,
    action: null // 'approve', 'correct', 'reanalyze'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [reanalysisReason, setReanalysisReason] = useState('');

  const handleApprove = () => {
    setPendingAction('approve');
    setShowConfirmModal(true);
  };

  const handleCorrect = () => {
    setPendingAction('correct');
    setShowConfirmModal(true);
  };

  const handleRequestReanalysis = () => {
    setPendingAction('reanalyze');
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    setIsSubmitting(true);
    try {
      const feedbackData = {
        ...feedback,
        approved: pendingAction === 'approve',
        action: pendingAction,
        timestamp: new Date().toISOString(),
        patientId,
        ecgFileId,
        doctorId,
        aiDiagnosisId: aiDiagnosis?.id,
        reanalysisReason: pendingAction === 'reanalyze' ? reanalysisReason : null
      };

      if (pendingAction === 'reanalyze') {
        // Handle re-analysis request
        await onRequestReanalysis(feedbackData);
        message.success('Re-analysis request submitted successfully!');
      } else {
        // Handle normal feedback submission
        await onFeedbackSubmit(feedbackData);
        message.success(
          pendingAction === 'approve' 
            ? 'AI diagnosis approved successfully!' 
            : 'Correction submitted successfully!'
        );
      }
      
      setFeedback(prev => ({
        ...prev,
        approved: pendingAction === 'approve',
        action: pendingAction,
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      message.error('Failed to submit feedback. Please try again.');
      console.error('Feedback submission error:', error);
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setPendingAction(null);
      setReanalysisReason('');
    }
  };

  const handleCommentChange = (e) => {
    setFeedback(prev => ({
      ...prev,
      comment: e.target.value
    }));
  };

  const handleConfidenceChange = (value) => {
    setFeedback(prev => ({
      ...prev,
      confidence: value
    }));
  };

  const renderFeedbackButtons = () => (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={8}>
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          size="large"
          block
          onClick={handleApprove}
          loading={isSubmitting && pendingAction === 'approve'}
          style={{
            backgroundColor: '#52c41a',
            borderColor: '#52c41a',
            height: '48px'
          }}
        >
          ✅ Approve
        </Button>
      </Col>
      <Col span={8}>
        <Button
          danger
          icon={<CloseCircleOutlined />}
          size="large"
          block
          onClick={handleCorrect}
          loading={isSubmitting && pendingAction === 'correct'}
          style={{ height: '48px' }}
        >
          ❌ Correct
        </Button>
      </Col>
      <Col span={8}>
        <Button
          type="default"
          icon={<ReloadOutlined />}
          size="large"
          block
          onClick={handleRequestReanalysis}
          loading={isSubmitting && pendingAction === 'reanalyze'}
          style={{
            backgroundColor: '#faad14',
            borderColor: '#faad14',
            color: 'white',
            height: '48px'
          }}
        >
          🔄 Re-analyze
        </Button>
      </Col>
    </Row>
  );

  const renderCommentSection = () => (
    <Card title="🧠 Doctor Comments" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical">
        <Form.Item
          name="comment"
          label="Clinical Notes"
          rules={[
            {
              required: feedback.action === 'correct' || feedback.action === 'reanalyze',
              message: 'Please provide comments when correcting or requesting re-analysis'
            }
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Enter your clinical observations, corrections, or additional notes..."
            value={feedback.comment}
            onChange={handleCommentChange}
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item
          name="confidence"
          label="Your Confidence Level"
        >
          <Rate
            value={feedback.confidence}
            onChange={handleConfidenceChange}
            count={5}
            tooltips={['Very Low', 'Low', 'Medium', 'High', 'Very High']}
          />
          <Text type="secondary" style={{ marginLeft: 8 }}>
            {feedback.confidence > 0 ? `${feedback.confidence}/5` : 'Rate your confidence'}
          </Text>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderReanalysisSection = () => (
    <Card title="🔄 Re-analysis Request" style={{ marginBottom: 16 }}>
      <Alert
        message="Request New AI Analysis"
        description="If you're not satisfied with the current AI diagnosis, you can request a new analysis with your feedback."
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        style={{ marginBottom: 16 }}
      />
      
      <Form.Item
        label="Reason for Re-analysis"
        required
      >
        <Radio.Group 
          value={reanalysisReason} 
          onChange={(e) => setReanalysisReason(e.target.value)}
        >
          <Space direction="vertical">
            <Radio value="low_confidence">Low confidence in current diagnosis</Radio>
            <Radio value="missing_findings">Important findings not detected</Radio>
            <Radio value="incorrect_interpretation">Incorrect interpretation of ECG</Radio>
            <Radio value="additional_context">Additional clinical context needed</Radio>
            <Radio value="other">Other (specify in comments)</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>
      
      <Text type="secondary">
        Your feedback will be used to improve the AI analysis for this ECG.
      </Text>
    </Card>
  );

  const renderAIViewToggle = () => (
    <Card title="👁️ View Controls" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>AI Overlay:</Text>
          <Button
            type={showAIView ? 'primary' : 'default'}
            icon={showAIView ? <EyeOutlined /> : <EyeOutlined />}
            onClick={onToggleAIView}
            style={{ marginLeft: 8 }}
          >
            {showAIView ? 'Hide AI View' : 'Show AI View'}
          </Button>
        </div>
        
        {aiDiagnosis && (
          <Alert
            message="AI Diagnosis Available"
            description={`Confidence: ${aiDiagnosis.confidence || 0}% | Primary: ${aiDiagnosis.primary || 'N/A'}`}
            type="info"
            showIcon
            icon={<ExclamationCircleOutlined />}
          />
        )}
      </Space>
    </Card>
  );

  const renderFeedbackStatus = () => {
    if (feedback.timestamp) {
      return (
        <Alert
          message={
            <Space>
              {feedback.action === 'approve' ? (
                <>
                  <CheckOutlined style={{ color: '#52c41a' }} />
                  <Text strong>AI Diagnosis Approved</Text>
                </>
              ) : feedback.action === 'correct' ? (
                <>
                  <CloseOutlined style={{ color: '#ff4d4f' }} />
                  <Text strong>Correction Submitted</Text>
                </>
              ) : feedback.action === 'reanalyze' ? (
                <>
                  <ReloadOutlined style={{ color: '#faad14' }} />
                  <Text strong>Re-analysis Requested</Text>
                </>
              ) : null}
            </Space>
          }
          description={`Submitted on ${new Date(feedback.timestamp).toLocaleString()}`}
          type={feedback.action === 'approve' ? 'success' : feedback.action === 'reanalyze' ? 'warning' : 'error'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    }
    return null;
  };

  const renderSubmissionModal = () => {
    const getModalContent = () => {
      switch (pendingAction) {
        case 'approve':
          return {
            title: 'Confirm Approval',
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            message: 'Are you sure you want to approve this AI diagnosis? This action will be recorded in the audit log.',
            okText: 'Approve'
          };
        case 'correct':
          return {
            title: 'Confirm Correction',
            icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
            message: 'Are you sure you want to submit a correction? Please ensure you have provided detailed comments.',
            okText: 'Submit Correction'
          };
        case 'reanalyze':
          return {
            title: 'Confirm Re-analysis Request',
            icon: <ReloadOutlined style={{ color: '#faad14' }} />,
            message: 'Are you sure you want to request a new AI analysis? This will send the ECG back for re-analysis with your feedback.',
            okText: 'Request Re-analysis'
          };
        default:
          return {};
      }
    };

    const modalContent = getModalContent();

    return (
      <Modal
        title={
          <Space>
            {modalContent.icon}
            <span>{modalContent.title}</span>
          </Space>
        }
        open={showConfirmModal}
        onOk={handleConfirmAction}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingAction(null);
          setReanalysisReason('');
        }}
        confirmLoading={isSubmitting}
        okText={modalContent.okText}
        cancelText="Cancel"
      >
        <div style={{ padding: '16px 0' }}>
          <Text>{modalContent.message}</Text>
          
          {pendingAction === 'correct' && !feedback.comment.trim() && (
            <Alert
              message="Comment Required"
              description="Please provide comments when correcting AI diagnosis"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
          
          {pendingAction === 'reanalyze' && !reanalysisReason && (
            <Alert
              message="Reason Required"
              description="Please select a reason for requesting re-analysis"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <Title level={4}>Doctor Feedback Interface</Title>
      
      {renderFeedbackStatus()}
      
      {renderAIViewToggle()}
      
      {renderFeedbackButtons()}
      
      {renderCommentSection()}
      
      {pendingAction === 'reanalyze' && renderReanalysisSection()}
      
      {/* Visual Indicators */}
      <Card title="📊 Feedback Summary" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Status: </Text>
            <Tag color={
              feedback.action === null ? 'default' : 
              feedback.action === 'approve' ? 'success' : 
              feedback.action === 'reanalyze' ? 'warning' : 'error'
            }>
              {feedback.action === null ? 'Pending' : 
               feedback.action === 'approve' ? 'Approved' : 
               feedback.action === 'reanalyze' ? 'Re-analysis Requested' : 'Corrected'}
            </Tag>
          </div>
          
          {feedback.confidence > 0 && (
            <div>
              <Text strong>Your Confidence: </Text>
              <Rate disabled value={feedback.confidence} count={5} />
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({feedback.confidence}/5)
              </Text>
            </div>
          )}
          
          {feedback.comment && (
            <div>
              <Text strong>Comments: </Text>
              <Text type="secondary">{feedback.comment}</Text>
            </div>
          )}
          
          {feedback.action === 'reanalyze' && reanalysisReason && (
            <div>
              <Text strong>Re-analysis Reason: </Text>
              <Text type="secondary">{reanalysisReason}</Text>
            </div>
          )}
        </Space>
      </Card>
      
      {renderSubmissionModal()}
    </div>
  );
};

export default DoctorFeedbackInterface; 
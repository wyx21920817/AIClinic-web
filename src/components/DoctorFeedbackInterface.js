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
  Col
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
  CloseOutlined
} from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

const DoctorFeedbackInterface = ({
  aiDiagnosis,
  onFeedbackSubmit,
  onToggleAIView,
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
    timestamp: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const handleApprove = () => {
    setPendingAction('approve');
    setShowConfirmModal(true);
  };

  const handleCorrect = () => {
    setPendingAction('correct');
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    setIsSubmitting(true);
    try {
      const feedbackData = {
        ...feedback,
        approved: pendingAction === 'approve',
        timestamp: new Date().toISOString(),
        patientId,
        ecgFileId,
        doctorId,
        aiDiagnosisId: aiDiagnosis?.id
      };

      // Submit feedback to backend
      await onFeedbackSubmit(feedbackData);
      
      message.success(
        pendingAction === 'approve' 
          ? 'AI diagnosis approved successfully!' 
          : 'Correction submitted successfully!'
      );
      
      setFeedback(prev => ({
        ...prev,
        approved: pendingAction === 'approve',
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      message.error('Failed to submit feedback. Please try again.');
      console.error('Feedback submission error:', error);
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setPendingAction(null);
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
      <Col span={12}>
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
          ✅ Approve AI Diagnosis
        </Button>
      </Col>
      <Col span={12}>
        <Button
          danger
          icon={<CloseCircleOutlined />}
          size="large"
          block
          onClick={handleCorrect}
          loading={isSubmitting && pendingAction === 'correct'}
          style={{ height: '48px' }}
        >
          ❌ Correct AI Diagnosis
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
              required: feedback.approved === false,
              message: 'Please provide comments when correcting AI diagnosis'
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
              {feedback.approved ? (
                <>
                  <CheckOutlined style={{ color: '#52c41a' }} />
                  <Text strong>AI Diagnosis Approved</Text>
                </>
              ) : (
                <>
                  <CloseOutlined style={{ color: '#ff4d4f' }} />
                  <Text strong>Correction Submitted</Text>
                </>
              )}
            </Space>
          }
          description={`Submitted on ${new Date(feedback.timestamp).toLocaleString()}`}
          type={feedback.approved ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    }
    return null;
  };

  const renderSubmissionModal = () => (
    <Modal
      title={
        <Space>
          {pendingAction === 'approve' ? (
            <>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>Confirm Approval</span>
            </>
          ) : (
            <>
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              <span>Confirm Correction</span>
            </>
          )}
        </Space>
      }
      open={showConfirmModal}
      onOk={handleConfirmAction}
      onCancel={() => {
        setShowConfirmModal(false);
        setPendingAction(null);
      }}
      confirmLoading={isSubmitting}
      okText={pendingAction === 'approve' ? 'Approve' : 'Submit Correction'}
      cancelText="Cancel"
    >
      <div style={{ padding: '16px 0' }}>
        <Text>
          {pendingAction === 'approve' 
            ? 'Are you sure you want to approve this AI diagnosis? This action will be recorded in the audit log.'
            : 'Are you sure you want to submit a correction? Please ensure you have provided detailed comments.'
          }
        </Text>
        
        {pendingAction === 'correct' && !feedback.comment.trim() && (
          <Alert
            message="Comment Required"
            description="Please provide comments when correcting AI diagnosis"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </Modal>
  );

  return (
    <div style={{ padding: 16 }}>
      <Title level={4}>Doctor Feedback Interface</Title>
      
      {renderFeedbackStatus()}
      
      {renderAIViewToggle()}
      
      {renderFeedbackButtons()}
      
      {renderCommentSection()}
      
      {/* Visual Indicators */}
      <Card title="📊 Feedback Summary" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Status: </Text>
            <Tag color={feedback.approved === null ? 'default' : feedback.approved ? 'success' : 'error'}>
              {feedback.approved === null ? 'Pending' : feedback.approved ? 'Approved' : 'Corrected'}
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
        </Space>
      </Card>
      
      {renderSubmissionModal()}
    </div>
  );
};

export default DoctorFeedbackInterface; 
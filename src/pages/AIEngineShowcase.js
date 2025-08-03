import React from 'react';
import { Typography, Card, Space, Button } from 'antd';
import AIEngineDisplay from '../components/AIEngineDisplay';

const { Title, Text } = Typography;

const AIEngineShowcase = () => {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={1}>🧠 AIClinic-Engine Showcase</Title>
      <Text type="secondary">
        This page displays what your teammates have built in the AIClinic-Engine and how it integrates with your frontend deliverables.
      </Text>

      <Space direction="vertical" style={{ width: '100%', marginTop: 24 }}>
        <Card>
          <Title level={3}>🎯 What This Shows:</Title>
          <ul>
            <li><strong>AI Engine Contents:</strong> DNN Module, XAI Module, trained models</li>
            <li><strong>Integration Flow:</strong> How AI Engine connects to your frontend</li>
            <li><strong>Technical Details:</strong> Code examples and architecture</li>
            <li><strong>Status Summary:</strong> What's ready for integration</li>
          </ul>
        </Card>

        <AIEngineDisplay />

        <Card title="🚀 How to Use This Information">
          <Title level={4}>For Your Teammates:</Title>
          <ul>
            <li>Use this as a reference for what needs to be integrated</li>
            <li>Follow the technical integration details</li>
            <li>Implement the backend APIs shown in the code examples</li>
            <li>Test the integration flow step by step</li>
          </ul>

          <Title level={4}>For Your Demo:</Title>
          <ul>
            <li>Show this page to demonstrate the complete system architecture</li>
            <li>Explain how your frontend connects to the AI Engine</li>
            <li>Highlight the professional integration workflow</li>
            <li>Show the technical sophistication of the project</li>
          </ul>
        </Card>
      </Space>
    </div>
  );
};

export default AIEngineShowcase; 
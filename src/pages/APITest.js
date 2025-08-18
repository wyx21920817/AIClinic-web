import React, { useState } from 'react';
import { Card, Button, Space, Alert, Typography, Spin, Divider } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../services/api/config';

const { Title, Text } = Typography;

const APITest = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const endpoints = [
    { name: 'Health Check', endpoint: '/health', method: 'GET' },
    { name: 'Get Users', endpoint: '/api/users?page_size=5', method: 'GET' },
    { name: 'Get Patients', endpoint: '/api/patients?page_size=5', method: 'GET' },
    { name: 'Get Audit Logs', endpoint: '/api/audit/logs?page_size=5', method: 'GET' }
  ];

  const testAPI = async (endpoint) => {
    setLoading(prev => ({ ...prev, [endpoint.name]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      console.log(`🔍 Testing ${endpoint.name}:`, `${API_BASE_URL}${endpoint.endpoint}`);
      console.log('🔑 Token available:', !!token);

      const response = await fetch(`${API_BASE_URL}${endpoint.endpoint}`, {
        method: endpoint.method,
        headers
      });

      const data = await response.json();
      
      setResults(prev => ({
        ...prev,
        [endpoint.name]: {
          success: response.ok,
          status: response.status,
          data: data,
          error: null
        }
      }));

      console.log(`✅ ${endpoint.name} result:`, data);

    } catch (error) {
      console.error(`❌ ${endpoint.name} error:`, error);
      setResults(prev => ({
        ...prev,
        [endpoint.name]: {
          success: false,
          status: 'ERROR',
          data: null,
          error: error.message
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [endpoint.name]: false }));
    }
  };

  const testAllAPIs = () => {
    endpoints.forEach(endpoint => testAPI(endpoint));
  };

  const getStatusIcon = (endpointName) => {
    if (loading[endpointName]) {
      return <LoadingOutlined style={{ color: '#1890ff' }} />;
    }
    
    const result = results[endpointName];
    if (!result) {
      return <CloseCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
    
    return result.success ? 
      <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  };

  const getStatusText = (endpointName) => {
    if (loading[endpointName]) return 'Testing...';
    
    const result = results[endpointName];
    if (!result) return 'Not tested';
    
    return result.success ? 'Success' : 'Failed';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>API Connection Test</Title>
      <Text type="secondary">
        Test your connection to the backend server at: <code>{API_BASE_URL}</code>
      </Text>

      <Divider />

      <Space direction="vertical" style={{ width: '100%' }}>
        <Button type="primary" onClick={testAllAPIs} size="large">
          Test All APIs
        </Button>

        {endpoints.map(endpoint => (
          <Card key={endpoint.name} size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>{endpoint.name}</Text>
                <br />
                <Text type="secondary" code>{endpoint.method} {endpoint.endpoint}</Text>
              </div>
              
              <Space>
                <div style={{ textAlign: 'center' }}>
                  {getStatusIcon(endpoint.name)}
                  <br />
                  <Text size="small">{getStatusText(endpoint.name)}</Text>
                </div>
                
                <Button 
                  size="small" 
                  onClick={() => testAPI(endpoint)}
                  loading={loading[endpoint.name]}
                >
                  Test
                </Button>
              </Space>
            </div>

            {results[endpoint.name] && (
              <div style={{ marginTop: 16 }}>
                {results[endpoint.name].success ? (
                  <Alert
                    message="Success"
                    description={
                      <div>
                        <Text>Status: {results[endpoint.name].status}</Text>
                        <br />
                        <Text>Data: {JSON.stringify(results[endpoint.name].data, null, 2)}</Text>
                      </div>
                    }
                    type="success"
                    showIcon
                  />
                ) : (
                  <Alert
                    message="Failed"
                    description={
                      <div>
                        <Text>Status: {results[endpoint.name].status}</Text>
                        <br />
                        <Text>Error: {results[endpoint.name].error}</Text>
                      </div>
                    }
                    type="error"
                    showIcon
                  />
                )}
              </div>
            )}
          </Card>
        ))}
      </Space>

      <Divider />

      <Card title="Debug Information">
        <Text>Token: {localStorage.getItem('token') ? 'Available' : 'Not available'}</Text>
        <br />
        <Text>User ID: {localStorage.getItem('userId') || 'Not set'}</Text>
        <br />
        <Text>User Data: {localStorage.getItem('userData') || 'Not set'}</Text>
      </Card>
    </div>
  );
};

export default APITest;

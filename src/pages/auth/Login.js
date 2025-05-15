import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { authApi } from '../../services/api/auth';

const { Title } = Typography;

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  padding: 20px;

  .login-form {
    width: 100%;
    max-width: 400px;
  }

  .login-form-button {
    width: 100%;
  }
`;

const StyledCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  margin: auto;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

const Login = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [username, setUsername] = useState('');

  const handleLogin = async (values) => {
    try {
      setLoading(true);
      const formData = new URLSearchParams();
      formData.append('username', values.username);
      formData.append('password', values.password);

      await authApi.login(formData);
      message.success('Verification code has been sent to your email');
      setUsername(values.username);
      setShowMfa(true);
    } catch (error) {
      message.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (values) => {
    try {
      setLoading(true);
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('mfa_code', values.mfa_code);

      const response = await authApi.verifyMfa(formData);
      localStorage.setItem('token', response.access_token);
      message.success('Login successful');
      navigate('/dashboard');
    } catch (error) {
      message.error(error.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <LoginContainer>
      <StyledCard>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          ECG Diagnostic
        </Title>

        {!showMfa ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleLogin}
            className="login-form"
          >
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Please input your username' }]}
            >
              <Input placeholder="Enter your username" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please input your password' }]}
            >
              <Input.Password placeholder="Enter your password" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="login-form-button"
                loading={loading}
              >
                Login
              </Button>
            </Form.Item>

            <Form.Item>
              <Button
                type="link"
                onClick={handleRegister}
                className="login-form-button"
              >
                Register new account
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleVerifyMfa}
            className="login-form"
          >
            <Form.Item
              name="mfa_code"
              label="Verification Code"
              rules={[{ required: true, message: 'Please input verification code' }]}
            >
              <Input placeholder="Enter 6-digit code from your email" maxLength={6} />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="login-form-button"
                loading={loading}
              >
                Verify
              </Button>
            </Form.Item>

            <Form.Item>
              <Button
                type="link"
                onClick={() => {
                  setShowMfa(false);
                  form.resetFields();
                }}
                className="login-form-button"
              >
                Back to login
              </Button>
            </Form.Item>
          </Form>
        )}
      </StyledCard>
    </LoginContainer>
  );
};

export default Login;

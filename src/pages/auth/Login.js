import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { authApi } from '../../services/api/auth';
import loginSideImg from '../../assets/login-side.jpg';

const { Title } = Typography;

const LoginWrapper = styled.div`
  display: flex;
  min-height: 100vh;
`;

const ImageSide = styled.div`
  flex: 1;
  background: #0052cc;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
`;

const FormSide = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0052cc;
  min-height: 100vh;
`;

const LoginContainer = styled.div`
  width: 100%;
  max-width: 400px;
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

      // Support multiple possible response shapes
      let token = null;
      let userData = {
        username,
        role: undefined,
        user_id: undefined,
      };

      if (typeof response === 'string') {
        // Backend returned raw token string
        token = response;
      } else if (response && typeof response === 'object') {
        token = response.access_token || response.token || null;
        userData.username = response.username || userData.username;
        userData.role = response.role ?? userData.role;
        userData.user_id = response.user_id ?? userData.user_id;
      }

      if (!token) {
        throw new Error('Login succeeded but token missing in response');
      }

      localStorage.setItem('token', token);

      // If role/ids missing, try deriving from JWT
      try {
        const { getUserDataFromToken } = await import('../../utils/jwt');
        const derived = getUserDataFromToken(token);
        userData = {
          username: userData.username || derived.username,
          role: userData.role || derived.role,
          user_id: userData.user_id || derived.user_id,
        };
      } catch (_) {
        // Best-effort; continue with what we have
      }

      localStorage.setItem('userData', JSON.stringify(userData));
      message.success('Login successful');
      try {
        const { getUserRole } = await import('../../utils/jwt');
        const role = getUserRole();
        if (role === 'doctor') {
          navigate('/doctor-home');
        } else if (role === 'admin') {
          navigate('/admin-home');
        } else {
          navigate('/dashboard');
        }
      } catch (e) {
        navigate('/dashboard');
      }
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
    <LoginWrapper>
      <ImageSide>
        <img src={loginSideImg} alt="Healthcare illustration" style={{ maxWidth: '80%', maxHeight: '80%', borderRadius: '20px' }} />
      </ImageSide>
      <FormSide>
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
                {/* <Form.Item>
                  <Button
                    type="link"
                    onClick={handleRegister}
                    className="login-form-button"
                  >
                    Register new account
                  </Button>
                </Form.Item> */}
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
      </FormSide>
    </LoginWrapper>
  );
};

export default Login;

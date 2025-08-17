import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { authApi } from '../../services/api/auth';

const { Title } = Typography;

const RegisterContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  padding: 20px;

  .register-form {
    width: 100%;
    max-width: 400px;
  }

  .register-form-button {
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

const Register = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (values) => {
    try {
      setLoading(true);
      const formData = new URLSearchParams();
      formData.append('username', values.username);
      formData.append('password', values.password);
      formData.append('email', values.email);

      await authApi.register(formData);
      message.success('Registration successful. Please login.');
      navigate('/login');
    } catch (error) {
      message.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterContainer>
      <StyledCard>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          Register Account
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleRegister}
          className="register-form"
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please input your username' }]}
          >
            <Input placeholder="Enter your username" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter your email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please input your password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm your password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="register-form-button"
              loading={loading}
            >
              Register
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              type="link"
              onClick={() => navigate('/login')}
              className="register-form-button"
            >
              Already have an account? Login
            </Button>
          </Form.Item>
        </Form>
      </StyledCard>
    </RegisterContainer>
  );
};

export default Register;

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Typography, Space, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { usersApi } from '../../services/api/users';

const { Title } = Typography;
const { Option } = Select;

const PageContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const AddDoctor = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams(); // Get user ID from URL if editing
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingUser, setExistingUser] = useState(null);

  // Check if user is in edit mode
  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      fetchUserData(id);
    }
  }, [id]);

  // Fetch existing user data for editing
  const fetchUserData = async (userId) => {
    try {
      setLoading(true);
      const userData = await usersApi.getUserDetail(userId);
      setExistingUser(userData);

      // Pre-fill the form with existing data
      form.setFieldsValue({
        username: userData.username,
        email: userData.email,
        role: userData.role
        // Note: password is not pre-filled for security
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      message.error('Failed to fetch user data');
      navigate('/doctors');
    } finally {
      setLoading(false);
    }
  };

  // Handle messages in useEffect to avoid React 18 warnings
  useEffect(() => {
    if (errorMessage) {
      message.error(errorMessage);
      setErrorMessage('');
    }
    if (successMessage) {
      message.success(successMessage);
      setSuccessMessage('');
      navigate('/doctors');
    }
  }, [errorMessage, successMessage, navigate]);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      console.log('Form values:', values);

      if (isEditMode) {
        // Update existing user
        const updateData = {
          username: values.username,
          email: values.email,
          role: values.role
        };

        // Only include password if it was changed
        if (values.password && values.password.trim() !== '') {
          updateData.password = values.password;
        }

        await usersApi.updateUser(id, updateData);
        setSuccessMessage('User updated successfully!');
      } else {
        // Create new user
        const userData = {
          username: values.username,
          password: values.password,
          email: values.email,
          role: values.role || 'doctor'
        };

        console.log('Sending user data to API:', userData);
        console.log('User data type:', typeof userData);
        console.log('User data keys:', Object.keys(userData));

        await usersApi.createUser(userData);
        setSuccessMessage('User created successfully!');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      let errorMsg = isEditMode ? 'Failed to update user' : 'Failed to create user';

      // Handle different types of error responses
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log('Full error response:', errorData);
        console.log('Error response type:', typeof errorData);
        console.log('Error response keys:', Object.keys(errorData));

        if (errorData.detail) {
          console.log('Detail type:', typeof errorData.detail);
          console.log('Detail value:', errorData.detail);
          if (Array.isArray(errorData.detail)) {
            console.log('Detail array length:', errorData.detail.length);
            errorData.detail.forEach((err, index) => {
              console.log(`Error ${index}:`, err);
              console.log(`Error ${index} keys:`, Object.keys(err));
            });
          }
        }

        // Handle Pydantic validation errors (structured error objects)
        if (errorData.detail && Array.isArray(errorData.detail)) {
          // Multiple validation errors
          const validationErrors = errorData.detail.map(err => {
            const field = err.loc ? err.loc.join('.') : 'unknown';
            return `${field}: ${err.msg}`;
          }).join(', ');
          errorMsg = `Validation errors: ${validationErrors}`;
        } else if (errorData.detail && typeof errorData.detail === 'string') {
          // Single error message
          errorMsg = errorData.detail;
        } else if (errorData.detail && typeof errorData.detail === 'object') {
          // Structured error object (like Pydantic validation error)
          if (errorData.detail.msg) {
            errorMsg = errorData.detail.msg;
          } else if (errorData.detail.message) {
            errorMsg = errorData.detail.message;
          } else {
            errorMsg = 'Invalid data format';
          }
        } else if (errorData.message) {
          errorMsg = errorData.message;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      // Ensure errorMsg is always a string
      if (typeof errorMsg !== 'string') {
        errorMsg = 'An unexpected error occurred';
      }

      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <StyledCard>
        <Header>
          <Title level={3}>{isEditMode ? 'Edit User' : 'Add New User'}</Title>
        </Header>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please input username' }]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: !isEditMode, message: 'Please input password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
            extra={isEditMode ? 'Leave blank to keep current password' : ''}
          >
            <Input.Password placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"} />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select placeholder="Select role">
              <Option value="doctor">Doctor</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEditMode ? 'Update User' : 'Create User'}
              </Button>
              <Button onClick={() => navigate('/doctors')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </StyledCard>
    </PageContainer>
  );
};

export default AddDoctor;

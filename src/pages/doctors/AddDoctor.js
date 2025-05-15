import React from 'react';
import { Card, Form, Input, Select, Button, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

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

  const onFinish = (values) => {
    console.log('Form values:', values);
    // TODO: Implement add doctor logic
    navigate('/doctors');
  };

  return (
    <PageContainer>
      <StyledCard>
        <Header>
          <Title level={3}>Add Doctor Information</Title>
        </Header>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="doctorId"
            label="Doctor ID"
            rules={[{ required: true, message: 'Please input Doctor ID' }]}
          >
            <Input placeholder="Enter Doctor ID" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Doctor Name"
            rules={[{ required: true, message: 'Please input Doctor Name' }]}
          >
            <Input placeholder="Enter Doctor Name" />
          </Form.Item>

          <Form.Item
            name="gender"
            label="Gender"
            rules={[{ required: true, message: 'Please select Gender' }]}
          >
            <Select placeholder="Select Gender">
              <Option value="male">Male</Option>
              <Option value="female">Female</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="age"
            label="Age"
            rules={[{ required: true, message: 'Please input Age' }]}
          >
            <Input type="number" placeholder="Enter Age" />
          </Form.Item>

          <Form.Item
            name="department"
            label="Department"
            rules={[{ required: true, message: 'Please input Department' }]}
          >
            <Input placeholder="Enter Department" />
          </Form.Item>

          <Form.Item
            name="specialties"
            label="Specialties"
            rules={[{ required: true, message: 'Please input Specialties' }]}
          >
            <Input placeholder="Enter Specialties" />
          </Form.Item>

          <Form.Item
            name="experience"
            label="Year of Experience"
            rules={[{ required: true, message: 'Please input Year of Experience' }]}
          >
            <Input type="number" placeholder="Enter Years of Experience" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select Status' }]}
          >
            <Select placeholder="Select Status">
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="contactInfo"
            label="Contact Info"
            rules={[{ required: true, message: 'Please input Contact Info' }]}
          >
            <Input.TextArea placeholder="Enter Contact Information" rows={4} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Add Doctor
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

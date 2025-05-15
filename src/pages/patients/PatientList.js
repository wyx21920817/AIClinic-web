import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Card, message, Modal, Form, DatePicker, Select, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { patientsApi } from '../../services/api/patients';
import dayjs from 'dayjs';

const { Title } = Typography;

const PageContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
`;

const StyledCard = styled(Card)`
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SearchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const PatientList = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientsApi.getPatients();
      setPatients(response);
    } catch (error) {
      message.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAdd = () => {
    setEditingPatient(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    form.setFieldsValue({
      ...patient,
      birth_date: dayjs(patient.birth_date),
    });
    setModalVisible(true);
  };

  const handleDelete = async (patientId) => {
    try {
      await patientsApi.deletePatient(patientId);
      message.success('Patient deleted successfully');
      fetchPatients();
    } catch (error) {
      message.error('Failed to delete patient');
    }
  };

  const handleSave = async (values) => {
    try {
      if (editingPatient) {
        await patientsApi.updatePatient(editingPatient.id, values);
        message.success('Patient updated successfully');
      } else {
        await patientsApi.createPatient(values);
        message.success('Patient added successfully');
      }
      setModalVisible(false);
      fetchPatients();
    } catch (error) {
      message.error(editingPatient ? 'Failed to update patient' : 'Failed to add patient');
    }
  };

  const columns = [
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      filteredValue: [searchText],
      onFilter: (value, record) => 
        record.name.toLowerCase().includes(value.toLowerCase()) ||
        record.patient_id.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
    },
    {
      title: 'Birth Date',
      dataIndex: 'birth_date',
      key: 'birth_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => Modal.confirm({
              title: 'Delete Patient',
              content: 'Are you sure you want to delete this patient?',
              onOk: () => handleDelete(record.id),
            })}
          />
          <Button 
            type="primary" 
            onClick={() => navigate(`/patients/${record.id}`)}
          >
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <StyledCard>
        <SearchHeader>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by name or ID"
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            value={searchText}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Add Patient
          </Button>
        </SearchHeader>

        <Table 
          columns={columns} 
          dataSource={patients} 
          loading={loading}
          rowKey="id"
        />

        <Modal
          title={editingPatient ? 'Edit Patient' : 'Add Patient'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            {!editingPatient && (
              <Form.Item
                name="patient_id"
                label="Patient ID"
                rules={[{ required: true, message: 'Please input patient ID' }]}
              >
                <Input placeholder="Enter patient ID" />
              </Form.Item>
            )}

            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please input name' }]}
            >
              <Input placeholder="Enter name" />
            </Form.Item>

            <Form.Item
              name="gender"
              label="Gender"
              rules={[{ required: true, message: 'Please select gender' }]}
            >
              <Select>
                <Select.Option value="M">Male</Select.Option>
                <Select.Option value="F">Female</Select.Option>
                <Select.Option value="Others">Others</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="birth_date"
              label="Birth Date"
              rules={[{ required: true, message: 'Please select birth date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="contact_info"
              label="Contact Info"
            >
              <Input.TextArea placeholder="Enter contact information" />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">
                  {editingPatient ? 'Update' : 'Add'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </StyledCard>
    </PageContainer>
  );
};

export default PatientList;

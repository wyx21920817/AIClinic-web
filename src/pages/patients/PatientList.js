import React, { useState, useEffect } from 'react';
import { Input, Card, List, Button, Avatar, Typography, Space, Modal, message, Form, DatePicker, Select } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, PlusOutlined, ImportOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { patientsApi } from '../../services/api/patients';
import dayjs from 'dayjs';

const { Title } = Typography;

const PageContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const SearchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const PatientItem = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .patient-info {
    flex: 1;
    margin-left: 16px;
  }

  .patient-name {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .patient-details {
    color: rgba(0, 0, 0, 0.45);
    font-size: 14px;
  }
`;

const ActionButtons = styled(Space)`
  margin-left: 16px;
`;

const PatientList = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredPatients = (patients || []).filter(patient => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    if (patient.source === 'orthanc') {
      const patientId = patient.MainDicomTags?.PatientID || '';
      const patientName = patient.MainDicomTags?.PatientName || '';
      return patientId.toLowerCase().includes(searchLower) ||
             patientName.toLowerCase().includes(searchLower);
    } else {
      return (patient.patient_id || '').toLowerCase().includes(searchLower) ||
             (patient.name || '').toLowerCase().includes(searchLower);
    }
  });
  const [searchSource, setSearchSource] = useState('local'); // 'local' or 'orthanc'
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      if (searchSource === 'local') {
        const response = await patientsApi.getPatients();
        console.log('本地患者数据:', response);
        // Ensure response is an array
        setPatients(Array.isArray(response) ? response : []);
      } else {
        const response = await patientsApi.searchOrthancPatients(searchText);
        console.log('Orthanc患者数据:', response);
        // Ensure response has patients property and it's an array
        if (response && response.patients && Array.isArray(response.patients)) {
          const formattedPatients = response.patients.map(p => ({
            ...p,
            source: 'orthanc'
          }));
          setPatients(formattedPatients);
        } else {
          setPatients([]);
        }
      }
    } catch (error) {
      message.error(`Failed to fetch patients from ${searchSource === 'local' ? 'local database' : 'Orthanc server'}`);
      console.error('Error:', error);
      setPatients([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // MOCK 数据演示（如需后端数据可删除此段）
  // useEffect(() => {
  //   setPatients([
  //     {
  //       id: '665b1e2f8e4b2c001e7e7a1a',
  //       patient_id: '1',
  //       name: 'Jason',
  //       gender: 'M',
  //       birth_date: '1990-01-24',
  //     },
  //     {
  //       id: '665b1e2f8e4b2c001e7e7a1b',
  //       patient_id: '122',
  //       name: 'Kate',
  //       gender: 'F',
  //       birth_date: '1983-05-10',
  //     },
  //     {
  //       id: '665b1e2f8e4b2c001e7e7a1c',
  //       patient_id: '122222',
  //       name: 'Mandy',
  //       gender: 'F',
  //       birth_date: '1974-09-28',
  //     },
  //   ]);
  // }, []);

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
      await patientsApi.updatePatient(editingPatient.patient_id, values);
      message.success('Patient updated successfully');
      setModalVisible(false);
      fetchPatients();
    } catch (error) {
      message.error('Failed to update patient');
    }
  };


  return (
    <PageContainer>
      <StyledCard>
        <SearchHeader>
          <Title level={3}>Patients Management</Title>
        </SearchHeader>
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Patient Name/ID"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => {
              if (searchText.trim()) {
                fetchPatients();
              }
            }}
          />
          <Space>
            <Button
              type={searchSource === 'local' ? 'primary' : 'default'}
              onClick={() => {
                setSearchSource('local');
                fetchPatients();
              }}
            >
              Search Local Database
            </Button>
            <Button
              type={searchSource === 'orthanc' ? 'primary' : 'default'}
              onClick={() => {
                setSearchSource('orthanc');
                fetchPatients();
              }}
            >
              Search Orthanc Server
            </Button>
          </Space>
        </Space>
        <List
          loading={loading}
          dataSource={filteredPatients}
          renderItem={(patient) => (
            <PatientItem>
              <Avatar size={64}>
                {patient.name ? patient.name[0] : 'P'}
              </Avatar>
              <div className="patient-info">
                <div className="patient-name">
                  {patient.source === 'orthanc' ? 
                    (patient.MainDicomTags?.PatientName || 'Anonymous') : 
                    patient.name
                  }
                </div>
                <div className="patient-details">
                  Patient ID: {patient.source === 'orthanc' ? 
                    patient.ID : 
                    patient.patient_id
                  } &nbsp;&nbsp; 
                  Gender: {patient.source === 'orthanc' ? 
                    patient.MainDicomTags?.PatientSex : 
                    patient.gender
                  } &nbsp;&nbsp; 
                  Birth: {patient.source === 'orthanc' ? 
                    (patient.MainDicomTags?.PatientBirthDate ? 
                      dayjs(patient.MainDicomTags.PatientBirthDate).format('YYYY-MM-DD') : 
                      'N/A'
                    ) : 
                    dayjs(patient.birth_date).format('YYYY-MM-DD')
                  } &nbsp;&nbsp;
                  Source: {patient.source || 'local'}
                  {patient.studies && (
                    <div style={{ color: '#1890ff', marginTop: '4px' }}>
                      {patient.studies.length} study/studies available
                    </div>
                  )}
                </div>
              </div>
              <ActionButtons>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(patient)}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => Modal.confirm({
                    title: 'Delete Patient',
                    content: 'Are you sure you want to delete this patient?',
                    onOk: () => handleDelete(patient.patient_id),
                  })}
                />
                {patient.source === 'orthanc' && (
                  <Button
                    type="primary"
                    onClick={async () => {
                      const hide = message.loading('Importing patient...');
                      try {
                        await patientsApi.importOrthancPatient(patient);
                        message.success('Patient imported successfully');
                        fetchPatients();
                      } catch (error) {
                        console.error('Import error:', error);
                        message.error(error.message || 'Failed to import patient');
                      } finally {
                        hide();
                      }
                    }}
                    icon={<ImportOutlined />}
                  >
                    Import
                  </Button>
                )}
                {patient.source !== 'orthanc' && (
                  <Button
                    type="primary"
                    onClick={() => navigate(`/patients/${patient.patient_id}`)}
                  >
                    View Details
                  </Button>
                )}
              </ActionButtons>
            </PatientItem>
          )}
        />
        <Modal
          title="Edit Patient"
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
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
            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">
                  Update
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

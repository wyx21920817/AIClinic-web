import React, { useState } from 'react';
import { Input, Card, List, Button, Avatar, Typography, Space, message } from 'antd';
import { SearchOutlined, FileImageOutlined, ImportOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import dayjs from 'dayjs';
import { patientsApi } from '../../services/api/patients';

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

  .studies-info {
    color: #1890ff;
    margin-top: 4px;
  }
`;

const ActionButtons = styled(Space)`
  margin-left: 16px;
`;

const OrthancPatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [total, setTotal] = useState(0);

  const searchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientsApi.searchOrthancPatients(searchText);
      console.log('API Response:', response);
      console.log('First patient data:', response.patients?.[0]);
      setPatients(response.patients || []);
      setTotal(response.total || 0);
    } catch (error) {
      message.error('Failed to search Orthanc patients');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    // Convert from YYYYMMDD to YYYY-MM-DD
    if (date.length === 8) {
      const year = date.substring(0, 4);
      const month = date.substring(4, 6);
      const day = date.substring(6, 8);
      return year + '-' + month + '-' + day;
    }
    return date;
  };

  const handleImport = async (patient) => {
    const hide = message.loading('Importing patient...', 0);
    try {
      await patientsApi.importOrthancPatient(patient);
      message.success('Patient imported successfully');
    } catch (error) {
      console.error('Import error:', error);
      message.error(error.message || 'Failed to import patient');
    } finally {
      hide();
    }
  };

  return (
    <PageContainer>
      <StyledCard>
        <SearchHeader>
          <Title level={3}>Orthanc PACS Patients</Title>
        </SearchHeader>
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by Patient ID or Name"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={searchPatients}
          />
          <Button type="primary" onClick={searchPatients}>
            Search Orthanc
          </Button>
          {total > 0 && (
            <Typography.Text type="secondary">
              Found {total} patient(s)
            </Typography.Text>
          )}
        </Space>
        <List
          loading={loading}
          dataSource={patients}
          renderItem={(patient) => (
            <PatientItem>
              <Avatar size={64} icon={<FileImageOutlined />} />
              <div className="patient-info">
                <div className="patient-name">
                  {patient.MainDicomTags?.PatientName || 'Anonymous'}
                </div>
                <div className="patient-details">
                  Patient ID: {patient.ID} &nbsp;&nbsp;
                  Gender: {patient.MainDicomTags?.PatientSex || 'Unknown'} &nbsp;&nbsp;
                  Birth: {formatDate(patient.MainDicomTags?.PatientBirthDate)}
                </div>
                <div className="studies-info">
                  {patient.Studies?.length || 0} study/studies available
                </div>
              </div>
              <ActionButtons>
                <Button
                  type="primary"
                  onClick={() => handleImport(patient)}
                  icon={<ImportOutlined />}
                >
                  Import
                </Button>
              </ActionButtons>
            </PatientItem>
          )}
        />
      </StyledCard>
    </PageContainer>
  );
};

export default OrthancPatientList;

import React from 'react';
import { Input, Card, List, Button, Avatar, Typography, Space } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';

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

const DoctorItem = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .doctor-info {
    flex: 1;
    margin-left: 16px;
  }

  .doctor-name {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .doctor-details {
    color: rgba(0, 0, 0, 0.45);
    font-size: 14px;
  }
`;

const ActionButtons = styled(Space)`
  margin-left: 16px;
`;

const DoctorList = () => {
  const navigate = useNavigate();

  // Sample data
  const doctors = [
    {
      id: 'XXXXXXXX',
      name: 'Dr Wilson',
      gender: 'Male',
      age: 35,
      avatar: null,
    },
    {
      id: 'XXXXXXXX',
      name: 'Dr Smith',
      gender: 'Male',
      age: 44,
      avatar: null,
    },
    {
      id: 'XXXXXXXX',
      name: 'Dr Dahail',
      gender: 'Female',
      age: 29,
      avatar: null,
    },
  ];

  const handleAddDoctor = () => {
    navigate('/doctors/add');
  };

  const handleViewDetails = (doctorId) => {
    navigate('/doctors/' + doctorId);
  };

  return (
    <PageContainer>
      <StyledCard>
        <SearchHeader>
          <Title level={3}>Doctors Management</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddDoctor}
          >
            Add Doctor
          </Button>
        </SearchHeader>

        <Input
          placeholder="Doctor ID/Name"
          prefix={<SearchOutlined />}
          style={{ marginBottom: 24 }}
        />

        <List
          dataSource={doctors}
          renderItem={(doctor) => (
            <DoctorItem>
              <Avatar size={64} src={doctor.avatar}>
                {doctor.name[0]}
              </Avatar>
              <div className="doctor-info">
                <div className="doctor-name">{doctor.name}</div>
                <div className="doctor-details">
                  Doctor ID: {doctor.id} &nbsp;&nbsp; Gender: {doctor.gender} &nbsp;&nbsp; Age: {doctor.age}
                </div>
              </div>
              <ActionButtons>
                <Button 
                  type="text" 
                  icon={<EditOutlined />}
                  onClick={() => navigate('/doctors/edit/' + doctor.id)}
                />
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />}
                />
                <Button 
                  type="primary"
                  onClick={() => handleViewDetails(doctor.id)}
                >
                  View Details
                </Button>
              </ActionButtons>
            </DoctorItem>
          )}
        />
      </StyledCard>
    </PageContainer>
  );
};

export default DoctorList;

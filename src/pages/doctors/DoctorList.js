import React, { useState, useEffect } from 'react';
import { Input, Card, List, Button, Avatar, Typography, Space, message, Modal } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../services/api/users';

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

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      console.log('Fetching doctors...');
      const doctorsData = await usersApi.getUsers();
      console.log('API Response:', doctorsData);
      setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
    } catch (error) {
      message.error('Failed to fetch doctors list');
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = () => {
    navigate('/doctors/add');
  };

  const handleViewDetails = (doctorId) => {
    navigate('/doctors/' + doctorId);
  };

  const handleDeleteDoctor = (doctorId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this doctor?',
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await usersApi.deleteUser(doctorId);
          message.success('Doctor deleted successfully');
          fetchDoctors(); // Refresh the list
        } catch (error) {
          message.error('Failed to delete doctor');
          console.error('Error deleting doctor:', error);
        }
      },
    });
  };

  const filteredDoctors = doctors && doctors.length > 0 ? doctors.filter(doctor => 
    (doctor.username?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
    (doctor.id?.toString() || '').includes(searchText)
  ) : [];

  return (
    <PageContainer>
      <StyledCard>
        <SearchHeader>
          <Title level={3}>User Management</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddDoctor}
          >
            Add User
          </Button>
        </SearchHeader>

        <Input
          placeholder="Search by ID or Username"
          prefix={<SearchOutlined />}
          style={{ marginBottom: 24 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <List
          loading={loading}
          dataSource={filteredDoctors}
          locale={{ emptyText: 'No doctors found' }}
          renderItem={(doctor) => (
            <DoctorItem>
              <Avatar size={64} src={doctor.avatar}>
                {doctor.username[0]}
              </Avatar>
              <div className="doctor-info">
                <div className="doctor-name">{doctor.username}</div>
                <div className="doctor-details">
                  ID: {doctor.id} &nbsp;&nbsp; Role: {doctor.role} &nbsp;&nbsp; Email: {doctor.email}
                  <br />
                  Created: {new Date(doctor.created_at).toLocaleString()}
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
                  onClick={() => handleDeleteDoctor(doctor.id)}
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

import React from 'react';
import { Card, Row, Col, Typography, Table } from 'antd';
import { UserOutlined, AlertOutlined, FileImageOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';

const { Title } = Typography;

const PageContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 100%;
`;

const StatNumber = styled.div`
  font-size: 36px;
  font-weight: bold;
  color: #1890ff;
  margin: 16px 0;
`;

const StatTitle = styled.div`
  font-size: 16px;
  color: rgba(0, 0, 0, 0.85);
`;

const IconWrapper = styled.div`
  font-size: 24px;
  color: #1890ff;
`;

const Dashboard = () => {
  // Sample data
  const recentPatients = [
    {
      key: '1',
      name: 'Karen W',
      gender: 'Female',
      age: 49,
      lastECG: '2023-04-10',
    },
    // Add more sample data as needed
  ];

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Last ECG',
      dataIndex: 'lastECG',
      key: 'lastECG',
    },
  ];

  return (
    <PageContainer>
      <Title level={2}>Dashboard</Title>
      
      <Row gutter={[24, 24]}>
        {/* Total Patients */}
        <Col xs={24} sm={12} lg={8}>
          <StyledCard>
            <IconWrapper>
              <UserOutlined />
            </IconWrapper>
            <StatTitle>Total Patients</StatTitle>
            <StatNumber>126</StatNumber>
          </StyledCard>
        </Col>

        {/* NEVCC Uploads Today */}
        <Col xs={24} sm={12} lg={8}>
          <StyledCard>
            <IconWrapper>
              <FileImageOutlined />
            </IconWrapper>
            <StatTitle>NEVCC Uploads Today</StatTitle>
            <StatNumber>8</StatNumber>
          </StyledCard>
        </Col>

        {/* Recent AI Diagnosis Alerts */}
        <Col xs={24} sm={12} lg={8}>
          <StyledCard>
            <IconWrapper>
              <AlertOutlined />
            </IconWrapper>
            <StatTitle>Recent AI Diagnosis Alerts</StatTitle>
            <StatNumber>2</StatNumber>
          </StyledCard>
        </Col>
      </Row>

      {/* Recent Patients */}
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <StyledCard>
            <Title level={4}>Recent Patients</Title>
            <Table 
              columns={columns} 
              dataSource={recentPatients} 
              pagination={false}
            />
          </StyledCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Dashboard;

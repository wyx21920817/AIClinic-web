import React from 'react';
import { Typography } from 'antd';
import styled from '@emotion/styled';

const { Text } = Typography;

const UserInfoContainer = styled.div`
  padding: 8px 16px;
  background: #f5f5f5;
  border-radius: 4px;
  display: inline-block;
  margin: 8px;
`;

const UserInfo = () => {
  const getUserInfo = () => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!userData.username) return null;
    return {
      role: userData.role,
      name: userData.username
    };
  };

  const userInfo = getUserInfo();

  if (!userInfo) {
    return (
      <UserInfoContainer>
        <Text type="secondary">Not logged in</Text>
      </UserInfoContainer>
    );
  }

  return (
    <UserInfoContainer>
      <Text strong>
        {userInfo.role === 'admin' ? 'Admin' : 'Doctor'}: {userInfo.name}
      </Text>
    </UserInfoContainer>
  );
};

export default UserInfo; 
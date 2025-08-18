# Role-Based Dashboard System

## Overview

The AI Clinic application now features a professional role-based dashboard system that provides different interfaces and functionality based on user roles. This system ensures that users see only relevant information and have access to appropriate features based on their permissions.

## User Roles

### 1. Doctor Role (`doctor`)
**Purpose**: Medical professionals who analyze ECGs and manage patients

**Key Features**:
- Patient-focused dashboard
- ECG analysis tools
- AI diagnosis review
- Patient management
- AI feedback system

**Dashboard Components**:
- Welcome section with personalized greeting
- Key statistics (Total Patients, ECGs Today, Pending Reviews, AI Accuracy)
- Recent patients table
- AI alerts requiring attention
- Quick action cards for common tasks

**Permissions**:
- `view_patients` - View patient information
- `view_ecgs` - Access ECG files
- `upload_ecgs` - Upload new ECG recordings
- `review_ai_diagnosis` - Review AI-generated diagnoses
- `provide_feedback` - Provide feedback on AI accuracy
- `view_reports` - Access patient reports
- `manage_own_patients` - Manage assigned patients

### 2. Administrator Role (`admin`)
**Purpose**: System administrators who manage users and monitor system health

**Key Features**:
- System overview dashboard
- User management
- Audit logs
- System analytics
- Performance monitoring

**Dashboard Components**:
- System health status
- Key metrics (Total Doctors, Total Patients, Total ECGs, System Health)
- System performance indicators (CPU, Memory, Storage, Network)
- Recent system activity
- Pending approvals
- Quick action cards for administrative tasks

**Permissions**:
- All doctor permissions plus:
- `manage_doctors` - Manage doctor accounts
- `view_audit_logs` - Access system audit logs
- `system_administration` - System administration tasks
- `view_analytics` - View system analytics
- `manage_system_settings` - Modify system settings

### 3. User Role (`user`)
**Purpose**: Basic users with limited access

**Permissions**:
- `view_own_profile` - View and edit own profile

## Technical Implementation

### File Structure

```
src/
├── constants/
│   └── Constants.js          # Role definitions and configurations
├── utils/
│   └── useRole.js           # Custom hook for role management
├── pages/
│   ├── dashboard/
│   │   └── index.js         # Main dashboard with role routing
│   └── RoleTest.js          # Role testing interface
└── components/
    └── PrivateRoute.js      # Route protection based on roles
```

### Key Components

#### 1. Constants (Constants.js)
```javascript
export const USER_ROLES = {
  DOCTOR: 'doctor',
  ADMIN: 'admin',
  USER: 'user'
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.DOCTOR]: [
    'view_patients',
    'view_ecgs',
    // ... more permissions
  ],
  // ... other roles
};

export const DASHBOARD_CONFIG = {
  [USER_ROLES.DOCTOR]: {
    title: "Doctor Dashboard",
    subtitle: "Patient care and ECG analysis",
    icon: "👨‍⚕️",
    // ... configuration
  },
  // ... other roles
};
```

#### 2. Role Hook (useRole.js)
```javascript
export const useRole = () => {
  // Provides role-based functionality
  const hasPermission = (permission) => { /* ... */ };
  const isAdmin = () => { /* ... */ };
  const isDoctor = () => { /* ... */ };
  // ... more functions
};
```

#### 3. Dashboard Component (dashboard/index.js)
```javascript
const Dashboard = () => {
  const { isAdmin, isDoctor } = useRole();
  
  if (isAdmin()) {
    return <AdminDashboard />;
  } else if (isDoctor()) {
    return <DoctorDashboard />;
  } else {
    return <FallbackDashboard />;
  }
};
```

## Features

### 1. Dynamic Content
- Dashboard content changes based on user role
- Personalized welcome messages
- Role-specific statistics and metrics
- Customized quick action cards

### 2. Permission System
- Granular permission control
- Easy permission checking with `hasPermission()`
- Support for multiple permission types

### 3. Professional UI
- Modern, responsive design
- Smooth animations and transitions
- Consistent color schemes per role
- Professional icons and layouts

### 4. Quick Actions
- Role-specific action cards
- Direct navigation to relevant features
- Visual feedback on hover

### 5. Real-time Data
- Live statistics and metrics
- System health monitoring (admin)
- Recent activity feeds
- AI alerts and notifications

## Usage

### Testing Roles
1. Navigate to `/role-test`
2. Use the role selector to switch between roles
3. Navigate to `/dashboard` to see the role-specific interface

### Adding New Roles
1. Add role definition to `USER_ROLES` in Constants.js
2. Define permissions in `ROLE_PERMISSIONS`
3. Create dashboard configuration in `DASHBOARD_CONFIG`
4. Add role-specific dashboard component
5. Update routing logic in main Dashboard component

### Adding New Permissions
1. Add permission to `ROLE_PERMISSIONS` for relevant roles
2. Use `hasPermission()` hook in components
3. Update UI based on permission checks

## API Integration

The dashboard system is designed to work with the existing API structure:

```javascript
// Example API calls for dashboard data
const loadDoctorData = async () => {
  // Replace mock data with actual API calls
  const stats = await ecgAPI.getDoctorStats();
  const patients = await ecgAPI.getRecentPatients();
  const alerts = await aiDiagnosisAPI.getAlerts();
};
```

## Security

- Role-based route protection with `PrivateRoute`
- Permission checking at component level
- Secure role storage in localStorage
- Validation of user permissions

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live dashboard updates
2. **Advanced Analytics**: More detailed charts and metrics
3. **Customizable Dashboards**: User-configurable dashboard layouts
4. **Mobile Optimization**: Enhanced mobile dashboard experience
5. **Notification System**: Real-time notifications for important events
6. **Export Features**: Dashboard data export capabilities

## Troubleshooting

### Common Issues

1. **Role not updating**: Clear localStorage and refresh page
2. **Permissions not working**: Check role assignment in user data
3. **Dashboard not loading**: Verify role exists in USER_ROLES
4. **Styling issues**: Check CSS imports and Ant Design theme

### Debug Mode

Enable debug logging by checking browser console for role-related messages:
```javascript
console.log('User role:', userData.role);
console.log('Permissions:', permissions);
```

## Contributing

When adding new features to the dashboard:

1. Follow the existing role-based architecture
2. Use the `useRole` hook for permission checking
3. Add new permissions to Constants.js
4. Update dashboard configurations as needed
5. Test with different user roles
6. Document new features in this README

---

**Note**: This role-based dashboard system provides a solid foundation for scalable user management and can be easily extended for additional roles and permissions as the application grows.

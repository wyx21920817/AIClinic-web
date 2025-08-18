export const SOP_CLASS_UIDS = [
  "1.2.840.10008.5.1.4.1.1.9.1.1",  // 12-lead ECG Waveform Storage
  "1.2.840.10008.5.1.4.1.1.9.1.2",  // General ECG Waveform Storage
  "1.2.840.10008.5.1.4.1.1.9.1.3"   // Ambulatory ECG Waveform Storage
];

export const WAVE_FORM_BITS_STORED = 16;

export const KEY_UNIT_INFO = [
  { key: "VentricularRate", unit: "bpm" },
  { key: "AtrialRate", unit: "bpm" },
  { key: "PRInterval", unit: "ms" },
  { key: "QRSDuration", unit: "ms" },
  { key: "QTInterval", unit: "ms" },
  { key: "QTCorrected", unit: "ms" },
  { key: "PAxis", unit: "°" },
  { key: "RAxis", unit: "°" },
  { key: "TAxis", unit: "°" },
  { key: "QRSCount", unit: "" },
  { key: "QOnset", unit: "ms" },
  { key: "QOffset", unit: "ms" },
  { key: "POnset", unit: "ms" },
  { key: "POffset", unit: "ms" },
  { key: "TOffset", unit: "ms" }
];

export const SPLINE = {
  TENSION: 0.5,
  NUM_OF_SEGMENTS: 16
};

// User Roles
export const USER_ROLES = {
  DOCTOR: 'doctor',
  ADMIN: 'admin',
  USER: 'user'
};

// Role Display Names
export const ROLE_DISPLAY_NAMES = {
  [USER_ROLES.DOCTOR]: 'Doctor',
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.USER]: 'User'
};

// Role Permissions
export const ROLE_PERMISSIONS = {
  [USER_ROLES.DOCTOR]: [
    'view_patients',
    'view_ecgs',
    'upload_ecgs',
    'review_ai_diagnosis',
    'provide_feedback',
    'view_reports',
    'manage_own_patients'
  ],
  [USER_ROLES.ADMIN]: [
    'view_patients',
    'view_ecgs',
    'upload_ecgs',
    'review_ai_diagnosis',
    'provide_feedback',
    'view_reports',
    'manage_own_patients',
    'manage_doctors',
    'view_audit_logs',
    'system_administration',
    'view_analytics',
    'manage_system_settings'
  ],
  [USER_ROLES.USER]: [
    'view_own_profile'
  ]
};

// Dashboard Configuration
export const DASHBOARD_CONFIG = {
  [USER_ROLES.DOCTOR]: {
    title: "Doctor Dashboard",
    subtitle: "Patient care and ECG analysis",
    icon: "👨‍⚕️",
    primaryColor: "#1890ff",
    gradientColors: ["#667eea", "#764ba2"],
    stats: [
      { key: 'totalPatients', label: 'Total Patients', icon: 'TeamOutlined', description: 'Under your care' },
      { key: 'todayECGs', label: 'ECGs Today', icon: 'HeartOutlined', description: 'New recordings' },
      { key: 'pendingReviews', label: 'Pending Reviews', icon: 'ClockCircleOutlined', description: 'Awaiting analysis' },
      { key: 'accuracyRate', label: 'AI Accuracy', icon: 'TrophyOutlined', description: 'Your agreement rate' }
    ],
    quickActions: [
      { title: 'Review ECGs', description: 'Analyze new recordings', icon: 'HeartOutlined', color: '#1890ff', route: '/patients' },
      { title: 'View Reports', description: 'Patient summaries', icon: 'BarChartOutlined', color: '#52c41a', route: '/test-deliverables' },
      { title: 'Schedule', description: 'Patient appointments', icon: 'CalendarOutlined', color: '#faad14', route: '/patients' },
      { title: 'AI Feedback', description: 'Improve accuracy', icon: 'CheckCircleOutlined', color: '#722ed1', route: '/xai-demo' }
    ]
  },
  [USER_ROLES.ADMIN]: {
    title: "Admin Dashboard",
    subtitle: "System overview and management controls",
    icon: "🛡️",
    primaryColor: "#722ed1",
    gradientColors: ["#667eea", "#764ba2"],
    stats: [
      { key: 'totalDoctors', label: 'Total Doctors', icon: 'TeamOutlined', description: 'Registered users' },
      { key: 'totalPatients', label: 'Total Patients', icon: 'UserOutlined', description: 'In database' },
      { key: 'totalECGs', label: 'Total ECGs', icon: 'HeartOutlined', description: 'Processed' },
      { key: 'systemHealth', label: 'System Health', icon: 'SecurityScanOutlined', description: 'Performance' }
    ],
    quickActions: [
      { title: 'Manage Users', description: 'Doctor accounts', icon: 'TeamOutlined', color: '#1890ff', route: '/doctors' },
      { title: 'Audit Logs', description: 'System activity', icon: 'SecurityScanOutlined', color: '#52c41a', route: '/audit-logs' },
      { title: 'Analytics', description: 'System reports', icon: 'BarChartOutlined', color: '#faad14', route: '/audit-logs' },
      { title: 'Backup', description: 'Data management', icon: 'FileImageOutlined', color: '#722ed1', route: '/audit-logs' }
    ]
  }
};

// ECG Conditions for AI Alerts
export const ECG_CONDITIONS = {
  AF: 'Atrial Fibrillation',
  AVB: 'Atrioventricular Block',
  LBBB: 'Left Bundle Branch Block',
  RBBB: 'Right Bundle Branch Block',
  ST: 'ST Elevation',
  NR: 'Normal Rhythm'
};

// Priority Levels
export const PRIORITY_LEVELS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

// Priority Colors
export const PRIORITY_COLORS = {
  [PRIORITY_LEVELS.HIGH]: '#ff4d4f',
  [PRIORITY_LEVELS.MEDIUM]: '#faad14',
  [PRIORITY_LEVELS.LOW]: '#52c41a'
};

// Status Types
export const STATUS_TYPES = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  IN_PROGRESS: 'In Progress'
};

// Status Colors
export const STATUS_COLORS = {
  [STATUS_TYPES.PENDING]: '#faad14',
  [STATUS_TYPES.COMPLETED]: '#52c41a',
  [STATUS_TYPES.FAILED]: '#ff4d4f',
  [STATUS_TYPES.IN_PROGRESS]: '#1890ff'
};

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard';
import PatientList from './pages/patients/PatientList';
import PatientDetail from './pages/patients/PatientDetail';
import DoctorList from './pages/doctors/DoctorList';
import AddDoctor from './pages/doctors/AddDoctor';
import PrivateRoute from './components/PrivateRoute';
import AuthRoute from './components/AuthRoute';
import ECGViewer from './components/ECGViewer';
import Account from './pages/account/Account';
import UserDetail from './pages/doctors/UserDetail';
import SimpleTest from './pages/SimpleTest';
import AIEngineShowcase from './pages/AIEngineShowcase';
import XAIResultPage from './pages/XAIResultPage';
import AuditLogsEnhanced from './pages/AuditLogsEnhanced';
// import AIECGResultsDemo from './pages/AIECGResultsDemo';
import RoleTest from './pages/RoleTest';
import APITest from './pages/APITest';
// import OrthancPatientList from './pages/patients/OrthancPatientList';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<AuthRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="patients" element={<PatientList />} />
            {/* <Route path="orthanc-patients" element={<OrthancPatientList />} /> */}
            <Route path="patients/:patientId" element={<PatientDetail />} />
            <Route path="ecg-view/:userId/:instanceId" element={<ECGViewer />} />
            <Route path="doctors" element={<DoctorList />} />
            <Route path="doctors/add" element={<AddDoctor />} />
            <Route path="doctors/edit/:id" element={<AddDoctor />} />
            <Route path="doctors/:userId" element={<UserDetail />} />
            <Route path="account" element={<Account />} />
            {/* Test Deliverables demo removed */}
            <Route path="audit-logs" element={<PrivateRoute allowedRoles={['admin']} />}>
              <Route index element={<AuditLogsEnhanced />} />
            </Route>
            {/* ECG AI Results Demo removed */}
            <Route path="simple-test" element={<SimpleTest />} />
            <Route path="ai-engine-showcase" element={<AIEngineShowcase />} />
            <Route path="xai/:instanceId" element={<XAIResultPage />} />
            <Route path="role-test" element={<RoleTest />} />
            <Route path="api-test" element={<APITest />} />
            <Route path="doctor-home" element={<PrivateRoute allowedRoles={['doctor']} />}>
              <Route index element={<div>Doctor Home</div>} />
            </Route>
            <Route path="admin-home" element={<PrivateRoute allowedRoles={['admin']} />}>
              <Route index element={<div>Admin Home</div>} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

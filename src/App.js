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
import TestDeliverables from './pages/TestDeliverables';
import SimpleTest from './pages/SimpleTest';
import AIEngineShowcase from './pages/AIEngineShowcase';
import XAIDemo from './pages/XAIDemo';
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
            <Route path="test-deliverables" element={<PrivateRoute allowedRoles={['doctor', 'admin']} />}>
              <Route index element={<TestDeliverables />} />
            </Route>
            <Route path="simple-test" element={<SimpleTest />} />
            <Route path="ai-engine-showcase" element={<AIEngineShowcase />} />
            <Route path="xai-demo" element={<XAIDemo />} />
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

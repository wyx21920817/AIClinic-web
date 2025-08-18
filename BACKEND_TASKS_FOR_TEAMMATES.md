# 🎯 Backend Tasks for Teammates - Frontend Integration

## 📋 Overview
This document outlines the backend tasks that need to be completed by your teammates so that **Kristi's frontend deliverables** can be fully functional and integrated with the actual backend system.

## 🎯 Frontend Deliverables Status
- ✅ **AI Interpretation UI** - COMPLETED (50 hours)
- ✅ **Doctor Feedback Interface** - COMPLETED (40 hours) 
- ✅ **PDF Report Export** - COMPLETED (30 hours)
- ✅ **Frontend API Integration** - COMPLETED (30 hours)

**Total Frontend Work: 150 hours completed**

---

## 🔗 Required Backend API Endpoints

### 1. **AI Diagnosis API** (`/api/ai-diagnosis`)
**Priority: HIGH** - Required for AI Interpretation UI

#### Endpoints Needed:
```python
# GET /api/ai-diagnosis/{ecgFileId}
# Get existing AI diagnosis for an ECG file
{
  "id": "diagnosis_123",
  "ecgFileId": "ecg_456",
  "confidence": 85,
  "primary": "Normal Sinus Rhythm",
  "secondary": ["ST segment elevation in V2-V4"],
  "highlighted_leads": ["V2", "V3", "V4"],
  "recommendations": "Consider further evaluation...",
  "created_at": "2025-08-01T10:00:00Z"
}

# POST /api/ai-diagnosis/analyze
# Request new AI diagnosis
{
  "ecgFileId": "ecg_456",
  "includeConfidence": true,
  "includeHighlightedLeads": true,
  "includeRecommendations": true
}

# GET /api/ai-diagnosis/{ecgFileId}/confidence
# Get confidence scores for diagnosis

# GET /api/ai-diagnosis/{ecgFileId}/leads
# Get highlighted leads information
```

#### Tasks for AI/ML Teammate:
- [ ] **Integrate DNN Module** from `AIClinic-Engine/DNN Module/`
- [ ] **Create AI diagnosis service** that processes ECG files
- [ ] **Implement confidence scoring** algorithm
- [ ] **Add lead highlighting** functionality
- [ ] **Create diagnosis storage** in database
- [ ] **Add real-time processing** capabilities

---

### 2. **Doctor Feedback API** (`/api/feedback`)
**Priority: HIGH** - Required for Doctor Feedback Interface

#### Endpoints Needed:
```python
# POST /api/feedback/submit
# Submit doctor feedback on AI diagnosis
{
  "ecgFileId": "ecg_456",
  "patientId": "patient_123",
  "doctorId": "doctor_789",
  "aiDiagnosisId": "diagnosis_123",
  "approved": true,
  "comment": "AI diagnosis is accurate...",
  "confidence": 4,
  "corrections": ["Add ST elevation in V1"]
}

# GET /api/feedback/history/{ecgFileId}
# Get feedback history for an ECG file

# PUT /api/feedback/{feedbackId}
# Update existing feedback
```

#### Tasks for Backend Teammate:
- [ ] **Create feedback model** in database
- [ ] **Implement feedback submission** endpoint
- [ ] **Add feedback history** retrieval
- [ ] **Create feedback validation** rules
- [ ] **Add audit logging** for feedback
- [ ] **Implement feedback analytics**

---

### 3. **PDF Report API** (`/api/pdf`)
**Priority: MEDIUM** - Required for PDF Report Export

#### Endpoints Needed:
```python
# POST /api/pdf/generate
# Generate PDF report with ECG data, AI diagnosis, and feedback
{
  "ecgData": {...},
  "aiDiagnosis": {...},
  "doctorFeedback": {...},
  "patientInfo": {...},
  "reportSettings": {
    "includeECG": true,
    "includeAI": true,
    "includeFeedback": true,
    "format": "A4"
  }
}

# GET /api/pdf/templates
# Get available report templates

# POST /api/pdf/templates
# Save custom report template
```

#### Tasks for Backend Teammate:
- [ ] **Integrate PDF generation** library (e.g., ReportLab, WeasyPrint)
- [ ] **Create report templates** system
- [ ] **Implement PDF generation** service
- [ ] **Add template management** endpoints
- [ ] **Create report caching** system
- [ ] **Add report versioning**

---

### 4. **Enhanced ECG API** (`/api/ecg`)
**Priority: MEDIUM** - Enhance existing ECG functionality

#### Additional Endpoints Needed:
```python
# GET /api/ecg/{userId}/files/{fileId}
# Enhanced ECG file details with AI integration

# GET /api/ecg/patient/{patientId}/files
# Get all ECG files for a patient

# POST /api/ecg/{userId}/files
# Upload ECG file with AI processing trigger
```

#### Tasks for Backend Teammate:
- [ ] **Enhance existing ECG endpoints** to support AI integration
- [ ] **Add AI processing triggers** on ECG upload
- [ ] **Implement ECG file validation**
- [ ] **Add ECG metadata management**
- [ ] **Create ECG search functionality**

---

## 🗄️ Database Schema Requirements

### New Tables Needed:

#### 1. **AI Diagnoses Table**
```sql
CREATE TABLE ai_diagnoses (
    id VARCHAR(50) PRIMARY KEY,
    ecg_file_id VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,2),
    primary_diagnosis TEXT,
    secondary_diagnoses JSON,
    highlighted_leads JSON,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **Doctor Feedback Table**
```sql
CREATE TABLE doctor_feedback (
    id VARCHAR(50) PRIMARY KEY,
    ecg_file_id VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    doctor_id VARCHAR(50) NOT NULL,
    ai_diagnosis_id VARCHAR(50),
    approved BOOLEAN,
    comment TEXT,
    confidence_rating INTEGER,
    corrections JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **PDF Reports Table**
```sql
CREATE TABLE pdf_reports (
    id VARCHAR(50) PRIMARY KEY,
    ecg_file_id VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    doctor_id VARCHAR(50) NOT NULL,
    report_data JSON,
    template_used VARCHAR(100),
    file_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Integration Points

### 1. **DNN Module Integration**
**Location**: `AIClinic-Engine/DNN Module/`
**Tasks**:
- [ ] **Integrate existing model** (`model.npy`) into FastAPI
- [ ] **Create prediction service** using the trained model
- [ ] **Add model versioning** system
- [ ] **Implement model performance** monitoring
- [ ] **Add model retraining** pipeline

### 2. **Orthanc PACS Integration**
**Location**: `AIClinic-server/AI_server/`
**Tasks**:
- [ ] **Enhance DICOM processing** to trigger AI analysis
- [ ] **Add ECG extraction** from DICOM files
- [ ] **Implement real-time** AI processing
- [ ] **Create PACS notification** system

### 3. **Authentication & Authorization**
**Tasks**:
- [ ] **Add role-based access** for AI features
- [ ] **Implement audit logging** for all AI operations
- [ ] **Add user permissions** for feedback submission
- [ ] **Create admin dashboard** for AI management

---

## 📊 Task Breakdown by Teammate Role

### **AI/ML Teammate** (Estimated: 60 hours)
- [ ] **DNN Model Integration** (20h)
- [ ] **AI Diagnosis Service** (15h)
- [ ] **Confidence Scoring** (10h)
- [ ] **Lead Highlighting** (10h)
- [ ] **Model Performance Monitoring** (5h)

### **Backend Teammate** (Estimated: 80 hours)
- [ ] **Feedback API Development** (20h)
- [ ] **PDF Generation Service** (25h)
- [ ] **Database Schema Design** (15h)
- [ ] **API Integration & Testing** (15h)
- [ ] **Performance Optimization** (5h)

### **DevOps/Infrastructure Teammate** (Estimated: 40 hours)
- [ ] **Model Deployment** (15h)
- [ ] **API Gateway Configuration** (10h)
- [ ] **Database Migration** (10h)
- [ ] **Monitoring & Logging** (5h)

---

## 🚀 Integration Timeline

### **Phase 1: Core AI Integration** (Week 1-2)
- [ ] DNN model integration
- [ ] Basic AI diagnosis endpoints
- [ ] Database schema creation

### **Phase 2: Feedback System** (Week 3-4)
- [ ] Doctor feedback API
- [ ] Feedback database
- [ ] Integration testing

### **Phase 3: PDF Reports** (Week 5-6)
- [ ] PDF generation service
- [ ] Report templates
- [ ] Full integration testing

### **Phase 4: Production Deployment** (Week 7-8)
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Production deployment

---

## 🎯 Success Criteria

### **Frontend Integration Success:**
- [ ] **AI Interpretation UI** works with real AI diagnoses
- [ ] **Doctor Feedback Interface** saves feedback to database
- [ ] **PDF Report Export** generates actual reports
- [ ] **All components** integrate seamlessly
- [ ] **Performance** meets clinical requirements

### **Backend Requirements:**
- [ ] **API response times** < 2 seconds
- [ ] **AI processing** < 30 seconds
- [ ] **PDF generation** < 10 seconds
- [ ] **99.9% uptime** for critical endpoints
- [ ] **Comprehensive error handling**

---

## 📞 Communication Points

### **Weekly Sync Meetings:**
- **Monday**: Review progress and blockers
- **Wednesday**: Technical integration check
- **Friday**: Demo and feedback session

### **Integration Testing:**
- **Frontend-Backend Integration**: Test all API endpoints
- **End-to-End Testing**: Complete workflow testing
- **Performance Testing**: Load and stress testing
- **User Acceptance Testing**: Clinical workflow validation

---

## 🎉 Expected Outcome

Once these backend tasks are completed, your frontend deliverables will be:

1. **Fully Functional** with real backend integration
2. **Production Ready** for clinical use
3. **Performance Optimized** for healthcare workflows
4. **Completely Integrated** with the existing system
5. **Ready for Demo** to stakeholders

**Total Backend Work Required: ~180 hours**
**Your Frontend Work: 150 hours (COMPLETED)**

This creates a complete, functional AI Clinical Decision Support system! 🚀 
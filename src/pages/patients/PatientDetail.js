import React, { useState, useEffect } from 'react';

import { Card, Descriptions, Button, Space, Upload, List, Tag, message, Modal, Form, Input, Select, DatePicker, Tooltip, Typography, Progress, Checkbox, Popconfirm } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { UploadOutlined, EditOutlined, DeleteOutlined, CopyOutlined, UserOutlined, MailOutlined, IdcardOutlined, DatabaseOutlined, ClockCircleOutlined, NumberOutlined, EyeOutlined, ExperimentOutlined, BarChartOutlined, FileTextOutlined, CalendarOutlined, HeartOutlined, MessageOutlined } from '@ant-design/icons';

import styled from '@emotion/styled';
import { patientsApi } from '../../services/api/patients';
import { aiDiagnosisAPI } from '../../services/api/ecg';
import request from '../../services/api/request';
import { usersApi } from '../../services/api/users';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
const PERTH_TZ = 'Australia/Perth';



const PageContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .ant-upload-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .ecg-file-list {
    margin-top: 24px;
  }

  .file-actions {
    display: flex;
    gap: 8px;
  }
`;

const PatientDetail = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [patient, setPatient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [ecgFiles, setEcgFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState({});
  const [diagnosisLoading, setDiagnosisLoading] = useState({});
  const [renamedFiles, setRenamedFiles] = useState(new Map()); // Store renamed filenames

  // Persist/restore mapping to survive page refresh
  const STORAGE_KEY = 'ecgRenamedFiles';
  const loadRenamedMapFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Map();
      const obj = JSON.parse(raw);
      return new Map(Object.entries(obj));
    } catch (_) {
      return new Map();
    }
  };

  const saveRenamedMapToStorage = (map) => {
    try {
      const obj = Object.fromEntries(map.entries());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (_) { }
  };

  useEffect(() => {
    const initial = loadRenamedMapFromStorage();
    if (initial.size > 0) {
      setRenamedFiles(initial);
    }
  }, []);


  const fetchPatient = async () => {
    try {
      setLoading(true);
      const data = await patientsApi.getPatient(patientId);
      setPatient(data);
    } catch (error) {
      message.error('Failed to fetch patient details');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchEcgFiles = async () => {
    try {
      // Ensure the list shows a loading spinner instead of "No data" while fetching
      setLoading(true);
      if (!patient || !patient.id) return;
      const response = await patientsApi.getPatientEcgFiles(patient.id);
      // compute stable display names for each file and store on the objects
      const withDisplayNames = Array.isArray(response)
        ? response.map(f => ({ ...f, display_filename: computeDisplayFilename(f, patient?.name) }))
        : response;
      setEcgFiles(withDisplayNames);

      // Only generate renamed filenames for files that don't already have mappings
      if (response && Array.isArray(response)) {
        const newRenamedFiles = new Map();
        response.forEach(file => {
          const fileId = file.file_id || file.id || file.uuid || file.fileId;
          if (fileId && file.filename) {
            // Check if we already have a mapping for this file
            const existingMapping = renamedFiles.get(fileId);
            if (!existingMapping) {
              // Only generate if no existing mapping
              const disease = extractDiseaseFromFilename(file.filename);
              const cleanPatientName = String(patient.name || 'patient')
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .toLowerCase();
              let newName = `${cleanPatientName}_${disease}`;
              if (!/\.dcm$/i.test(newName)) newName += '.dcm';
              newRenamedFiles.set(fileId, newName);
            }
          }
        });
        // Only add new mappings, don't override existing ones
        if (newRenamedFiles.size > 0) {
          setRenamedFiles(prev => {
            const next = new Map([...prev, ...newRenamedFiles]);
            saveRenamedMapToStorage(next);
            return next;
          });
          console.log('Generated renamed filenames for files without existing mappings:', newRenamedFiles);
        }
      }
    } catch (error) {
      message.error('Failed to fetch ECG files');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  useEffect(() => {
    if (patient) {
      fetchEcgFiles();
    }
  }, [patient]);

  // Fetch signed-in user info for display (username, email, id)
  useEffect(() => {
    const ud = JSON.parse(localStorage.getItem('userData') || '{}');
    const uid = ud.user_id;
    if (!uid) return;
    (async () => {
      try {
        const u = await usersApi.getUserDetail(uid);
        setCurrentUser(u);
      } catch (e) {
        // best-effort; do not block page
      }
    })();
  }, []);

  // Load mock AI diagnosis data for existing instance IDs
  useEffect(() => {
    if (ecgFiles.length > 0) {
      ecgFiles.forEach(file => {
        if (file.instanceIDs && file.instanceIDs.length > 0) {
          const instanceId = file.instanceIDs[0];
          if (mockAiDiagnosisData[instanceId]) {
            setAiDiagnosis(prev => ({ ...prev, [instanceId]: mockAiDiagnosisData[instanceId] }));
          }
        }
      });
    }
  }, [ecgFiles]);

  const handleEditPatient = async (values) => {
    try {
      await patientsApi.updatePatient(patientId, values);
      message.success('Patient information updated successfully');
      setEditModalVisible(false);
      fetchPatient();
    } catch (error) {
      message.error('Failed to update patient information');
    }
  };

  const handleEditFile = async (values) => {
    try {
      if (!patient || !patient.id) {
        message.error('Patient ID not found');
        return;
      }
      await patientsApi.updateEcgFile(patient.id, selectedFile.id, values);
      message.success('ECG file updated successfully');
      setFileModalVisible(false);
      fetchEcgFiles();
    } catch (error) {
      message.error('Failed to update ECG file');
    }
  };

  const handleDeleteFile = async (fileId, userIdOverride) => {
    try {
      const userIdToUse = userIdOverride || (patient && patient.id);
      if (!userIdToUse) {
        message.error('Patient ID not found');
        return;
      }
      await patientsApi.deleteEcgFile(userIdToUse, fileId);
      message.success('ECG file deleted successfully');
      fetchEcgFiles();
    } catch (error) {
      message.error('Failed to delete ECG file');
    }
  };

  // AI Diagnosis Functions - Connected to AIClinic Engine
  const requestAiDiagnosis = async (instanceId) => {
    if (!instanceId) {
      message.error('No instance ID available for analysis');
      return;
    }

    try {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: true }));
      message.info('Generating AI diagnosis from AIClinic engine...');

      // Call the real AIClinic engine API
      const response = await aiDiagnosisAPI.requestDiagnosis(instanceId);

      console.log('AIClinic engine response:', response);

      // Transform the AIClinic engine response to our display format
      const transformedData = transformAIClinicResponse(response, instanceId);

      setAiDiagnosis(prev => ({ ...prev, [instanceId]: transformedData }));

      message.success('AI diagnosis completed successfully!');
    } catch (error) {
      console.error('Error requesting AI diagnosis:', error);

      // Fallback to mock data if AI server is not available
      if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
        message.warning('AI server not available, using demo data');
        const mockData = mockAiDiagnosisData[instanceId] || generateFallbackData(instanceId);
        setAiDiagnosis(prev => ({ ...prev, [instanceId]: mockData }));
      } else {
        message.error('Failed to generate AI diagnosis');
      }
    } finally {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  // Transform AIClinic engine response to display format
  const transformAIClinicResponse = (response, instanceId) => {
    const predictions = response.predictions || {};
    const originalModel = predictions.original_dnn_model || {};
    const resnetModel = predictions.resnet_fine_tuned_model || {};

    // Get the top predictions
    const topPredictions = Object.entries(originalModel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const diagnoses = topPredictions.map(([disease, confidence], index) => {
      const config = getDiseaseConfig(disease);
      return {
        "title": `${config.name} (${instanceId.slice(-8)})`,
        "lead_name": "II",
        "report_text": `AI analysis detected ${config.name} with ${(confidence * 100).toFixed(1)}% confidence. This is based on the DNN model analysis of the ECG waveform.`,
        "metrics": {
          "confidence_score": confidence,
          "disease_probability": (confidence * 100).toFixed(1),
          "model_type": "DNN",
          "processing_time_seconds": 2.5
        },
        "image_paths": [`/static/ecg_analysis_results/${instanceId.slice(-8)}_${disease}/analysis.png`],
        "processing_time_seconds": 2.5,
        "instance_id": instanceId,
        "disease": disease,
        "confidence": Math.round(confidence * 100),
        "risk_level": config.risk
      };
    });

    return {
      "diagnoses": diagnoses,
      "summary": {
        "total_diagnoses": diagnoses.length,
        "primary_diagnosis": diagnoses[0]?.disease || "NORM",
        "overall_confidence": Math.round(Math.max(...diagnoses.map(d => d.confidence)) || 0),
        "processing_time": 2.5,
        "risk_assessment": diagnoses[0]?.risk_level || "low",
        "original_response": response
      }
    };
  };

  // Generate fallback data when AI server is not available
  const generateFallbackData = (instanceId) => {
    return {
      "diagnoses": [
        {
          "title": `Demo Analysis (${instanceId.slice(-8)})`,
          "lead_name": "II",
          "report_text": "Demo analysis completed successfully. QRS duration analysis shows normal parameters. Rhythm analysis indicates regular sinus rhythm. No significant abnormalities detected in this ECG recording.",
          "metrics": {
            "qrs_mean_s": 0.085,
            "rr_regularity": 0.95,
            "p_wave_presence": 0.98,
            "processing_time_seconds": 1.2
          },
          "image_paths": [`/static/ecg_analysis_results/${instanceId.slice(-8)}/analysis.png`],
          "processing_time_seconds": 1.2,
          "instance_id": instanceId,
          "disease": "NORM",
          "confidence": 92,
          "risk_level": "low"
        }
      ],
      "summary": {
        "total_diagnoses": 1,
        "primary_diagnosis": "NORM",
        "overall_confidence": 92,
        "processing_time": 1.2,
        "risk_assessment": "low"
      }
    };
  };

  const fetchAiDiagnosis = async (instanceId) => {
    if (!instanceId) return;

    try {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: true }));

      // Try to get real AI diagnosis first
      try {
        const response = await aiDiagnosisAPI.getDiagnosis(instanceId);
        const transformedData = transformAIClinicResponse(response, instanceId);
        setAiDiagnosis(prev => ({ ...prev, [instanceId]: transformedData }));
      } catch (error) {
        console.log('Real AI diagnosis not available, using mock data');
        // Fallback to mock data
        const mockData = mockAiDiagnosisData[instanceId];
        if (mockData) {
          setAiDiagnosis(prev => ({ ...prev, [instanceId]: mockData }));
        }
      }
    } catch (error) {
      console.error('Error fetching AI diagnosis:', error);
      message.error(`Failed to load AI diagnosis for ${instanceId}`);
    } finally {
      setDiagnosisLoading(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  // XAI Interpretation function
  // XAI interpretation request function is no longer used from Patient Detail page

  const KNOWN_DISEASES = [];

  const openXaiSelector = (instanceId) => {
    // Directly navigate to XAI page; selection UI removed
    navigate(`/xai/${instanceId}`);
  };


  // Removed multi-instance selection; interpret operates on one instance at a time

  // confirmXaiSelector removed along with selection UI

  // Extract disease information from filename
  const extractDiseaseFromFilename = (filename) => {
    // Remove .dcm extension
    const nameWithoutExt = filename.replace(/\.dcm$/i, '');

    // Split by underscore and get the last part (disease code)
    const parts = nameWithoutExt.split('_');
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }

    // If no underscore found, try to extract meaningful info from filename
    if (nameWithoutExt.toLowerCase().includes('aflt')) {
      return 'AFLT';
    } else if (nameWithoutExt.toLowerCase().includes('afib')) {
      return 'AFIB';
    } else if (nameWithoutExt.toLowerCase().includes('normal')) {
      return 'NORMAL';
    } else if (nameWithoutExt.toLowerCase().includes('lbbb')) {
      return 'LBBB';
    } else if (nameWithoutExt.toLowerCase().includes('rbbb')) {
      return 'RBBB';
    }

    // If no specific pattern found, return 'ECG' as default
    return 'ECG';
  };

  // Try to read original_filename from file.content (may be JSON or JSON-like string)
  const extractOriginalFilenameFromContent = (rawContent) => {
    if (!rawContent) return null;
    const text = String(rawContent).trim();
    const tryParsers = [
      // direct JSON
      (t) => {
        try { return JSON.parse(t); } catch (_) { return null; }
      },
      // single-quotes / unquoted keys normalization
      (t) => {
        try {
          const normalized = t
            .replace(/\n/g, ' ')
            .replace(/'/g, '"')
            .replace(/([,{\s])([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
          return JSON.parse(normalized);
        } catch (_) { return null; }
      }
    ];
    for (const p of tryParsers) {
      const obj = p(text);
      if (obj && typeof obj === 'object') {
        if (obj.original_filename) return String(obj.original_filename);
        if (obj.filename) return String(obj.filename);
      }
    }
    // Last resort: regex extraction original_filename: 'xxx.dcm'
    const m = text.match(/original_filename\s*[:=]\s*['\"]([^'\"]+\.dcm)['\"]/i);
    return m ? m[1] : null;
  };

  // Compute a stable display name for a file
  const computeDisplayFilename = (file, patientName) => {
    const fileId = file?.file_id || file?.id || file?.uuid || file?.fileId;
    // 1) original name inside content, if present
    const fromContent = extractOriginalFilenameFromContent(file?.content);
    if (fromContent) return fromContent;
    // 2) name stored in our mapping (e.g., from immediate upload flow)
    const fromMap = fileId ? renamedFiles.get(fileId) : null;
    if (fromMap) return fromMap;
    // 3) derive from current filename
    if (file?.filename) {
      const disease = extractDiseaseFromFilename(file.filename);
      const cleanPatientName = String(patientName || 'patient')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
      let newName = `${cleanPatientName}_${disease}`;
      if (!/\.dcm$/i.test(newName)) newName += '.dcm';
      return newName;
    }
    // 4) fallback
    return 'ecg.dcm';
  };

  // Get display filename (renamed if available, otherwise original)
  const getDisplayFilename = (file) => {
    return file.display_filename || computeDisplayFilename(file, patient?.name);
  };

  // Rename DCM file with patient name and disease, ensure proper extension and MIME type
  const renameDcmFile = (file, patientName) => {
    const disease = extractDiseaseFromFilename(file.name);

    // Clean patient name: remove special characters, replace spaces with underscores
    const cleanPatientName = String(patientName || 'patient')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();

    // Ensure `.dcm` extension
    let newName = `${cleanPatientName}_${disease}`;
    if (!/\.dcm$/i.test(newName)) newName += '.dcm';

    // Always send with DICOM MIME type so backend can recognize it
    return new File([file], newName, {
      type: 'application/dicom',
      lastModified: file.lastModified || Date.now()
    });
  };

  const handleUpload = async (file) => {
    try {
      if (!patient || !patient.id) {
        message.error('Patient ID not found');
        return false;
      }

      // Rename the file before uploading
      const renamedFile = renameDcmFile(file, patient.name);

      console.log(`Uploading file as: ${renamedFile.name}`);

      const response = await patientsApi.uploadEcgFile(patient.id, renamedFile);

      console.log('Upload response:', response);

      // Store the renamed filename mapping
      // Try different possible field names for file ID
      const fileId = response?.file_id || response?.id || response?.uuid || response?.fileId;
      if (response && fileId) {
        setRenamedFiles(prev => {
          const next = new Map(prev).set(fileId, renamedFile.name);
          saveRenamedMapToStorage(next);
          return next;
        });
        console.log('Stored renamed file mapping:', fileId, renamedFile.name);
      } else {
        console.log('No file ID found in response, response structure:', Object.keys(response || {}));
        console.log('Response content:', response);
      }

      // After upload, immediately fetch the latest files and map the newest item to our renamed name
      try {
        const latestListRaw = await patientsApi.getPatientEcgFiles(patient.id);
        let latestList = Array.isArray(latestListRaw)
          ? latestListRaw.map(f => ({ ...f }))
          : latestListRaw;
        if (Array.isArray(latestList) && latestList.length > 0) {
          const uploadedCreatedAt = response?.created_at;
          // pick the file with matching created_at, else the newest by created_at
          let candidate = null;
          if (uploadedCreatedAt) {
            candidate = latestList.find(f => String(f.created_at) === String(uploadedCreatedAt));
          }
          if (!candidate) {
            candidate = [...latestList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          }
          const candidateId = candidate?.file_id || candidate?.id || candidate?.uuid || candidate?.fileId;
          if (candidateId) {
            // Update mapping first
            setRenamedFiles(prev => {
              const next = new Map(prev).set(candidateId, renamedFile.name);
              saveRenamedMapToStorage(next);
              return next;
            });
            console.log('Mapped newest fetched file to renamed name:', candidateId, renamedFile.name);
            // Recompute display names with the new mapping applied
            const listWithNames = latestList.map(f => {
              const id = f.file_id || f.id || f.uuid || f.fileId;
              const display = id === candidateId ? renamedFile.name : computeDisplayFilename(f, patient?.name);
              return { ...f, display_filename: display };
            });
            setEcgFiles(listWithNames);
          } else {
            // No candidate, compute names normally
            const listWithNames = latestList.map(f => ({ ...f, display_filename: computeDisplayFilename(f, patient?.name) }));
            setEcgFiles(listWithNames);
          }
        }
      } catch (e) {
        console.log('Post-upload fetch mapping skipped due to error:', e);
      }

      message.success('ECG file uploaded successfully');
      return false; // Prevent default upload behavior
    } catch (error) {
      message.error('Failed to upload ECG file');
      return false;
    }
  };

  // Mock AI Diagnosis Data (based on your API response structure)
  const mockAiDiagnosisData = {
    "111111111111111111111": {
      "diagnoses": [
        {
          "title": "Left Bundle Branch Block (15592_hr)",
          "lead_name": "II",
          "report_text": "QRS duration is considered prolonged if > 0.12 seconds (typically). Refined Estimation: Mean=0.134s, Min=0.112s, Max=0.140s. 11 out of 12 QRS durations (Refined Estimation > 0.12s).",
          "metrics": {
            "qrs_mean_s": 0.13400000000000004,
            "wide_qrs_count": 11,
            "total_qrs_count": 12
          },
          "image_paths": ["/static/ecg_analysis_results/15592_hr_LBBB/lbbb_qrs_analysis.png"],
          "processing_time_seconds": 1.43,
          "instance_id": "111111111111111111111",
          "disease": "LBBB",
          "confidence": 94,
          "risk_level": "high"
        },
        {
          "title": "Atrial Flutter (00001_lr.dcm)",
          "lead_name": "II",
          "report_text": "P-waves typically absent/fibrillatory. Yellow boxes: Inferred P-wave regions. RR histogram shows 'irregularly irregular' rhythm.",
          "metrics": {
            "rr_variability": 0.45,
            "p_wave_absence": 0.92,
            "irregular_rhythm": 0.88
          },
          "image_paths": ["/static/ecg_analysis_results/00001_lr_AFLT/aflt_rhythm_analysis.png"],
          "processing_time_seconds": 2.1,
          "instance_id": "111111111111111111111",
          "disease": "AFLT",
          "confidence": 87,
          "risk_level": "medium"
        }
      ],
      "summary": {
        "total_diagnoses": 2,
        "primary_diagnosis": "LBBB",
        "overall_confidence": 91,
        "processing_time": 3.53,
        "risk_assessment": "high"
      }
    },
    "222222222222222222222": {
      "diagnoses": [
        {
          "title": "Normal Sinus Rhythm (03041_hr)",
          "lead_name": "II",
          "report_text": "Regular P-waves present. Normal QRS duration. Consistent RR intervals. No significant abnormalities detected.",
          "metrics": {
            "qrs_mean_s": 0.085,
            "rr_regularity": 0.95,
            "p_wave_presence": 0.98
          },
          "image_paths": ["/static/ecg_analysis_results/03041_hr_NR/normal_rhythm_analysis.png"],
          "processing_time_seconds": 0.8,
          "instance_id": "222222222222222222222",
          "disease": "NORM",
          "confidence": 96,
          "risk_level": "low"
        }
      ],
      "summary": {
        "total_diagnoses": 1,
        "primary_diagnosis": "NORM",
        "overall_confidence": 96,
        "processing_time": 0.8,
        "risk_assessment": "low"
      }
    },
    "333333333333333333333": {
      "diagnoses": [
        {
          "title": "First-degree AV Block (00234_lr)",
          "lead_name": "II",
          "report_text": "PR interval prolonged (> 0.20s). Consistent PR intervals. Normal QRS complexes. No dropped beats.",
          "metrics": {
            "pr_interval_s": 0.24,
            "pr_consistency": 0.92,
            "dropped_beats": 0
          },
          "image_paths": ["/static/ecg_analysis_results/00234_lr_1dAVB/av_block_analysis.png"],
          "processing_time_seconds": 1.2,
          "instance_id": "333333333333333333333",
          "disease": "1dAVB",
          "confidence": 89,
          "risk_level": "medium"
        }
      ],
      "summary": {
        "total_diagnoses": 1,
        "primary_diagnosis": "1dAVB",
        "overall_confidence": 89,
        "processing_time": 1.2,
        "risk_assessment": "medium"
      }
    }
  };

  // Disease configuration based on Professor Sonny's recommendations
  const diseaseConfig = {
    "NORM": { name: "Normal", color: "#52c41a", icon: "💚", risk: "low" },
    "NR": { name: "Normal", color: "#52c41a", icon: "💚", risk: "low" },
    "1dAVB": { name: "First-degree AV Block", color: "#faad14", icon: "🟡", risk: "medium" },
    "2dAVB": { name: "Second-degree AV Block", color: "#ff7a45", icon: "🟠", risk: "high" },
    "3dAVB": { name: "Third-degree AV Block", color: "#ff4d4f", icon: "🔴", risk: "critical" },
    "AFIB": { name: "Atrial Fibrillation", color: "#ff7a45", icon: "🟠", risk: "high" },
    "AF": { name: "Atrial Fibrillation", color: "#ff7a45", icon: "🟠", risk: "high" },
    "AFLT": { name: "Atrial Flutter", color: "#ff7a45", icon: "🟠", risk: "high" },
    "LBBB": { name: "Left Bundle Branch Block", color: "#ff4d4f", icon: "🔴", risk: "high" },
    "RBBB": { name: "Right Bundle Branch Block", color: "#ff7a45", icon: "🟠", risk: "medium" },
    "STACH": { name: "Sinus Tachycardia", color: "#faad14", icon: "🟡", risk: "medium" },
    "SBRAD": { name: "Sinus Bradycardia", color: "#faad14", icon: "🟡", risk: "medium" },
    "PAC": { name: "Premature Atrial Complex", color: "#faad14", icon: "🟡", risk: "low" },
    "PVC": { name: "Premature Ventricular Complex", color: "#ff7a45", icon: "🟠", risk: "medium" },
    "ST": { name: "ST Segment Changes", color: "#ff4d4f", icon: "🔴", risk: "high" }
  };

  // Normalize diseases to backend-supported codes
  const DISEASE_CODE_MAP = {
    // Canonical names
    AFIB: 'AFIB',
    STACH: 'STACH',
    LBBB: 'LBBB',
    RBBB: 'RBBB',
    '1dAVB': '1dAVB',
    '2dAVB': '2dAVB',
    SBRAD: 'SB',
    AFLT: 'AFLT',
    NORM: 'NORM',
    // Synonyms from various sources (map to canonical)
    AF: 'AFIB',
    ST: 'STACH',
    SB: 'SBRAD',
    NR: 'NORM',
    NSR: 'NORM',
    AFL: 'AFLT',
    '1AVB': '1dAVB',
    '2AVB': '2dAVB',
    '3AVB': '3dAVB',
    PAC: 'PAC',
    PVC: 'PVC'
  };
  const ALLOWED_DISEASES = new Set(['1dAVB', '2dAVB', '3dAVB', 'RBBB', 'LBBB', 'SB', 'AFIB', 'STACH', 'AFLT', 'NORM', 'PAC', 'PVC']);
  const normalizeDiseases = (arr) => {
    const input = Array.isArray(arr) ? arr : [];
    const mapped = input.map(d => DISEASE_CODE_MAP[d] || d);
    const filtered = mapped.filter(d => ALLOWED_DISEASES.has(d));
    return Array.from(new Set(filtered));
  };

  // Get disease config
  const getDiseaseConfig = (disease) => {
    return diseaseConfig[disease] || { name: disease, color: "#8c8c8c", icon: "❓", risk: "unknown" };
  };

  // Get risk level color
  const getRiskColor = (risk) => {
    const colors = {
      "low": "#52c41a",
      "medium": "#faad14",
      "high": "#ff7a45",
      "critical": "#ff4d4f",
      "unknown": "#8c8c8c"
    };
    return colors[risk] || colors.unknown;
  };

  if (!patient) {
    return null;
  }

  return (
    <PageContainer>
      {/* Resources Summary */}
      {Array.isArray(ecgFiles) && ecgFiles.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DatabaseOutlined style={{ fontSize: 18, color: '#1890ff' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>ECG Files</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{ecgFiles.length}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <NumberOutlined style={{ fontSize: 18, color: '#13c2c2' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Total Instances</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{ecgFiles.reduce((sum, f) => sum + (Array.isArray(f.instanceIDs) ? f.instanceIDs.length : 0), 0)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClockCircleOutlined style={{ fontSize: 18, color: '#faad14' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Last Upload (Perth)</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {(() => {
                    const last = ecgFiles
                      .slice()
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                    return last ? `${dayjs(last.created_at).tz(PERTH_TZ).format('YYYY-MM-DD HH:mm:ss')} (${PERTH_TZ})` : '-';
                  })()}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
      {/* Signed-in user card removed per request */}
      <Card
        title="Patient Information"
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({
                name: patient.name,
                gender: patient.gender,
                birth_date: dayjs(patient.birth_date)
              });
              setEditModalVisible(true);
            }}
          >
            Edit
          </Button>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Patient ID">{patient.patient_id}</Descriptions.Item>
          <Descriptions.Item label="Name">{patient.name}</Descriptions.Item>
          <Descriptions.Item label="Gender">{patient.gender}</Descriptions.Item>
          <Descriptions.Item label="Birth Date">
            {dayjs(patient.birth_date).format('YYYY-MM-DD')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="ECG Files & AI Diagnosis" style={{ marginTop: 24 }}>
        <Upload
          customRequest={({ file }) => handleUpload(file)}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />}>Upload ECG File</Button>
        </Upload>

        {/* Multi-instance interpret controls removed */}

        <List
          className="ecg-file-list"
          loading={loading}
          locale={{ emptyText: loading ? null : 'No data' }}
          dataSource={ecgFiles}
          renderItem={(file) => (
            <List.Item
            >
              <List.Item.Meta
                title={getDisplayFilename(file)}
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>created at: {dayjs(file.created_at).tz(PERTH_TZ).format('YYYY-MM-DD HH:mm:ss')} ({PERTH_TZ})</div>
                    {file.content && (
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: '16px', color: '#1890ff' }}>DICOM Metadata:</div>
                        <div>
                          {(() => {
                            try {
                              // Get the content and parse it
                              const content = String(file.content || '').trim();
                              let data = {};

                              try {
                                // Try to parse as JSON
                                data = JSON.parse(content.replace(/'/g, '"').replace(/([,{\s])([A-Za-z0-9_]+)\s*:/g, '$1"$2":'));
                              } catch (e) {
                                // If parsing fails, extract fields using regex
                                const fieldRegex = /'([^']+)':\s*'([^']+)'/g;
                                let match;
                                while ((match = fieldRegex.exec(content)) !== null) {
                                  data[match[1]] = match[2];
                                }
                              }

                              // These are the only fields we want to show
                              const fieldsToShow = [
                                'Manufacturer',
                                'PatientBirthDate',
                                'PatientComments',
                                'PatientName',
                                'PatientSex',
                                'StudyTime',
                                'StudyDate'
                              ];

                              // Filter out PatientComments to display separately
                              const regularFields = fieldsToShow.filter(field => field !== 'PatientComments');
                              const patientComments = data['PatientComments'] || '';

                              return (
                                <div>
                                  {/* PatientComments with special emphasis - MOVED TO TOP */}
                                  <div style={{
                                    border: '2px solid #1890ff',
                                    borderRadius: '4px',
                                    padding: '16px',
                                    backgroundColor: '#f0f7ff',
                                    marginBottom: '20px'
                                  }}>
                                    <div style={{
                                      fontWeight: 'bold',
                                      fontSize: '16px',
                                      marginBottom: '12px',
                                      color: '#1890ff',
                                      borderBottom: '1px solid #1890ff',
                                      paddingBottom: '8px'
                                    }}>
                                      Patient Comments (AI Predictions)
                                    </div>
                                    <div style={{
                                      backgroundColor: 'white',
                                      padding: '12px',
                                      border: '1px solid #d9d9d9',
                                      borderRadius: '4px'
                                    }}>
                                      {(() => {
                                        if (!patientComments) return 'No comments available';

                                        // Parse the PatientComments to extract disease:probability pairs
                                        const parts = patientComments.split('|');
                                        const predictions = [];

                                        // Process each part (usually first part is main predictions, second part is ResNet)
                                        parts.forEach((part, partIndex) => {
                                          const isResNet = part.includes('ResNet');
                                          const title = isResNet ? 'ResNet Model Predictions' : '1D Model Results';

                                          // Extract the disease:probability pairs
                                          const pairs = [];
                                          const regex = /([A-Z0-9dAVB]+):(\d+\.\d+)/g;
                                          let match;

                                          while ((match = regex.exec(part)) !== null) {
                                            const disease = match[1];
                                            const probability = parseFloat(match[2]);

                                            // Only include non-zero probabilities
                                            if (probability > 0.01) {
                                              pairs.push({ disease, probability });
                                            }
                                          }

                                          // Sort by probability in descending order
                                          pairs.sort((a, b) => b.probability - a.probability);

                                          if (pairs.length > 0.01) {
                                            predictions.push({ title, pairs });
                                          }
                                        });
                                        return (
                                          <div>
                                            <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', justifyContent: 'space-between' }}>
                                              {predictions.map((prediction, idx) => (
                                                <div key={idx} style={{ flex: '1', width: '48%', marginBottom: '16px' }}>
                                                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1890ff' }}>
                                                    {prediction.title}
                                                  </div>
                                                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                                    {prediction.pairs.map((pair, pairIdx) => {
                                                      // Calculate percentage and determine color
                                                      const percentage = Math.round(pair.probability * 100);
                                                      let color = '#52c41a'; // green for low values
                                                      if (percentage > 20) color = '#faad14'; // yellow for medium
                                                      if (percentage > 50) color = '#f5222d'; // red for high

                                                      return (
                                                        <div key={pairIdx} style={{
                                                          backgroundColor: '#f9f9f9',
                                                          border: `1px solid ${color}`,
                                                          borderRadius: '3px',
                                                          padding: '6px 8px',
                                                          minWidth: '80px',
                                                          flex: '1 0 auto',
                                                          marginBottom: '4px'
                                                        }}>
                                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{pair.disease}</span>
                                                            <span style={{ color, fontWeight: 'bold', fontSize: '12px' }}>{percentage}%</span>
                                                          </div>
                                                          <Progress
                                                            percent={percentage}
                                                            size="small"
                                                            showInfo={false}
                                                            strokeColor={color}
                                                          />
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>

                                            {/* Show raw data in small text at bottom */}
                                            <div style={{
                                              marginTop: '12px',
                                              fontSize: '12px',
                                              color: '#999',
                                              fontFamily: 'monospace',
                                              padding: '8px',
                                              backgroundColor: '#f5f5f5',
                                              borderRadius: '4px'
                                            }}>
                                              Raw: {patientComments}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  {/* Regular fields in a table */}
                                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', marginBottom: '20px' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#f0f0f0' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ccc' }}>Field</th>
                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ccc' }}>Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {regularFields.map((field, index) => (
                                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                                          <td style={{ padding: '8px', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>{field}</td>
                                          <td style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>
                                            {data[field] || '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            } catch (error) {
                              // If anything goes wrong, just show the raw content
                              return <div>{String(file.content || '')}</div>;
                            }

                            // The table is already created above
                            return null;
                          })()}
                        </div>
                      </div>
                    )}
                    {file.tags && (
                      <div>
                        Tags:
                        {(Array.isArray(file.tags) ? file.tags : String(file.tags).split(',')).map(tag => (
                          <Tag key={tag} style={{ marginLeft: 8 }}>{typeof tag === 'string' ? tag.trim() : tag}</Tag>
                        ))}
                      </div>
                    )}
                    <div>Instance IDs:</div>
                    <List
                      size="small"
                      bordered
                      dataSource={file.instanceIDs || []}
                      renderItem={(instanceId) => (
                        <List.Item
                          actions={[
                            <Tooltip key="copy" title="Copy Instance ID">
                              <Button
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() => {
                                  navigator.clipboard.writeText(instanceId);
                                  message.success('Instance ID copied');
                                }}
                              />
                            </Tooltip>,
                            <Tooltip key="delete" title="Delete ECG File">
                              <Popconfirm
                                title="Are you sure you want to delete this ECG instance?"
                                okText="Delete"
                                okType="danger"
                                cancelText="Cancel"
                                onConfirm={() => handleDeleteFile(instanceId, file.user_id)}
                              >
                                <Button
                                  danger
                                  type="text"
                                  size="small"
                                  shape="circle"
                                  icon={<DeleteOutlined />}
                                />
                              </Popconfirm>
                            </Tooltip>,
                            <Tooltip key="view" title="Open ECG Viewer">
                              <Button
                                type="primary"
                                size="small"
                                shape="round"
                                icon={<EyeOutlined />}
                                onClick={() => navigate(`/ecg-view/${file.user_id}/${instanceId}`)}
                              >
                                View ECG Waveform
                              </Button>
                            </Tooltip>,
                          ]}
                        >
                          <Tooltip title={instanceId}>
                            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                              <span
                                onClick={() => navigate(`/ecg-view/${file.user_id}/${instanceId}`)}
                                style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', color: '#1890ff' }}
                                title="Open ECG Viewer"
                              >
                                {instanceId.length > 12 ? `${instanceId.slice(0, 6)}…${instanceId.slice(-6)}` : instanceId}
                              </span>
                            </span>
                          </Tooltip>
                        </List.Item>
                      )}
                      style={{ maxHeight: '200px', overflow: 'auto' }}
                    />
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>


      {/* AI Diagnosis section fully removed */}


      <Modal
        title="Edit Patient Information"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditPatient}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="gender"
            label="Gender"
            rules={[{ required: true, message: 'Please select gender' }]}
          >
            <Select>
              <Select.Option value="M">Male</Select.Option>
              <Select.Option value="F">Female</Select.Option>
              <Select.Option value="Others">Others</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="birth_date"
            label="Birth Date"
            rules={[{ required: true, message: 'Please select birth date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Update</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* XAI selection modal removed */}


      <Modal
        title="Edit ECG File"
        open={fileModalVisible}
        onCancel={() => setFileModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditFile}
        >
          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea />
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags"
            extra="Separate tags with commas"
          >
            <Input />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setFileModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Update</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PatientDetail;

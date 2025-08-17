"""
Professional Medical Audit Logging System for Healthcare Compliance
"""
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request
import hashlib
import json
from ..model.audit_log import AuditLogEntry

class AuditLog:
    @staticmethod
    def log_event(
        event_type: str,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        status: str = "success",
        username: Optional[str] = None,
        request: Optional[Request] = None,
        patient_id: Optional[str] = None,
        session_id: Optional[str] = None,
        data_classification: str = "SYSTEM",
        compliance_tags: Optional[str] = None,
        device_id: Optional[str] = None,
        ai_model_version: Optional[str] = None,
        confidence_score: Optional[str] = None,
        clinical_decision_support: bool = False,
        response_time: Optional[int] = None,
        error_code: Optional[str] = None
    ) -> None:
        """
        Log a professional medical audit event with healthcare compliance features.

        Args:
            event_type: Type of event (auth, data_access, api_call, patient_access, ai_diagnosis)
            user_id: ID of the user performing the action
            action: Action being performed (login, view, modify, delete)
            resource_type: Type of resource being accessed (patient, study, instance)
            resource_id: Optional ID of the resource being accessed
            details: Optional additional details about the event
            status: Outcome of the action (success, failure)
            username: Optional username for display
            request: FastAPI request object for additional context
            patient_id: Patient ID for HIPAA compliance tracking
            session_id: Session ID for user session tracking
            data_classification: PHI, PII, PUBLIC, SYSTEM
            compliance_tags: HIPAA, GDPR, etc.
            device_id: Medical device ID if applicable
            ai_model_version: AI model version for diagnosis tracking
            confidence_score: AI prediction confidence score
            clinical_decision_support: Whether this involves clinical decision support
            response_time: Response time in milliseconds
            error_code: Error code if action failed
        """
        # Extract request information
        ip_address = None
        user_agent = None
        location = None
        
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            # Could integrate with IP geolocation service here
            location = "Unknown"  # Placeholder for geolocation
        
        # Determine risk level based on action and data classification
        risk_level = AuditLog._calculate_risk_level(action, data_classification, event_type)
        
        # Check for potential anomalies
        anomaly_detected = AuditLog._detect_anomalies(action, user_id, patient_id, ip_address)
        
        # Generate hash for tamper detection
        hash_verification = AuditLog._generate_hash(user_id, action, resource_type, resource_id, timestamp=datetime.utcnow())
        
        # Create log entry document
        log_entry = AuditLogEntry(
            # Core audit fields
            timestamp=datetime.utcnow(),
            event_type=event_type,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            status=status,
            username=username,
            details=str(details) if details else "",
            request_info=request.headers if request else {},
            
            # Healthcare-specific fields
            patient_id=patient_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            location=location,
            
            # Compliance and security fields
            data_classification=data_classification,
            compliance_tags=compliance_tags or "HIPAA",
            retention_period=2190,  # 6 years for HIPAA
            is_encrypted=True,
            hash_verification=hash_verification,
            
            # Medical device and AI specific fields
            device_id=device_id,
            ai_model_version=ai_model_version,
            confidence_score=confidence_score,
            clinical_decision_support=clinical_decision_support,
            
            # Risk and security fields
            risk_level=risk_level,
            anomaly_detected=anomaly_detected,
            breach_indicators=AuditLog._check_breach_indicators(action, user_id, patient_id),
            
            # Performance and operational fields
            response_time=response_time,
            error_code=error_code,
            retry_count=0
        )

        # Save to MongoDB
        log_entry.save()

    @staticmethod
    def log_auth(
        user_id: str, 
        action: str, 
        status: str = "success", 
        details: Optional[Dict[str, Any]] = None, 
        username: Optional[str] = None,
        request: Optional[Request] = None,
        session_id: Optional[str] = None
    ):
        """Log authentication events with enhanced security tracking"""
        AuditLog.log_event(
            "auth", user_id, action, "user", None, details, status, username, 
            request, None, session_id, "SYSTEM", "HIPAA"
        )

    @staticmethod
    def log_data_access(
        user_id: str, 
        action: str, 
        resource_type: str, 
        resource_id: Optional[str] = None, 
        details: Optional[Dict[str, Any]] = None, 
        username: Optional[str] = None,
        request: Optional[Request] = None,
        patient_id: Optional[str] = None,
        session_id: Optional[str] = None,
        data_classification: str = "SYSTEM"
    ):
        """Log data access events with patient tracking"""
        AuditLog.log_event(
            "data_access", user_id, action, resource_type, resource_id, details, 
            "success", username, request, patient_id, session_id, data_classification, "HIPAA"
        )

    @staticmethod
    def log_patient_access(
        user_id: str,
        action: str,
        patient_id: str,
        details: Optional[Dict[str, Any]] = None,
        username: Optional[str] = None,
        request: Optional[Request] = None,
        session_id: Optional[str] = None
    ):
        """Log patient data access events (HIPAA requirement)"""
        AuditLog.log_event(
            "patient_access", user_id, action, "patient", patient_id, details,
            "success", username, request, patient_id, session_id, "PHI", "HIPAA"
        )

    @staticmethod
    def log_ai_diagnosis(
        user_id: str,
        action: str,
        patient_id: str,
        ai_model_version: str,
        confidence_score: str,
        details: Optional[Dict[str, Any]] = None,
        username: Optional[str] = None,
        request: Optional[Request] = None,
        session_id: Optional[str] = None,
        clinical_decision_support: bool = True
    ):
        """Log AI diagnosis events with model tracking"""
        AuditLog.log_event(
            "ai_diagnosis", user_id, action, "ai_diagnosis", patient_id, details,
            "success", username, request, patient_id, session_id, "PHI", "HIPAA",
            None, ai_model_version, confidence_score, clinical_decision_support
        )

    @staticmethod
    def log_api_call(
        user_id: str, 
        action: str, 
        api_endpoint: str, 
        details: Optional[Dict[str, Any]] = None, 
        username: Optional[str] = None,
        request: Optional[Request] = None,
        session_id: Optional[str] = None,
        response_time: Optional[int] = None
    ):
        """Log API usage events with performance tracking"""
        AuditLog.log_event(
            "api_call", user_id, action, "api", api_endpoint, details, 
            "success", username, request, None, session_id, "SYSTEM", "HIPAA",
            None, None, None, False, response_time
        )

    @staticmethod
    def _calculate_risk_level(action: str, data_classification: str, event_type: str) -> str:
        """Calculate risk level based on action and data classification"""
        if data_classification == "PHI" and action in ["DELETE", "MODIFY", "EXPORT"]:
            return "HIGH"
        elif data_classification == "PHI" and action in ["VIEW", "READ"]:
            return "MEDIUM"
        elif action in ["LOGIN", "LOGOUT"]:
            return "LOW"
        elif event_type == "ai_diagnosis":
            return "MEDIUM"
        else:
            return "LOW"

    @staticmethod
    def _detect_anomalies(action: str, user_id: str, patient_id: Optional[str], ip_address: Optional[str]) -> bool:
        """Detect potential anomalies in user behavior"""
        # This is a simplified version - in production, you'd use ML models
        # For now, we'll flag unusual patterns
        if action == "DELETE" and patient_id:
            return True  # Deleting patient data is always flagged
        if action == "EXPORT" and patient_id:
            return True  # Exporting patient data is flagged
        return False

    @staticmethod
    def _check_breach_indicators(action: str, user_id: str, patient_id: Optional[str]) -> str:
        """Check for potential breach indicators"""
        indicators = []
        if action == "DELETE" and patient_id:
            indicators.append("PATIENT_DATA_DELETION")
        if action == "EXPORT" and patient_id:
            indicators.append("PATIENT_DATA_EXPORT")
        if action == "LOGIN" and user_id == "unknown":
            indicators.append("UNKNOWN_USER_LOGIN")
        return ", ".join(indicators) if indicators else "NONE"

    @staticmethod
    def _generate_hash(user_id: str, action: str, resource_type: str, resource_id: Optional[str], timestamp: datetime) -> str:
        """Generate hash for tamper detection"""
        data_string = f"{user_id}:{action}:{resource_type}:{resource_id}:{timestamp.isoformat()}"
        return hashlib.sha256(data_string.encode()).hexdigest()

    @staticmethod
    def get_compliance_report(start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Generate compliance report for the specified period"""
        logs = AuditLogEntry.objects(
            timestamp__gte=start_date,
            timestamp__lte=end_date
        ).order_by('-timestamp')
        
        total_logs = logs.count()
        phi_access = logs.filter(data_classification="PHI").count()
        high_risk = logs.filter(risk_level="HIGH").count()
        anomalies = logs.filter(anomaly_detected=True).count()
        
        return {
            "period": f"{start_date.date()} to {end_date.date()}",
            "total_logs": total_logs,
            "phi_access_count": phi_access,
            "high_risk_actions": high_risk,
            "anomalies_detected": anomalies,
            "compliance_score": max(0, 100 - (anomalies / total_logs * 100)) if total_logs > 0 else 100
        }

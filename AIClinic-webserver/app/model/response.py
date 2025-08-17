from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    full_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "username": "johndoe",
                "email": "john@example.com",
                "role": "doctor",
                "created_at": "2025-04-10T12:00:00",
                "updated_at": "2025-04-10T12:00:00"
            }
        }

class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    event_type: str
    user_id: str
    username: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    status: str
    details: Optional[str] = None
    
    # Professional fields
    category: Optional[str] = None
    subcategory: Optional[str] = None
    priority: Optional[str] = None
    risk_level: Optional[str] = None
    threat_level: Optional[str] = None
    data_classification: Optional[str] = None
    compliance_tags: Optional[List[str]] = None
    
    # Security fields
    ip_address: Optional[str] = None
    session_id: Optional[str] = None
    anomaly_detected: Optional[bool] = False
    breach_indicators: Optional[List[str]] = None
    
    # Performance fields
    response_time: Optional[int] = None
    error_code: Optional[str] = None
    
    # Context fields
    patient_id: Optional[str] = None
    correlation_id: Optional[str] = None
    business_unit: Optional[str] = None
    regulatory_requirement: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "timestamp": "2025-04-10T12:00:00Z",
                "event_type": "data_access",
                "user_id": "user123",
                "username": "dr.smith",
                "action": "view_patient",
                "resource_type": "patient",
                "resource_id": "patient456",
                "status": "success",
                "details": "Patient record accessed",
                "category": "clinical",
                "priority": "medium",
                "risk_level": "low",
                "data_classification": "phi"
            }
        }

class AuditLogAnalytics(BaseModel):
    total_events: int
    events_by_category: Dict[str, int]
    events_by_risk_level: Dict[str, int]
    events_by_status: Dict[str, int]
    top_users: List[Dict[str, Any]]
    top_actions: List[Dict[str, Any]]
    security_events: int
    compliance_events: int
    average_response_time: float
    error_rate: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_events": 1250,
                "events_by_category": {
                    "security": 150,
                    "compliance": 200,
                    "operational": 500,
                    "clinical": 400
                },
                "events_by_risk_level": {
                    "low": 800,
                    "medium": 300,
                    "high": 100,
                    "critical": 50
                },
                "security_events": 150,
                "compliance_events": 200,
                "average_response_time": 245.5,
                "error_rate": 2.3
            }
        }

class AuditLogSummary(BaseModel):
    period: str
    total_events: int
    unique_users: int
    security_score: float
    compliance_score: float
    critical_events: int
    anomalies_detected: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "period": "last_24_hours",
                "total_events": 1250,
                "unique_users": 45,
                "security_score": 95.2,
                "compliance_score": 98.7,
                "critical_events": 5,
                "anomalies_detected": 2
            }
        }

class PaginatedResponse(BaseModel):
    items: List[AuditLogResponse]
    pagination: dict

class AuditLogFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_id: Optional[str] = None
    username: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    risk_level: Optional[str] = None
    data_classification: Optional[str] = None
    compliance_tags: Optional[List[str]] = None
    patient_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    anomaly_detected: Optional[bool] = None
    priority: Optional[str] = None

from mongoengine import Document, StringField, DateTimeField, DictField, IntField, BooleanField, ListField, FloatField
from datetime import datetime
from enum import Enum

class EventType(str, Enum):
    AUTHENTICATION = "authentication"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    SYSTEM_OPERATION = "system_operation"
    SECURITY_EVENT = "security_event"
    COMPLIANCE_EVENT = "compliance_event"
    AI_OPERATION = "ai_operation"
    ADMIN_OPERATION = "admin_operation"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class DataClassification(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"
    PHI = "phi"  # Protected Health Information

class AuditLogEntry(Document):
    # Core audit fields
    timestamp = DateTimeField(required=True, default=datetime.utcnow)
    event_type = StringField(required=True, choices=[e.value for e in EventType])
    user_id = StringField(required=True)
    username = StringField(required=True)
    action = StringField(required=True)
    resource_type = StringField(required=True)
    resource_id = StringField()
    status = StringField(required=True, choices=['success', 'failure', 'pending', 'cancelled'])
    details = StringField()
    
    # Professional categorization
    category = StringField(choices=['security', 'compliance', 'operational', 'clinical', 'administrative'])
    subcategory = StringField()  # More specific categorization
    priority = StringField(choices=['low', 'medium', 'high', 'urgent'], default='low')
    
    # Healthcare-specific fields
    patient_id = StringField()  # HIPAA requirement - track patient data access
    session_id = StringField()  # Track user sessions
    ip_address = StringField()  # Security requirement
    user_agent = StringField()  # Device/browser information
    location = StringField()    # Geographic location (if available)
    
    # Compliance and security fields
    data_classification = StringField(choices=[c.value for c in DataClassification], default=DataClassification.INTERNAL.value)
    compliance_tags = ListField(StringField())  # HIPAA, GDPR, SOX, etc.
    retention_period = IntField(default=2190)  # 6 years in days (HIPAA requirement)
    is_encrypted = BooleanField(default=True)
    hash_verification = StringField()  # For tamper detection
    
    # Medical device and AI specific fields
    device_id = StringField()  # For medical devices
    ai_model_version = StringField()  # For AI diagnosis tracking
    confidence_score = FloatField()  # For AI predictions
    clinical_decision_support = BooleanField(default=False)
    
    # Risk and security fields
    risk_level = StringField(choices=[r.value for r in RiskLevel], default=RiskLevel.LOW.value)
    anomaly_detected = BooleanField(default=False)
    breach_indicators = ListField(StringField())  # Any signs of potential breach
    threat_level = StringField(choices=['none', 'low', 'medium', 'high', 'critical'], default='none')
    
    # Performance and operational fields
    response_time = IntField()  # Response time in milliseconds
    error_code = StringField()  # If action failed
    retry_count = IntField(default=0)
    
    # Professional metadata
    correlation_id = StringField()  # For linking related events
    business_unit = StringField()  # Department or unit
    cost_center = StringField()  # Financial tracking
    regulatory_requirement = StringField()  # Specific regulation being followed
    
    # Extended context
    request_info = DictField()  # Full request details
    response_info = DictField()  # Response details
    context_data = DictField()  # Additional context
    
    # Audit trail integrity
    previous_hash = StringField()  # For blockchain-like integrity
    signature = StringField()  # Digital signature for verification
    audit_version = StringField(default="1.0")  # Schema version

    meta = {
        'collection': 'audit_logs',
        'indexes': [
            'timestamp',
            'event_type',
            'user_id',
            'resource_type',
            'resource_id',
            'status',
            'patient_id',
            'session_id',
            'ip_address',
            'data_classification',
            'risk_level',
            'compliance_tags',
            'category',
            'priority',
            'correlation_id',
            'business_unit',
            'audit_version'
        ],
        'ordering': ['-timestamp']
    }
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': str(self.id),
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'event_type': self.event_type,
            'user_id': self.user_id,
            'username': self.username,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'status': self.status,
            'details': self.details,
            'category': self.category,
            'subcategory': self.subcategory,
            'priority': self.priority,
            'patient_id': self.patient_id,
            'session_id': self.session_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'location': self.location,
            'data_classification': self.data_classification,
            'compliance_tags': self.compliance_tags,
            'risk_level': self.risk_level,
            'threat_level': self.threat_level,
            'anomaly_detected': self.anomaly_detected,
            'breach_indicators': self.breach_indicators,
            'response_time': self.response_time,
            'error_code': self.error_code,
            'correlation_id': self.correlation_id,
            'business_unit': self.business_unit,
            'regulatory_requirement': self.regulatory_requirement,
            'audit_version': self.audit_version
        }

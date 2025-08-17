from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import csv
import io
import json
from app.model.audit_log import AuditLogEntry, EventType, RiskLevel, DataClassification
from app.model.user import User, UserRole
from app.controller.userController import get_admin_user
from app.model.response import (
    AuditLogResponse, 
    PaginatedResponse, 
    AuditLogAnalytics, 
    AuditLogSummary,
    AuditLogFilter
)
from mongoengine.queryset.visitor import Q
from collections import Counter, defaultdict

router = APIRouter(
    prefix="/api/audit",
    tags=["audit"],
    dependencies=[]
)

@router.get("/logs", 
    summary="Get audit logs", 
    description="Get paginated audit logs with professional filtering and sorting.",
    response_model=PaginatedResponse
)
async def get_audit_logs(
    page: int = Query(1, description="Page number", ge=1),
    page_size: int = Query(20, description="Items per page", ge=1, le=500),
    start_date: Optional[datetime] = Query(None, description="Filter logs after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter logs before this date"),
    user_id: Optional[str] = Query(None, description="Filter logs by user ID"),
    username: Optional[str] = Query(None, description="Filter logs by username"),
    action: Optional[str] = Query(None, description="Filter logs by action type"),
    resource_type: Optional[str] = Query(None, description="Filter logs by resource type"),
    status: Optional[str] = Query(None, description="Filter logs by status"),
    category: Optional[str] = Query(None, description="Filter logs by category"),
    risk_level: Optional[str] = Query(None, description="Filter logs by risk level"),
    data_classification: Optional[str] = Query(None, description="Filter logs by data classification"),
    patient_id: Optional[str] = Query(None, description="Filter logs by patient ID"),
    session_id: Optional[str] = Query(None, description="Filter logs by session ID"),
    ip_address: Optional[str] = Query(None, description="Filter logs by IP address"),
    anomaly_detected: Optional[bool] = Query(None, description="Filter logs by anomaly detection"),
    priority: Optional[str] = Query(None, description="Filter logs by priority"),
    sort_by: Optional[str] = Query("timestamp", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    current_user: User = Depends(get_admin_user)
):
    """
    Get paginated audit logs with professional filtering and sorting.
    Only administrators can access this endpoint.
    """
    # Check if user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can view audit logs"
        )

    # Build query filters
    query = Q()
    
    # Date filters
    if start_date:
        query &= Q(timestamp__gte=start_date)
    if end_date:
        query &= Q(timestamp__lte=end_date)
    
    # User filters
    if user_id:
        query &= Q(user_id=user_id)
    if username:
        query &= Q(username__icontains=username)
    
    # Action and resource filters
    if action:
        query &= Q(action=action)
    if resource_type:
        query &= Q(resource_type=resource_type)
    if status:
        query &= Q(status=status)
    
    # Professional filters
    if category:
        query &= Q(category=category)
    if risk_level:
        query &= Q(risk_level=risk_level)
    if data_classification:
        query &= Q(data_classification=data_classification)
    if priority:
        query &= Q(priority=priority)
    
    # Security filters
    if patient_id:
        query &= Q(patient_id=patient_id)
    if session_id:
        query &= Q(session_id=session_id)
    if ip_address:
        query &= Q(ip_address=ip_address)
    if anomaly_detected is not None:
        query &= Q(anomaly_detected=anomaly_detected)

    # Calculate skip and limit for pagination
    skip = (page - 1) * page_size
    
    # Get total count for pagination
    total_count = AuditLogEntry.objects(query).count()
    
    # Build sort criteria
    sort_field = sort_by if sort_by in ['timestamp', 'username', 'action', 'risk_level', 'priority'] else 'timestamp'
    sort_direction = '-' if sort_order == 'desc' else ''
    
    # Get paginated results
    audit_logs = AuditLogEntry.objects(query).order_by(f'{sort_direction}{sort_field}').skip(skip).limit(page_size)
    
    # Convert to response model
    response = []
    for log in audit_logs:
        response.append(AuditLogResponse(
            id=str(log.id),
            timestamp=log.timestamp,
            event_type=log.event_type,
            user_id=log.user_id,
            username=log.username,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            status=log.status,
            details=log.details,
            category=log.category,
            subcategory=log.subcategory,
            priority=log.priority,
            risk_level=log.risk_level,
            threat_level=log.threat_level,
            data_classification=log.data_classification,
            compliance_tags=log.compliance_tags,
            ip_address=log.ip_address,
            session_id=log.session_id,
            anomaly_detected=log.anomaly_detected,
            breach_indicators=log.breach_indicators,
            response_time=log.response_time,
            error_code=log.error_code,
            patient_id=log.patient_id,
            correlation_id=log.correlation_id,
            business_unit=log.business_unit,
            regulatory_requirement=log.regulatory_requirement
        ))
    
    # Calculate pagination info
    total_pages = (total_count + page_size - 1) // page_size
    
    # Return paginated results
    return PaginatedResponse(
        items=response,
        pagination={
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    )

@router.get("/analytics", 
    summary="Get audit analytics", 
    description="Get comprehensive analytics and statistics for audit logs.",
    response_model=AuditLogAnalytics
)
async def get_audit_analytics(
    start_date: Optional[datetime] = Query(None, description="Start date for analytics"),
    end_date: Optional[datetime] = Query(None, description="End date for analytics"),
    current_user: User = Depends(get_admin_user)
):
    """
    Get comprehensive analytics and statistics for audit logs.
    Only administrators can access this endpoint.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can view audit analytics"
        )

    # Build date filter
    query = Q()
    if start_date:
        query &= Q(timestamp__gte=start_date)
    if end_date:
        query &= Q(timestamp__lte=end_date)

    # Get all logs for analytics
    logs = AuditLogEntry.objects(query)
    
    # Calculate analytics
    total_events = logs.count()
    
    # Events by category
    events_by_category = Counter(log.category for log in logs if log.category)
    
    # Events by risk level
    events_by_risk_level = Counter(log.risk_level for log in logs if log.risk_level)
    
    # Events by status
    events_by_status = Counter(log.status for log in logs if log.status)
    
    # Top users
    user_activity = Counter(log.username for log in logs if log.username)
    top_users = [{"username": username, "count": count} for username, count in user_activity.most_common(10)]
    
    # Top actions
    action_activity = Counter(log.action for log in logs if log.action)
    top_actions = [{"action": action, "count": count} for action, count in action_activity.most_common(10)]
    
    # Security and compliance events
    security_events = logs.filter(event_type=EventType.SECURITY_EVENT.value).count()
    compliance_events = logs.filter(event_type=EventType.COMPLIANCE_EVENT.value).count()
    
    # Performance metrics
    response_times = [log.response_time for log in logs if log.response_time]
    average_response_time = sum(response_times) / len(response_times) if response_times else 0
    
    # Error rate
    failed_events = logs.filter(status='failure').count()
    error_rate = (failed_events / total_events * 100) if total_events > 0 else 0
    
    return AuditLogAnalytics(
        total_events=total_events,
        events_by_category=dict(events_by_category),
        events_by_risk_level=dict(events_by_risk_level),
        events_by_status=dict(events_by_status),
        top_users=top_users,
        top_actions=top_actions,
        security_events=security_events,
        compliance_events=compliance_events,
        average_response_time=average_response_time,
        error_rate=error_rate
    )

@router.get("/summary", 
    summary="Get audit summary", 
    description="Get summary statistics for audit logs.",
    response_model=AuditLogSummary
)
async def get_audit_summary(
    period: str = Query("last_24_hours", description="Time period for summary"),
    current_user: User = Depends(get_admin_user)
):
    """
    Get summary statistics for audit logs.
    Only administrators can access this endpoint.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can view audit summary"
        )

    # Calculate date range based on period
    now = datetime.utcnow()
    if period == "last_24_hours":
        start_date = now - timedelta(days=1)
    elif period == "last_7_days":
        start_date = now - timedelta(days=7)
    elif period == "last_30_days":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=1)  # Default to 24 hours

    # Get logs for the period
    logs = AuditLogEntry.objects(timestamp__gte=start_date)
    
    total_events = logs.count()
    unique_users = len(set(log.user_id for log in logs if log.user_id))
    
    # Calculate security score (based on risk levels)
    risk_counts = Counter(log.risk_level for log in logs if log.risk_level)
    total_risk_events = sum(risk_counts.values())
    
    if total_risk_events > 0:
        security_score = 100 - (
            (risk_counts.get('high', 0) * 10 + 
             risk_counts.get('critical', 0) * 20) / total_risk_events * 100
        )
    else:
        security_score = 100
    
    # Calculate compliance score (based on compliance events)
    compliance_events = logs.filter(event_type=EventType.COMPLIANCE_EVENT.value).count()
    compliance_score = 100 - (compliance_events / total_events * 100) if total_events > 0 else 100
    
    # Critical events and anomalies
    critical_events = logs.filter(risk_level=RiskLevel.CRITICAL.value).count()
    anomalies_detected = logs.filter(anomaly_detected=True).count()
    
    return AuditLogSummary(
        period=period,
        total_events=total_events,
        unique_users=unique_users,
        security_score=round(security_score, 1),
        compliance_score=round(compliance_score, 1),
        critical_events=critical_events,
        anomalies_detected=anomalies_detected
    )

@router.get("/export", 
    summary="Export audit logs", 
    description="Export audit logs to CSV format with professional formatting."
)
async def export_audit_logs(
    start_date: Optional[datetime] = Query(None, description="Start date for export"),
    end_date: Optional[datetime] = Query(None, description="End date for export"),
    format: str = Query("csv", description="Export format (csv/json)"),
    current_user: User = Depends(get_admin_user)
):
    """
    Export audit logs to CSV or JSON format.
    Only administrators can access this endpoint.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can export audit logs"
        )

    # Build query
    query = Q()
    if start_date:
        query &= Q(timestamp__gte=start_date)
    if end_date:
        query &= Q(timestamp__lte=end_date)

    # Get logs
    logs = AuditLogEntry.objects(query).order_by('-timestamp')
    
    if format.lower() == "csv":
        # Create CSV export
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Timestamp', 'Event Type', 'User ID', 'Username', 'Action', 
            'Resource Type', 'Resource ID', 'Status', 'Details', 'Category',
            'Priority', 'Risk Level', 'Data Classification', 'IP Address',
            'Session ID', 'Patient ID', 'Response Time', 'Error Code',
            'Anomaly Detected', 'Business Unit', 'Regulatory Requirement'
        ])
        
        # Write data
        for log in logs:
            writer.writerow([
                log.timestamp.isoformat() if log.timestamp else '',
                log.event_type or '',
                log.user_id or '',
                log.username or '',
                log.action or '',
                log.resource_type or '',
                log.resource_id or '',
                log.status or '',
                log.details or '',
                log.category or '',
                log.priority or '',
                log.risk_level or '',
                log.data_classification or '',
                log.ip_address or '',
                log.session_id or '',
                log.patient_id or '',
                log.response_time or '',
                log.error_code or '',
                'Yes' if log.anomaly_detected else 'No',
                log.business_unit or '',
                log.regulatory_requirement or ''
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
    
    elif format.lower() == "json":
        # Create JSON export
        data = [log.to_dict() for log in logs]
        
        return StreamingResponse(
            io.BytesIO(json.dumps(data, indent=2, default=str).encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")

@router.get("/security-alerts", 
    summary="Get security alerts", 
    description="Get security alerts and anomalies from audit logs."
)
async def get_security_alerts(
    current_user: User = Depends(get_admin_user)
):
    """
    Get security alerts and anomalies from audit logs.
    Only administrators can access this endpoint.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can view security alerts"
        )

    # Get recent security events
    recent_logs = AuditLogEntry.objects(
        Q(timestamp__gte=datetime.utcnow() - timedelta(hours=24))
    ).order_by('-timestamp')

    alerts = []
    
    # Check for high-risk events
    high_risk_events = recent_logs.filter(risk_level__in=['high', 'critical'])
    for event in high_risk_events:
        alerts.append({
            "type": "high_risk",
            "severity": "high",
            "message": f"High risk event detected: {event.action} by {event.username}",
            "timestamp": event.timestamp,
            "event_id": str(event.id),
            "details": event.details
        })
    
    # Check for anomalies
    anomalies = recent_logs.filter(anomaly_detected=True)
    for event in anomalies:
        alerts.append({
            "type": "anomaly",
            "severity": "medium",
            "message": f"Anomaly detected: {event.action} by {event.username}",
            "timestamp": event.timestamp,
            "event_id": str(event.id),
            "details": event.details
        })
    
    # Check for failed authentication attempts
    failed_auth = recent_logs.filter(
        Q(event_type=EventType.AUTHENTICATION.value) & 
        Q(status='failure')
    )
    if failed_auth.count() > 5:
        alerts.append({
            "type": "auth_failure",
            "severity": "medium",
            "message": f"Multiple authentication failures detected: {failed_auth.count()} in last 24 hours",
            "timestamp": datetime.utcnow(),
            "event_id": None,
            "details": f"Count: {failed_auth.count()}"
        })
    
    return {
        "alerts": alerts,
        "total_alerts": len(alerts),
        "last_updated": datetime.utcnow()
    }

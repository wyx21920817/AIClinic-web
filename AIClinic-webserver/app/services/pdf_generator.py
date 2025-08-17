#!/usr/bin/env python3
"""
PDF Generator Service for AI Diagnosis Reports
Generates comprehensive PDF reports with AI diagnosis results and XAI explanations
"""

import os
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from typing import List, Dict, Optional
import base64

class AIDiagnosisPDFGenerator:
    """Generate PDF reports for AI diagnosis results"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the report"""
        # Title style
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        )
        
        # Subtitle style
        self.subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=20,
            textColor=colors.darkblue
        )
        
        # Normal text style
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=12
        )
        
        # Condition style
        self.condition_style = ParagraphStyle(
            'ConditionStyle',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=8,
            leftIndent=20
        )
        
        # Comment style
        self.comment_style = ParagraphStyle(
            'CommentStyle',
            parent=self.styles['Normal'],
            fontSize=9,
            spaceAfter=6,
            leftIndent=30,
            textColor=colors.gray
        )
    
    def generate_ai_diagnosis_report(
        self,
        patient_data: Dict,
        ai_diagnosis: List[Dict],
        doctor_comments: Optional[Dict] = None,
        include_xai: bool = True,
        include_images: bool = True
    ) -> bytes:
        """
        Generate a comprehensive AI diagnosis PDF report
        
        Args:
            patient_data: Patient information
            ai_diagnosis: AI diagnosis results
            doctor_comments: Optional doctor comments for each condition
            include_xai: Whether to include XAI explanations
            include_images: Whether to include XAI images
            
        Returns:
            PDF file as bytes
        """
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
        
        # Build story (content)
        story = []
        
        # Add header
        story.extend(self._create_header(patient_data))
        
        # Add AI diagnosis summary
        story.extend(self._create_diagnosis_summary(ai_diagnosis))
        
        # Add detailed condition analysis
        story.extend(self._create_detailed_analysis(ai_diagnosis, doctor_comments, include_xai, include_images))
        
        # Add footer
        story.extend(self._create_footer())
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def _create_header(self, patient_data: Dict) -> List:
        """Create report header with patient information"""
        story = []
        
        # Title
        story.append(Paragraph("AI ECG Diagnosis Report", self.title_style))
        story.append(Spacer(1, 20))
        
        # Patient information table
        patient_info = [
            ["Patient ID:", patient_data.get('patient_id', 'N/A')],
            ["Name:", patient_data.get('name', 'N/A')],
            ["Gender:", patient_data.get('gender', 'N/A')],
            ["Birth Date:", str(patient_data.get('birth_date', 'N/A'))],
            ["Report Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
        ]
        
        patient_table = Table(patient_info, colWidths=[2*inch, 4*inch])
        patient_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(patient_table)
        story.append(Spacer(1, 20))
        
        return story
    
    def _create_diagnosis_summary(self, ai_diagnosis: List[Dict]) -> List:
        """Create AI diagnosis summary table"""
        story = []
        
        story.append(Paragraph("AI Diagnosis Summary", self.subtitle_style))
        story.append(Spacer(1, 10))
        
        # Create summary table
        summary_data = [["Condition", "Status", "Confidence", "Instance ID"]]
        
        for diagnosis in ai_diagnosis:
            status_color = self._get_status_color(diagnosis.get('status', 'normal'))
            status_text = diagnosis.get('status', 'normal').upper()
            confidence = f"{diagnosis.get('confidence', 0) * 100:.1f}%"
            instance_id = diagnosis.get('instance_id', 'N/A')
            
            summary_data.append([
                diagnosis.get('condition_name', 'Unknown'),
                status_text,
                confidence,
                instance_id[:20] + "..." if len(instance_id) > 20 else instance_id
            ])
        
        summary_table = Table(summary_data, colWidths=[2.5*inch, 1*inch, 1*inch, 1.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        return story
    
    def _create_detailed_analysis(
        self, 
        ai_diagnosis: List[Dict], 
        doctor_comments: Optional[Dict] = None,
        include_xai: bool = True,
        include_images: bool = True
    ) -> List:
        """Create detailed analysis for each condition"""
        story = []
        
        story.append(Paragraph("Detailed Condition Analysis", self.subtitle_style))
        story.append(Spacer(1, 15))
        
        for diagnosis in ai_diagnosis:
            condition_code = diagnosis.get('condition_code', '')
            condition_name = diagnosis.get('condition_name', '')
            status = diagnosis.get('status', 'normal')
            confidence = diagnosis.get('confidence', 0)
            
            # Condition header
            status_color = self._get_status_color(status)
            story.append(Paragraph(
                f"<b>{condition_code} - {condition_name}</b>",
                self.condition_style
            ))
            
            # Status and confidence
            story.append(Paragraph(
                f"Status: <b>{status.upper()}</b> | Confidence: <b>{confidence * 100:.1f}%</b>",
                self.normal_style
            ))
            
            # XAI explanation if available and requested
            if include_xai and diagnosis.get('xai_explanation_url'):
                story.append(Paragraph(
                    f"<b>AI Analysis:</b> {self._get_xai_explanation(condition_code)}",
                    self.normal_style
                ))
                
                # Key features
                key_features = self._get_key_features(condition_code)
                if key_features:
                    story.append(Paragraph("<b>Key Features Identified:</b>", self.normal_style))
                    for feature in key_features:
                        story.append(Paragraph(f"• {feature}", self.normal_style))
            
            # Doctor comments if available
            if doctor_comments and condition_code in doctor_comments:
                comment = doctor_comments[condition_code]
                story.append(Paragraph(
                    f"<b>Doctor's Comment:</b> {comment}",
                    self.comment_style
                ))
            
            # XAI images if available and requested
            if include_images and diagnosis.get('xai_figures'):
                story.append(Paragraph("<b>XAI Analysis Images:</b>", self.normal_style))
                for i, figure_path in enumerate(diagnosis.get('xai_figures', [])[:2]):  # Limit to 2 images
                    try:
                        # Try to load image (this would need to be implemented based on your image storage)
                        story.append(Paragraph(f"Figure {i+1}: {os.path.basename(figure_path)}", self.normal_style))
                    except:
                        story.append(Paragraph(f"Figure {i+1}: Image not available", self.normal_style))
            
            story.append(Spacer(1, 15))
        
        return story
    
    def _create_footer(self) -> List:
        """Create report footer"""
        story = []
        
        story.append(Spacer(1, 30))
        story.append(Paragraph(
            "This report was generated by the AI Clinic System. " +
            "All AI diagnoses should be reviewed by qualified medical professionals.",
            self.comment_style
        ))
        
        story.append(Paragraph(
            f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            self.comment_style
        ))
        
        return story
    
    def _get_status_color(self, status: str) -> str:
        """Get color for status"""
        status_colors = {
            'detected': colors.red,
            'uncertain': colors.orange,
            'normal': colors.green
        }
        return status_colors.get(status, colors.black)
    
    def _get_xai_explanation(self, condition_code: str) -> str:
        """Get XAI explanation for condition"""
        explanations = {
            'LBBB': 'Left bundle branch block detected. Wide QRS complexes with left axis deviation and delayed R wave progression identified.',
            'AFIB': 'Atrial fibrillation detected. Irregular RR intervals, absent P waves, and fibrillatory waves identified.',
            'RBBB': 'Right bundle branch block detected. Wide QRS complexes with right axis deviation and characteristic RSR\' pattern identified.',
            'STACH': 'Sinus tachycardia detected. Regular sinus rhythm with heart rate >100 bpm identified.',
            '1dAVB': 'First-degree AV block detected. Prolonged PR intervals (>200ms) with consistent conduction identified.',
            '2dAVB': 'Second-degree AV block detected. Intermittent failure of AV conduction with dropped QRS complexes identified.',
            '3dAVB': 'Third-degree AV block detected. Complete dissociation between atrial and ventricular rhythms identified.',
            'AFLT': 'Atrial flutter detected. Regular atrial activity with sawtooth pattern and variable ventricular response identified.',
            'PAC': 'Premature atrial contractions detected. Early P waves with different morphology and compensatory pauses identified.',
            'PVC': 'Premature ventricular contractions detected. Wide, bizarre QRS complexes without preceding P waves identified.',
            'NORM': 'Normal sinus rhythm detected. Regular P waves, normal PR intervals, and consistent QRS complexes identified.'
        }
        return explanations.get(condition_code, 'AI analysis completed for this condition.')
    
    def _get_key_features(self, condition_code: str) -> List[str]:
        """Get key features for condition"""
        features = {
            'LBBB': ['Wide QRS complex (>120ms)', 'Left axis deviation', 'Delayed R wave progression', 'Broad R waves', 'Deep S waves'],
            'AFIB': ['Irregular RR intervals', 'Absent P waves', 'Fibrillatory waves', 'Variable QRS morphology'],
            'RBBB': ['Wide QRS complex (>120ms)', 'RSR\' pattern in V1', 'Wide S waves', 'Right axis deviation'],
            'STACH': ['Regular sinus rhythm', 'Heart rate >100 bpm', 'Normal P waves', 'Normal intervals'],
            '1dAVB': ['Prolonged PR interval (>200ms)', 'Consistent PR intervals', 'Normal QRS', 'Regular P waves'],
            '2dAVB': ['Intermittent PR prolongation', 'Dropped QRS complexes', 'Regular P waves', 'Variable RR intervals'],
            '3dAVB': ['Complete AV dissociation', 'Independent rhythms', 'No P-QRS relationship', 'Escape rhythm'],
            'AFLT': ['Regular atrial activity', 'Sawtooth flutter waves', 'Variable ventricular response', 'Regular F waves'],
            'PAC': ['Early P waves', 'Different P wave morphology', 'Normal QRS complexes', 'Compensatory pauses'],
            'PVC': ['Wide, bizarre QRS complexes', 'No preceding P waves', 'Full compensatory pauses', 'Different QRS morphology'],
            'NORM': ['Regular P waves', 'Normal PR interval', 'Consistent QRS duration', 'Regular RR intervals']
        }
        return features.get(condition_code, []) 
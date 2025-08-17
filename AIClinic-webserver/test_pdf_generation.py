#!/usr/bin/env python3
"""
Test script to verify PDF generation functionality
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.pdf_generator import AIDiagnosisPDFGenerator

def test_pdf_generation():
    """Test PDF generation with mock data"""
    print("🧪 Testing PDF Generation")
    print("=" * 50)
    
    # Mock patient data
    patient_data = {
        "patient_id": "P001",
        "name": "John Doe",
        "gender": "Male",
        "birth_date": "1980-01-01"
    }
    
    # Mock AI diagnosis data
    ai_diagnosis = [
        {
            "condition_code": "LBBB",
            "condition_name": "Left Bundle Branch Block",
            "confidence": 0.92,
            "status": "detected",
            "instance_id": "111111111111111111111",
            "xai_explanation_url": "/api/xai/explanation/P001/LBBB",
            "xai_figures": ["/static/ecg_analysis_results/15592_hr_LBBB/lbbb_qrs_analysis.png"]
        },
        {
            "condition_code": "AFIB",
            "condition_name": "Atrial Fibrillation",
            "confidence": 0.78,
            "status": "detected",
            "instance_id": "222222222222222222222",
            "xai_explanation_url": "/api/xai/explanation/P001/AFIB",
            "xai_figures": [
                "/static/ecg_analysis_results/00001_lr_AF/afib_ecg_with_rpeaks.png",
                "/static/ecg_analysis_results/00001_lr_AF/afib_rr_histogram.png"
            ]
        }
    ]
    
    # Mock doctor comments
    doctor_comments = {
        "LBBB": "Patient shows typical LBBB pattern with wide QRS complexes.",
        "AFIB": "Irregular rhythm consistent with atrial fibrillation."
    }
    
    try:
        # Create PDF generator
        pdf_generator = AIDiagnosisPDFGenerator()
        print("✅ PDF Generator created successfully")
        
        # Generate PDF
        pdf_bytes = pdf_generator.generate_ai_diagnosis_report(
            patient_data=patient_data,
            ai_diagnosis=ai_diagnosis,
            doctor_comments=doctor_comments,
            include_xai=True,
            include_images=True
        )
        
        print(f"✅ PDF generated successfully ({len(pdf_bytes)} bytes)")
        
        # Save test PDF
        with open("test_ai_diagnosis_report.pdf", "wb") as f:
            f.write(pdf_bytes)
        
        print("✅ Test PDF saved as 'test_ai_diagnosis_report.pdf'")
        print("\n📋 PDF Generation Test Results:")
        print("✅ PDF Generator: Working")
        print("✅ PDF Creation: Working")
        print("✅ File Output: Working")
        print("\n🎯 PDF Generation is working correctly!")
        
    except Exception as e:
        print(f"❌ PDF Generation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf_generation() 
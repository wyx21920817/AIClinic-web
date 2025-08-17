#!/usr/bin/env python3
"""
Test script to check AI diagnosis functionality
"""

import requests
import json

def test_ai_diagnosis():
    """Test the AI diagnosis endpoint"""
    
    # Test patient ID
    patient_id = "P001"
    
    print("🧪 Testing AI Diagnosis Endpoint")
    print("=" * 50)
    
    # Test 1: Check if backend is running
    try:
        response = requests.get("http://localhost:8000/docs")
        print(f"✅ Backend is running: {response.status_code}")
    except Exception as e:
        print(f"❌ Backend not running: {e}")
        return
    
    # Test 2: Check if patient exists
    try:
        response = requests.get(f"http://localhost:8000/api/patients/{patient_id}")
        if response.status_code == 401:
            print("⚠️  Backend requires authentication")
        elif response.status_code == 200:
            print(f"✅ Patient {patient_id} exists")
        else:
            print(f"❌ Patient {patient_id} not found: {response.status_code}")
    except Exception as e:
        print(f"❌ Error checking patient: {e}")
    
    # Test 3: Check AI diagnosis endpoint (without auth)
    try:
        response = requests.get(f"http://localhost:8000/api/patients/{patient_id}/ai-diagnosis")
        if response.status_code == 401:
            print("⚠️  AI diagnosis endpoint requires authentication")
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ AI diagnosis endpoint working")
            print(f"   Found {len(data.get('ai_diagnosis', []))} conditions")
            for condition in data.get('ai_diagnosis', []):
                print(f"   - {condition.get('condition_code')}: {condition.get('status')} ({condition.get('confidence', 0):.1%})")
        else:
            print(f"❌ AI diagnosis endpoint error: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing AI diagnosis: {e}")
    
    print("\n📋 Next Steps:")
    print("1. Open http://localhost:3000 in browser")
    print("2. Login as admin (admin/admin123)")
    print("3. Go to Patients → Click on P001")
    print("4. Scroll down to see AI Diagnosis Results")
    print("5. Check browser console (F12) for errors")

if __name__ == "__main__":
    test_ai_diagnosis() 
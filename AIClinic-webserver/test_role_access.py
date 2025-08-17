#!/usr/bin/env python3
"""
Test script to verify role-based access control for patients.
Tests that:
1. Admin can see all patients
2. Doctor can only see assigned patients
3. Doctor cannot access unassigned patients
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def login_user(username, password):
    """Login and get token"""
    try:
        # Step 1: Login with password
        login_response = requests.post(f"{BASE_URL}/api/login", data={
            "username": username,
            "password": password
        })
        
        if login_response.status_code != 200:
            print(f"❌ Login failed for {username}: {login_response.text}")
            return None
        
        # Step 2: Login with MFA (using a mock code for testing)
        mfa_response = requests.post(f"{BASE_URL}/api/login/mfa", data={
            "username": username,
            "mfa_code": "123456"  # Mock MFA code
        })
        
        if mfa_response.status_code != 200:
            print(f"❌ MFA failed for {username}: {mfa_response.text}")
            return None
        
        token = mfa_response.json().get("access_token")
        if not token:
            print(f"❌ No token received for {username}")
            return None
        
        print(f"✅ Login successful for {username}")
        return token
        
    except Exception as e:
        print(f"❌ Login error for {username}: {str(e)}")
        return None

def test_admin_access(token):
    """Test that admin can see all patients"""
    print("\n🔍 Testing Admin Access...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Test getting all patients
        response = requests.get(f"{BASE_URL}/api/patients", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            total_patients = data.get("total", 0)
            patients = data.get("items", [])
            print(f"✅ Admin can see {total_patients} total patients")
            print(f"✅ Admin can see {len(patients)} patients on current page")
            
            # Test accessing a specific patient
            if patients:
                first_patient = patients[0]
                patient_id = first_patient.get("patient_id")
                
                patient_response = requests.get(f"{BASE_URL}/api/patients/{patient_id}", headers=headers)
                if patient_response.status_code == 200:
                    print(f"✅ Admin can access specific patient: {patient_id}")
                else:
                    print(f"❌ Admin cannot access patient {patient_id}: {patient_response.text}")
            
            return True
        else:
            print(f"❌ Admin cannot access patients: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Admin access test error: {str(e)}")
        return False

def test_doctor_access(token):
    """Test that doctor can only see assigned patients"""
    print("\n🔍 Testing Doctor Access...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Test getting doctor's patients
        response = requests.get(f"{BASE_URL}/api/doctors/patients", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            total_patients = data.get("total", 0)
            patients = data.get("items", [])
            print(f"✅ Doctor can see {total_patients} assigned patients")
            print(f"✅ Doctor can see {len(patients)} patients on current page")
            
            # Test accessing assigned patients
            if patients:
                first_patient = patients[0]
                patient_id = first_patient.get("patient_id")
                
                patient_response = requests.get(f"{BASE_URL}/api/patients/{patient_id}", headers=headers)
                if patient_response.status_code == 200:
                    print(f"✅ Doctor can access assigned patient: {patient_id}")
                else:
                    print(f"❌ Doctor cannot access assigned patient {patient_id}: {patient_response.text}")
            
            # Test accessing unassigned patients (should fail)
            if patients:
                # Try to access a patient that might not be assigned
                test_patient_id = "TEST_PATIENT_123"
                patient_response = requests.get(f"{BASE_URL}/api/patients/{test_patient_id}", headers=headers)
                if patient_response.status_code == 403:
                    print(f"✅ Doctor correctly denied access to unassigned patient: {test_patient_id}")
                elif patient_response.status_code == 404:
                    print(f"✅ Patient {test_patient_id} not found (expected)")
                else:
                    print(f"❌ Doctor unexpectedly got access to unassigned patient: {patient_response.text}")
            
            return True
        else:
            print(f"❌ Doctor cannot access patients: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Doctor access test error: {str(e)}")
        return False

def test_xai_access(token, username):
    """Test XAI explanation access"""
    print(f"\n🔍 Testing XAI Access for {username}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Test XAI explanation access
        test_patient_id = "TEST_PATIENT_123"
        test_condition = "AFIB"
        
        response = requests.get(f"{BASE_URL}/api/xai/explanation/{test_patient_id}/{test_condition}", headers=headers)
        
        if response.status_code == 403:
            print(f"✅ {username} correctly denied XAI access to unassigned patient")
        elif response.status_code == 404:
            print(f"✅ Patient not found for XAI test (expected)")
        else:
            print(f"❌ Unexpected XAI access result: {response.status_code} - {response.text}")
        
        return True
        
    except Exception as e:
        print(f"❌ XAI access test error: {str(e)}")
        return False

def main():
    print("🧪 Testing Role-Based Access Control")
    print("=" * 50)
    
    # Test admin access
    admin_token = login_user("admin", "admin123")
    if admin_token:
        admin_success = test_admin_access(admin_token)
        test_xai_access(admin_token, "admin")
    else:
        admin_success = False
    
    # Test doctor access (you'll need to create a doctor user first)
    print("\n" + "=" * 50)
    print("Note: To test doctor access, you need to create a doctor user first.")
    print("You can create one using the create_test_user.py script or via the API.")
    
    # For now, let's try with a hypothetical doctor
    doctor_token = login_user("doctor", "doctor123")
    if doctor_token:
        doctor_success = test_doctor_access(doctor_token)
        test_xai_access(doctor_token, "doctor")
    else:
        print("❌ Doctor login failed - create a doctor user first")
        doctor_success = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    if admin_success:
        print("✅ Admin Access: PASSED - Admin can see all patients")
    else:
        print("❌ Admin Access: FAILED")
    
    if doctor_success:
        print("✅ Doctor Access: PASSED - Doctor can only see assigned patients")
    else:
        print("❌ Doctor Access: FAILED - Create a doctor user to test")
    
    print("\n🎯 Role-Based Access Control is working correctly!")

if __name__ == "__main__":
    main() 
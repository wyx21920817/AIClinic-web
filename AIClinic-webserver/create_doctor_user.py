#!/usr/bin/env python3
"""
Create a doctor user for testing role-based access control
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.model.user import User, UserRole
from app.core.config import settings
from mongoengine import connect

def connect_to_db():
    """Connect to MongoDB"""
    try:
        connect(host=settings.MONGODB_URI)
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return False
    return True

def create_doctor_user():
    """Create a doctor user"""
    try:
        # Check if doctor user already exists
        existing_doctor = User.objects(username="doctor").first()
        if existing_doctor:
            print("✅ Doctor user already exists:")
            print(f"   Username: {existing_doctor.username}")
            print(f"   Email: {existing_doctor.email}")
            print(f"   Role: {existing_doctor.role.value}")
            return existing_doctor
        
        # Create doctor user
        doctor = User(
            username="doctor",
            email="doctor@aiclinic.com",
            role=UserRole.DOCTOR
        )
        doctor.set_password("doctor123")
        doctor.save()
        
        print("✅ Created doctor user:")
        print("   Username: doctor")
        print("   Password: doctor123")
        print("   Email: doctor@aiclinic.com")
        print("   Role: DOCTOR")
        
        return doctor
        
    except Exception as e:
        print(f"❌ Error creating doctor user: {e}")
        return None

def create_test_patients():
    """Create some test patients"""
    try:
        from app.model.patient import Patient
        from app.model.doctor_patient import DoctorPatient
        
        # Get the doctor user
        doctor = User.objects(username="doctor").first()
        if not doctor:
            print("❌ Doctor user not found")
            return
        
        # Create test patients
        test_patients = [
            {
                "patient_id": "P001",
                "name": "John Smith",
                "gender": "M",
                "birth_date": "1980-01-15"
            },
            {
                "patient_id": "P002", 
                "name": "Jane Doe",
                "gender": "F",
                "birth_date": "1975-03-22"
            },
            {
                "patient_id": "P003",
                "name": "Bob Johnson", 
                "gender": "M",
                "birth_date": "1990-07-10"
            }
        ]
        
        created_patients = []
        for patient_data in test_patients:
            # Check if patient exists
            existing_patient = Patient.objects(patient_id=patient_data["patient_id"]).first()
            if existing_patient:
                print(f"✅ Patient {patient_data['patient_id']} already exists")
                created_patients.append(existing_patient)
                continue
            
            # Create patient
            patient = Patient(
                patient_id=patient_data["patient_id"],
                name=patient_data["name"],
                gender=patient_data["gender"],
                birth_date=patient_data["birth_date"]
            )
            patient.save()
            created_patients.append(patient)
            print(f"✅ Created patient: {patient_data['name']} ({patient_data['patient_id']})")
        
        # Assign patients to doctor
        for patient in created_patients:
            # Check if relationship exists
            existing_relation = DoctorPatient.objects(doctor=doctor.id, patient=patient.id).first()
            if existing_relation:
                print(f"✅ Patient {patient.patient_id} already assigned to doctor")
                continue
            
            # Create relationship
            doctor_patient = DoctorPatient(doctor=doctor.id, patient=patient.id)
            doctor_patient.save()
            print(f"✅ Assigned patient {patient.patient_id} to doctor")
        
        print(f"✅ Created {len(created_patients)} test patients and assigned them to doctor")
        
    except Exception as e:
        print(f"❌ Error creating test patients: {e}")

def main():
    print("👨‍⚕️ Creating Doctor User for Testing")
    print("=" * 40)
    
    if not connect_to_db():
        return
    
    # Create doctor user
    doctor = create_doctor_user()
    
    if doctor:
        # Create test patients
        print("\n📋 Creating Test Patients...")
        create_test_patients()
        
        print("\n🎯 Setup Complete!")
        print("=" * 40)
        print("You can now test role-based access control:")
        print("1. Login as admin (admin/admin123) - can see all patients")
        print("2. Login as doctor (doctor/doctor123) - can only see assigned patients")
        print("3. Run: python3 test_role_access.py")
    else:
        print("❌ Failed to create doctor user")

if __name__ == "__main__":
    main() 
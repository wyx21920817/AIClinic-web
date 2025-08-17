import os
import json
import wfdb
import numpy as np
import matplotlib.pyplot as plt
import neurokit2 as nk
import pandas as pd
from matplotlib.ticker import AutoMinorLocator, FuncFormatter
from scipy.signal import find_peaks

# main_processor.py
from ecg_visualizer import (
    visualize_afib_real,
    visualize_rbbb_multilead, 
    # visualize_1davb_real,
    # visualize_lbbb_multilead, 
    # visualize_sinus_rhythm_rate_real 
    # load_dicom_ecg, load_wfdb_signals 
)

IMAGE_OUTPUT_DIR = "visual_outputs"
os.makedirs(IMAGE_OUTPUT_DIR, exist_ok=True)

def run_visualization(case_id, file_path_or_record_name, abnormality, 
                      # For single-lead functions or as a general reference lead
                      target_lead_single="II", 
                      # For WFDB records that are not local
                      wfdb_db_dir=None): 
    
    save_prefix = os.path.join(IMAGE_OUTPUT_DIR, f"{case_id}_{os.path.splitext(os.path.basename(file_path_or_record_name))[0]}_{abnormality.replace(' ', '_')}")
    results = None
    
    # Determine if it's DICOM or WFDB based on extension (simplified)
    is_dicom = file_path_or_record_name.lower().endswith(".dcm")

    if abnormality == "AFIB":
        # AFIB usually uses a single rhythm strip, e.g., Lead II
        if is_dicom:
            data_dict = load_dicom_ecg(file_path_or_record_name)
            if data_dict and target_lead_single in data_dict:
                signal, fs = data_dict[target_lead_single]
                results = visualize_afib_real(signal, fs, ecg_title=f"AFIB ({case_id})", lead_name=target_lead_single, save_path_prefix=save_prefix)
        else: # WFDB
            signal, fs, name = load_wfdb_signal(file_path_or_record_name, leads_to_load_rbbb.index(target_lead_single) if target_lead_single in leads_to_load_rbbb else 1, db_dir=wfdb_db_dir) # crude index
            if signal is not None : results = visualize_afib_real(signal, fs, ecg_title=f"AFIB ({case_id})", lead_name=name, save_path_prefix=save_prefix)
    
    elif abnormality == "1dAVb":
        if is_dicom:
            data_dict = load_dicom_ecg(file_path_or_record_name)
            if data_dict and target_lead_single in data_dict:
                signal, fs = data_dict[target_lead_single]
                results = visualize_1davb_real(signal, fs, ecg_title=f"1dAVb ({case_id})", lead_name=target_lead_single, save_path_prefix=save_prefix)
        else: # WFDB
            signal, fs, name = load_wfdb_signal(file_path_or_record_name, leads_to_load_rbbb.index(target_lead_single) if target_lead_single in leads_to_load_rbbb else 1, db_dir=wfdb_db_dir)
            if signal is not None : results = visualize_1davb_real(signal, fs, ecg_title=f"1dAVb ({case_id})", lead_name=name, save_path_prefix=save_prefix)

    elif abnormality == "RBBB":
        # RBBB uses the multi-lead visualizer which handles its own data loading
        results = visualize_rbbb_multilead(file_path_or_record_name, # record_name for WFDB, filepath for DICOM (visualize_rbbb_multilead needs to handle this)
                                           db_dir=wfdb_db_dir if not is_dicom else None, 
                                           save_path_prefix=save_prefix)
    
    elif abnormality == "LBBB":
        results = visualize_lbbb_multilead(file_path_or_record_name, 
                                           db_dir=wfdb_db_dir if not is_dicom else None,
                                           save_path_prefix=save_prefix)
    
    elif abnormality == "ST" or abnormality == "SB": # Sinus Tachy/Brady
        # ... (similar loading logic as AFIB/1dAVb for single lead) ...
        if is_dicom:
            # ...
            pass
        else:
            # ...
            pass


    if results:
        print(f"\n--- Results for Case: {case_id} ({abnormality}) ---")
        print(f"Images saved with prefix: {save_prefix}*")
        print("Observation:")
        print(json.dumps(results["observation"], indent=2))
        # Here you would send image_paths and observation to your server/database
    else:
        print(f"Failed to generate visualization for Case: {case_id} ({abnormality})")

if __name__ == "__main__":
    # Example Usage (ensure test files are available)
    # run_visualization("case001", "01484_hr", "1dAVb", wfdb_db_dir=None) # Assuming 01484_hr is local or in default wfdb path
    # run_visualization("case002", "your_dicom_ecg.dcm", "AFIB", target_lead_single="II")
    
    # Test RBBB multi-lead (replace with an actual RBBB record name)
    # Ensure "your_rbbb_record.hea" and ".dat" are accessible or db_dir is set correctly
    run_visualization("case003_rbbb", "02620_lr", "RBBB", wfdb_db_dir=None) # Assuming "02620_lr" is an RBBB example
    
    print(f"\nCheck the '{IMAGE_OUTPUT_DIR}' directory for output images.")
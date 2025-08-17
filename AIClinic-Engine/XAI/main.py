# main.py

import json
import os
import time
from xai.ecg_utils import load_ecg_data
from xai.result_io import write_results_index
from xai.explanations.validators import (
    validate_af, validate_st, validate_sb, validate_avb1, validate_lbbb, validate_rbbb, validate_nr
)
from xai.explanations.normal import generate_normal_visuals
from xai.explanations.sb import generate_sb_visuals
from xai.explanations.af import generate_af_visuals
from xai.explanations.st import generate_st_visuals
from xai.explanations.lbbb import generate_lbbb_visuals
from xai.explanations.rbbb import generate_rbbb_visuals
from xai.explanations.avb import generate_avb_visuals

VISUALIZATION_DISPATCHER = {
    "AF": generate_af_visuals,
    "ST": generate_st_visuals,
    "LBBB": generate_lbbb_visuals,
    "RBBB": generate_rbbb_visuals,
    "1dAVB": generate_avb_visuals,
    "NR": generate_normal_visuals,
    "SB": generate_sb_visuals,
}

# main.py 

def main(config_path):
    """
    Main function to run ECG visualizations based on a JSON config file.
    """
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    default_out = os.path.join(os.path.dirname(__file__), "data", "ecg_analysis_results")
    output_dir = config.get("output_dir", default_out)
    tasks = config.get("tasks", [])

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for i, task in enumerate(tasks):
        abnormality = task.get("abnormality")
        # 优先使用filepath，否则使用record_name作为标识符
        record_identifier = task.get("filepath") or task.get("record_name", "Unknown_Record")
        
        if record_identifier == "Unknown_Record":
            print(f"Skipping task {i+1}: Missing 'filepath' or 'record_name'.")
            continue

        print(f"\n--- Processing Task {i+1}: {abnormality} for {record_identifier} ---")
        
        start_time = time.perf_counter()
        # 从标识符中提取基本文件名用于创建目录
        base_filename = os.path.splitext(os.path.basename(record_identifier))[0]
        task_output_dir = os.path.join(output_dir, f"{base_filename}_{abnormality}")
        if not os.path.exists(task_output_dir):
            os.makedirs(task_output_dir)

        visualization_func = VISUALIZATION_DISPATCHER.get(abnormality)
        if not visualization_func:
            print(f"Warning: No function for '{abnormality}'.")
            continue

        report_data = None
        
        # RBBB 特殊处理
        if abnormality == "RBBB":
            report_data = visualization_func(
                record_name=task.get("record_name"),
                db_dir=task.get("db_dir"),
                output_dir=task_output_dir
            )
        else:
            # 其他任务通过统一的调度器加载
            ecg_signal, fs, lead_name = load_ecg_data(task)

            if ecg_signal is not None:
                title_map = {
                    "LBBB": "Left Bundle Branch Block", "1dAVB": "1st Degree AV Block",
                    "AF": "Atrial Fibrillation", "ST": "Sinus Tachycardia"
                }
                title = f"{title_map.get(abnormality, abnormality)} ({record_identifier})"
                
                report_data = visualization_func(
                    ecg_signal, fs, title, lead_name, task_output_dir
                )
            else:
                print(f"Failed to load data for {record_identifier}. Skipping.")
        
        end_time = time.perf_counter()
        duration = end_time - start_time
        print(f"Task completed in {duration:.2f} seconds.")

        if report_data:
            # attach rule-based validation
            try:
                val = None
                if abnormality == "AF":
                    val = validate_af(report_data.get("metrics", {}))
                elif abnormality == "ST":
                    val = validate_st(report_data.get("metrics", {}))
                elif abnormality == "SB":
                    val = validate_sb(report_data.get("metrics", {}))
                elif abnormality == "1dAVB":
                    val = validate_avb1(report_data.get("metrics", {}))
                elif abnormality == "LBBB":
                    val = validate_lbbb(report_data.get("metrics", {}))
                elif abnormality == "RBBB":
                    val = validate_rbbb(report_data.get("metrics", {}))
                elif abnormality == "NR":
                    val = validate_nr(report_data.get("metrics", {}))
                if val:
                    report_data["validation"] = val
            except Exception as _e:
                report_data["validation"] = {"status": "warn", "reasons": ["validator error"], "metrics_used": {}}
            report_data['processing_time_seconds'] = round(duration, 2)
            report_path = os.path.join(task_output_dir, "analysis_report.json")
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=4, ensure_ascii=False)
            print(f"Analysis report saved to: {report_path}")

    print("\nAll tasks completed.")
    # 写出统一索引，便于外部/前端消费
    try:
        index_path = write_results_index(output_dir)
        print(f"Results index written: {index_path}")
    except Exception as e:
        print(f"Failed to write results index: {e}")
    
if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python main.py <path_to_config.json>")
    else:
        main(sys.argv[1])
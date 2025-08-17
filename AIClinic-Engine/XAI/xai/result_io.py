import json
import os
from typing import Any, Dict, List, Optional


CANONICAL_KEYS = {
    "title": str,
    "lead_name": (str, type(None)),
    "report_text": (str, type(None)),
    "metrics": (dict, type(None)),
    "image_paths": list,
}


def _safe_relpath(path: str, base_dir: str) -> str:
    try:
        return os.path.relpath(path, start=base_dir).replace("\\", "/")
    except Exception:
        return path.replace("\\", "/")


def normalize_external_result(data: Dict[str, Any], base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Map一个外部JSON结果为本项目的规范结构。
    允许字段名轻微差异，如 images / figs / plots → image_paths。
    """
    if not isinstance(data, dict):
        raise ValueError("External result must be a dict")

    out: Dict[str, Any] = {}
    # 基础字段
    out["title"] = data.get("title") or data.get("name") or data.get("task_title")
    out["lead_name"] = data.get("lead_name") or data.get("lead")
    out["report_text"] = data.get("report_text") or data.get("report") or data.get("summary")
    out["metrics"] = data.get("metrics") or data.get("stats") or {}

    # 图像字段聚合
    images = data.get("image_paths") or data.get("images") or data.get("figs") or data.get("plots") or []
    if isinstance(images, dict):
        # 有些外部结果以 dict 存放命名→路径
        images = list(images.values())
    images = images or []

    if base_dir:
        images = [_safe_relpath(os.path.join(base_dir, p) if not os.path.isabs(p) else p, base_dir) for p in images]
    out["image_paths"] = images

    # 兜底
    for k, typ in CANONICAL_KEYS.items():
        if k not in out or out[k] is None:
            out.setdefault(k, None if type(None) in (typ if isinstance(typ, tuple) else (typ,)) else ({} if typ is dict else ([] if typ is list else "")))

    return out


def load_external_result(json_path: str) -> Dict[str, Any]:
    """读取外部结果 JSON 并规范化为本项目结构。"""
    with open(json_path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    base_dir = os.path.dirname(json_path)
    return normalize_external_result(raw, base_dir=base_dir)


def build_results_index(output_root: str) -> List[Dict[str, Any]]:
    """递归扫描 output_root 下的 analysis_report.json，汇总统一索引。"""
    index: List[Dict[str, Any]] = []
    if not os.path.isdir(output_root):
        return index
    for root, _dirs, files in os.walk(output_root):
        if "analysis_report.json" in files:
            p = os.path.join(root, "analysis_report.json")
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                task_id = os.path.basename(root)
                item = normalize_external_result(data, base_dir=root)
                item["task_id"] = task_id
                item["report_path"] = _safe_relpath(p, output_root)
                # 将图片相对路径化到 output_root，便于前端拼接静态URL
                item["image_paths"] = [
                    _safe_relpath(os.path.join(root, img) if not os.path.isabs(img) else img, output_root)
                    for img in (item.get("image_paths") or [])
                ]
                index.append(item)
            except Exception:
                continue
    return index


def write_results_index(output_root: str, filename: str = "results_index.json") -> str:
    index = build_results_index(output_root)
    out_path = os.path.join(output_root, filename)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    return out_path




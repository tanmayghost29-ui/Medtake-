#!/usr/bin/env python3
import os
import zipfile

def create_bundle(output_zip: str = "medtake_full_bundle.zip"):
    exclude_dirs = {"node_modules", ".git", "dist", ".cache", ".aistudio", "__pycache__"}
    exclude_files = {output_zip, ".DS_Store"}

    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for f in files:
                if f in exclude_files or f.endswith(".tmp") or f.endswith(".pyc"):
                    continue
                full_path = os.path.join(root, f)
                arcname = os.path.relpath(full_path, ".")
                zf.write(full_path, arcname)

    print(f"✅ Created bundle: {output_zip} ({os.path.getsize(output_zip)} bytes)")
    return output_zip

if __name__ == "__main__":
    create_bundle()

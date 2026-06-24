"""
Download Iconify icon names from main collections and save to iconify_index.json.

Usage:
    python scripts/download_iconify_index.py

Output:
    scripts/iconify_index.json
    {
        "mdi": ["heart", "coffee", "ecg-heart", ...],
        "tabler": ["star", "circle", ...],
        ...
    }
"""

import json
import time
from pathlib import Path

import httpx

# Main Iconify collections to index
COLLECTIONS = [
    "mdi",
    "tabler",
    "material-symbols",
    "fa",
    "lucide",
    "heroicons",
    "simple-icons",
    "ph",
    "bi",
    "ion",
]

ICONIFY_API_URL = "https://api.iconify.design/collection"
OUTPUT_FILE = Path(__file__).parent / "iconify_index.json"
REQUEST_DELAY = 0.5  # seconds between requests to respect rate limits


def download_collection(prefix: str, client: httpx.Client) -> list[str]:
    """Download icon names for a single collection prefix."""
    print(f"  Downloading collection: {prefix}")
    response = client.get(ICONIFY_API_URL, params={"prefix": prefix})
    response.raise_for_status()
    data = response.json()
    icon_names: list[str] = []

    # Case 1: "uncategorized" list (most collections)
    if "uncategorized" in data:
        icon_names = data["uncategorized"]

    # Case 2: "categories" dict (some collections like material-symbols)
    elif "categories" in data:
        for cat_icons in data["categories"].values():
            icon_names.extend(cat_icons)

    # Case 3: "icons" dict/list (fallback for other API formats)
    elif "icons" in data:
        raw_icons = data["icons"]
        if isinstance(raw_icons, dict):
            icon_names = list(raw_icons.keys())
        elif isinstance(raw_icons, list):
            icon_names = raw_icons

    if not icon_names:
        print(f"    WARNING: No icons found for {prefix}. Response keys: {list(data.keys())}")

    print(f"    -> {len(icon_names)} icons found")
    return icon_names


def main() -> None:
    print("Starting Iconify index download...")
    print(f"Collections: {', '.join(COLLECTIONS)}")

    index: dict[str, list[str]] = {}

    with httpx.Client(timeout=30.0) as client:
        for i, prefix in enumerate(COLLECTIONS):
            try:
                icons = download_collection(prefix, client)
                index[prefix] = icons
            except httpx.HTTPError as e:
                print(f"  ERROR downloading {prefix}: {e}")
                index[prefix] = []

            # Rate limit delay (skip after last collection)
            if i < len(COLLECTIONS) - 1:
                time.sleep(REQUEST_DELAY)

    # Write output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    total_icons = sum(len(icons) for icons in index.values())
    print(f"\nDone! Saved {total_icons} total icons to {OUTPUT_FILE}")
    print("Collections with errors (empty lists):")
    for prefix, icons in index.items():
        if not icons:
            print(f"  - {prefix}")


if __name__ == "__main__":
    main()

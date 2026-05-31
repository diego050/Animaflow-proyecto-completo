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
    raw_icons = data.get("icons", {})

    # The API returns icons as a dict {"iconName": {...}, ...}, not a list
    if isinstance(raw_icons, dict):
        icons = list(raw_icons.keys())
    elif isinstance(raw_icons, list):
        icons = raw_icons
    else:
        icons = []
        print(f"    WARNING: Unexpected icons format for {prefix}: {type(raw_icons)}")

    if not icons:
        print(f"    WARNING: No icons found for {prefix}. Response preview: {str(data)[:200]}")

    print(f"    -> {len(icons)} icons found")
    return icons


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

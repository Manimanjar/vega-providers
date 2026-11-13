#!/usr/bin/env python3
"""
Automatically detects domain redirects, TLD changes, and broken mirrors,
updating urls.json accordingly.
"""

import os
import sys
import json
import urllib.request
import urllib.error
from urllib.parse import urlparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
URLS_FILE = os.path.join(ROOT_DIR, "urls.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def resolve_domain(url, timeout=10):
    """Checks a URL, follows redirects, and returns (is_alive, final_origin)."""
    try:
        req = urllib.request.Request(url, headers=HEADERS, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            final_url = resp.geturl()
            parsed = urlparse(final_url)
            origin = f"{parsed.scheme}://{parsed.netloc}"
            return True, origin
    except Exception as e:
        # Some servers reject GET/HEAD without full browser handshake, try fallback
        return False, None

def main():
    if not os.path.exists(URLS_FILE):
        print(f"Error: {URLS_FILE} not found.", file=sys.stderr)
        sys.exit(1)

    with open(URLS_FILE, "r") as f:
        data = json.load(f)

    updated = False

    for key, provider in data.items():
        current_url = provider.get("url", "").rstrip("/")
        mirrors = provider.get("mirrors", [])
        if not current_url:
            continue

        print(f"Checking {key} (Current: {current_url})...")
        alive, final_origin = resolve_domain(current_url)

        if alive and final_origin:
            final_origin = final_origin.rstrip("/")
            if final_origin != current_url:
                print(f"  [REDIRECT DETECTED] {current_url} -> {final_origin}")
                provider["url"] = final_origin
                if final_origin not in mirrors:
                    mirrors.insert(0, final_origin)
                updated = True
            else:
                print(f"  [OK] Domain active and unchanged.")
        else:
            print(f"  [OFFLINE] {current_url} failed. Testing candidate mirrors...")
            found_working = False
            for mirror in mirrors:
                mirror = mirror.rstrip("/")
                if mirror == current_url:
                    continue
                print(f"    Testing mirror: {mirror}...")
                m_alive, m_origin = resolve_domain(mirror)
                if m_alive and m_origin:
                    m_origin = m_origin.rstrip("/")
                    print(f"    [FAILOVER SUCCESS] Switching to {m_origin}")
                    provider["url"] = m_origin
                    updated = True
                    found_working = True
                    break
            if not found_working:
                print(f"  [WARNING] None of the mirrors responded for {key}.")

    if updated:
        with open(URLS_FILE, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
        print("\nurls.json updated successfully with new domains.")
    else:
        print("\nAll domains are up-to-date. No changes needed.")

if __name__ == "__main__":
    main()

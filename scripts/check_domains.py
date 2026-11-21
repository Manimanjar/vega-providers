#!/usr/bin/env python3
"""
Automated Domain Monitor for Vega Providers (FilmyFly & Mirrors)
Checks FilmyFly central discovery API (google.analytis.top) and probes candidate mirrors.
Updates urls.json if the active domain has changed and automatically pushes to GitHub.
"""

import os
import sys
import json
import base64
import urllib.request
import urllib.error
from datetime import datetime, timezone
import subprocess

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URLS_FILE = os.path.join(REPO_DIR, "urls.json")
DISCOVERY_API = "https://google.analytis.top/analytisa"

CANDIDATE_FILMYFLY_MIRRORS = [
    "https://filmyfly.kred",
    "https://filmyfly.ee",
    "https://filmyfly.gift",
    "https://filmyfly.net",
    "https://filmyfly.ca",
    "https://filmyfly.info",
    "https://filmyfly.io"
]

CANDIDATE_PORNHUB_MIRRORS = [
    "https://www.pornhub.com",
    "https://www.pornhub.org",
    "https://www.pornhub.net",
    "https://rt.pornhub.com"
]

def load_env():
    env_file = os.path.expanduser("~/.env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

def fetch_filmyfly_discovery():
    try:
        now = datetime.now(timezone.utc)
        v = (
            now.year * 1000000
            + now.month * 10000
            + now.day * 100
            + now.hour
            + 1
        )
        url = f"{DISCOVERY_API}?v={v}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and isinstance(data, dict) and "c" in data:
                b64 = data["c"]
                decoded = base64.b64decode(b64).decode("utf-8", errors="ignore")
                if decoded.startswith("http"):
                    # strip path/query
                    from urllib.parse import urlparse
                    parsed = urlparse(decoded)
                    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    except Exception as e:
        print(f"[FilmyFly Discovery] API check failed: {e}")
    return None

def probe_mirror(url):
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            if 200 <= resp.status < 400:
                final_url = resp.geturl()
                from urllib.parse import urlparse
                parsed = urlparse(final_url)
                return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    except Exception:
        pass
    return None

def check_and_update():
    load_env()
    if not os.path.exists(URLS_FILE):
        print(f"[Error] urls.json not found at {URLS_FILE}")
        return False

    with open(URLS_FILE, "r", encoding="utf-8") as f:
        urls_data = json.load(f)

    changed = False

    # 1. FilmyFly Check
    current_ff = urls_data.get("filmyfly", {}).get("url", "")
    new_ff = fetch_filmyfly_discovery()

    if not new_ff:
        # probe mirrors
        for mirror in CANDIDATE_FILMYFLY_MIRRORS:
            probed = probe_mirror(mirror)
            if probed:
                new_ff = probed
                break

    if new_ff and new_ff != current_ff:
        print(f"[FilmyFly] Domain changed: {current_ff} -> {new_ff}")
        urls_data["filmyfly"]["url"] = new_ff
        # ensure new_ff is in mirrors list
        mirrors = urls_data["filmyfly"].get("mirrors", [])
        if new_ff not in mirrors:
            mirrors.insert(0, new_ff)
            urls_data["filmyfly"]["mirrors"] = mirrors
        changed = True
    else:
        print(f"[FilmyFly] Active domain unchanged: {current_ff}")

    # 2. PornHub Mirrors Check
    current_ph = urls_data.get("pornhub", {}).get("url", "")
    ph_mirrors = urls_data.get("pornhub", {}).get("mirrors", [])
    if ph_mirrors != CANDIDATE_PORNHUB_MIRRORS:
        urls_data["pornhub"]["mirrors"] = CANDIDATE_PORNHUB_MIRRORS
        changed = True

    if changed:
        with open(URLS_FILE, "w", encoding="utf-8") as f:
            json.dump(urls_data, f, indent=2)
            f.write("\n")
        print("[urls.json] Updated successfully.")

        # Git commit and push if inside a repo
        token = os.environ.get("GITHUB_TOKEN")
        username = os.environ.get("GITHUB_USERNAME", "Manimanjar")
        if token:
            remote_url = f"https://{username}:{token}@github.com/Manimanjar/vega-providers.git"
            try:
                subprocess.run(["git", "config", "user.name", "Vega Bot"], cwd=REPO_DIR, check=True)
                subprocess.run(["git", "config", "user.email", "bot@vega.app"], cwd=REPO_DIR, check=True)
                subprocess.run(["git", "add", "urls.json"], cwd=REPO_DIR, check=True)
                commit_msg = f"Auto-update provider domains: FilmyFly ({new_ff or current_ff})"
                subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_DIR, check=True)
                subprocess.run(["git", "push", remote_url, "main"], cwd=REPO_DIR, check=True)
                print("[Git] Committed and pushed updated urls.json to GitHub remote.")
            except Exception as e:
                print(f"[Git] Error committing/pushing urls.json: {e}")
    else:
        print("[urls.json] No updates needed.")

    return changed

if __name__ == "__main__":
    check_and_update()

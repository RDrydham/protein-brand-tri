import subprocess
import time
import sys

def start_tunnel():
    print("Starting localtunnel...")
    import os
    cmd = ["npx.cmd" if os.name == 'nt' else "npx", "localtunnel", "--port", "3000"]
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Read the first few lines to find the URL
    url = None
    for line in iter(process.stdout.readline, ""):
        print(line.strip())
        if "your url is" in line:
            url = line.strip().split("is:")[-1].strip()
            break
            
    if not url:
        # Check stderr
        err = process.stderr.read()
        print(f"Error starting tunnel: {err}", file=sys.stderr)
        return
        
    print(f"\n=============================================")
    print(f"Tunnel Active: {url}")
    print(f"=============================================\n")
    
    # Keep alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping tunnel...")
        process.terminate()

if __name__ == "__main__":
    start_tunnel()

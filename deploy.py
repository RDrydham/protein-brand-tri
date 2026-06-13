#!/usr/bin/env python3
import os
import sys
import subprocess
from ftplib import FTP

# Simple parser for .env file to avoid dependencies
def load_env():
    env = {}
    env_path = '.env'
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    if '=' in line:
                        key, val = line.split('=', 1)
                        env[key.strip()] = val.strip()
    return env

def get_modified_files():
    """Gets modified and untracked files in tri-website using git."""
    try:
        # Run git status --porcelain inside tri-website
        res = subprocess.run(
            ['git', 'status', '--porcelain', 'tri-website'],
            capture_output=True,
            text=True,
            check=True
        )
        files = []
        for line in res.stdout.splitlines():
            line = line.strip()
            if line:
                # Format: XY filepath (e.g. M tri-website/index.html)
                parts = line.split(maxsplit=1)
                if len(parts) == 2:
                    status, filepath = parts
                    # We only care about files inside tri-website
                    if filepath.startswith('tri-website/'):
                        files.append(filepath)
        return files
    except Exception as e:
        print(f"Warning: Could not get git status: {e}")
        return []

def upload_via_ftp(host, port, user, password, remote_dir, files):
    print(f"Connecting to FTP server {host}:{port}...")
    try:
        ftp = FTP()
        ftp.connect(host, int(port), timeout=15)
        ftp.login(user, password)
        print("Logged in successfully.")
        
        # Change to remote directory
        if remote_dir:
            try:
                ftp.cwd(remote_dir)
                print(f"Changed to remote directory: {remote_dir}")
            except Exception as e:
                print(f"Warning: Could not change to directory {remote_dir}. Attempting to create it...")
                try:
                    ftp.mkd(remote_dir)
                    ftp.cwd(remote_dir)
                except Exception as e2:
                    print(f"Error: Directory change failed: {e2}")
                    ftp.quit()
                    return False
        
        # Upload files
        for local_file in files:
            # We want to preserve directory structure relative to tri-website
            rel_path = os.path.relpath(local_file, 'tri-website').replace('\\', '/')
            print(f"Uploading {local_file} -> {rel_path}...")
            
            # If the file is in a subdirectory, ensure the directory exists on the server
            dir_parts = rel_path.split('/')[:-1]
            current_dir = ""
            for part in dir_parts:
                current_dir = f"{current_dir}/{part}" if current_dir else part
                try:
                    ftp.mkd(part)
                except Exception:
                    pass # Directory probably already exists
                ftp.cwd(part)
            
            # Upload the file
            filename = rel_path.split('/')[-1]
            with open(local_file, 'rb') as f:
                ftp.storbinary(f'STOR {filename}', f)
            
            # Go back to the base remote directory
            if remote_dir:
                ftp.cwd(remote_dir)
            else:
                ftp.cwd('/')
                
        ftp.quit()
        print("FTP upload completed successfully!")
        return True
    except Exception as e:
        print(f"FTP Error: {e}", file=sys.stderr)
        return False

def upload_via_sftp(host, port, user, password, remote_dir, files):
    print("SFTP protocol selected. Checking for paramiko...")
    try:
        import paramiko
    except ImportError:
        print("\nError: 'paramiko' package is required for SFTP. Please run:")
        print("  pip install paramiko")
        print("Or set DEPLOY_PROTOCOL=ftp in your .env file to use standard FTP.")
        return False
        
    print(f"Connecting to SFTP server {host}:{port}...")
    try:
        transport = paramiko.Transport((host, int(port)))
        transport.connect(username=user, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)
        print("Logged in successfully.")
        
        # Change to/ensure remote directory
        if remote_dir:
            try:
                sftp.chdir(remote_dir)
                print(f"Changed to remote directory: {remote_dir}")
            except IOError:
                print(f"Warning: Remote directory {remote_dir} not found. Attempting to create it...")
                sftp.mkdir(remote_dir)
                sftp.chdir(remote_dir)
        
        # Helper to make dir recursively on remote
        def remote_mkdir_p(remote_path):
            dirs = []
            while len(remote_path) > 1:
                dirs.append(remote_path)
                remote_path, _ = os.path.split(remote_path)
            while len(dirs) > 0:
                dir_to_make = dirs.pop()
                try:
                    sftp.mkdir(dir_to_make)
                except IOError:
                    pass

        # Upload files
        for local_file in files:
            rel_path = os.path.relpath(local_file, 'tri-website').replace('\\', '/')
            print(f"Uploading {local_file} -> {rel_path}...")
            
            # If in subdirectory, ensure remote dirs exist
            dir_parts = rel_path.split('/')[:-1]
            if dir_parts:
                remote_subdir = "/".join(dir_parts)
                remote_mkdir_p(remote_subdir)
                
            sftp.put(local_file, rel_path)
            
        sftp.close()
        transport.close()
        print("SFTP upload completed successfully!")
        return True
    except Exception as e:
        print(f"SFTP Error: {e}", file=sys.stderr)
        return False

def main():
    env = load_env()
    host = env.get('DEPLOY_HOST')
    port = env.get('DEPLOY_PORT', '21')
    user = env.get('DEPLOY_USER')
    password = env.get('DEPLOY_PASS')
    remote_dir = env.get('DEPLOY_REMOTE_DIR', '')
    protocol = env.get('DEPLOY_PROTOCOL', 'ftp').lower()
    
    if not host or not user or not password:
        print("Error: Missing credentials in .env file.")
        print("Please create a '.env' file in the project root with:")
        print("  DEPLOY_HOST=...")
        print("  DEPLOY_USER=...")
        print("  DEPLOY_PASS=...")
        sys.exit(1)
        
    files = get_modified_files()
    if not files:
        print("No modified or untracked files detected in tri-website.")
        # Ask to upload a list of core files
        ans = input("Would you like to force upload index.html, inside.html, and shop.html? (y/n): ").strip().lower()
        if ans == 'y':
            files = [
                'tri-website/index.html',
                'tri-website/inside.html',
                'tri-website/shop.html'
            ]
        else:
            sys.exit(0)
            
    print("\nFiles to deploy:")
    for f in files:
        print(f"  - {f}")
    print()
    
    confirm = input("Confirm deploy? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Deployment cancelled.")
        sys.exit(0)
        
    if protocol == 'sftp':
        success = upload_via_sftp(host, port, user, password, remote_dir, files)
    else:
        success = upload_via_ftp(host, port, user, password, remote_dir, files)
        
    if success:
        print("\nDeployment successful! Changes are now online.")
    else:
        print("\nDeployment failed.")
        sys.exit(1)

if __name__ == '__main__':
    main()

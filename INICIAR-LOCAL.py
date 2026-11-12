"""Inicia el servidor MVC de MICHOKS (requiere npm install y .env configurado)."""
import argparse
import os
from pathlib import Path
import subprocess
import shutil

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=3000)
    args=parser.parse_args()
    if not 1 <= args.port <= 65535: parser.error('Puerto inválido.')
    npm=shutil.which('npm')
    if not npm: parser.exit(1,'Instala Node.js 22 o superior.\n')
    root=Path(__file__).resolve().parent
    if not (root/'node_modules').exists(): parser.exit(1,'Ejecuta npm install primero.\n')
    env=dict(os.environ,PORT=str(args.port))
    try: subprocess.run([npm,'start'],cwd=root,env=env,check=True)
    except KeyboardInterrupt: pass
    except subprocess.CalledProcessError as e: raise SystemExit(e.returncode)

if __name__=='__main__': main()

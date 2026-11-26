"""Python 3, bez balíčkov. Štandardne prístup len z tohto počítača."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import argparse
import webbrowser

parser = argparse.ArgumentParser(description='PHE Register – lokálny prototyp')
parser.add_argument('--lan', action='store_true', help='Povoliť test na iPhone v rovnakej Wi-Fi; iba fiktívne údaje')
parser.add_argument('--port', type=int, default=4173)
args = parser.parse_args()
host = '0.0.0.0' if args.lan else '127.0.0.1'
handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).parent / 'web'))
url = f'http://127.0.0.1:{args.port}'
print(f'PHE Register: {url}\nOkno ponechajte otvorené. Zastavenie: Ctrl+C.')
if args.lan:
    print('LAN režim: v Safari použite http://IP-ADRESA-POČÍTAČA:' + str(args.port) + '. Používajte iba fiktívne údaje.')
try:
    server = ThreadingHTTPServer((host, args.port), handler)
    webbrowser.open(url)
    server.serve_forever()
except KeyboardInterrupt:
    print('\nServer zastavený.')
except OSError as error:
    print('Server sa nepodarilo spustiť:', error)

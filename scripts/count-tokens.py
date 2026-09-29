"""Exact text-only token count. Reads UTF-8 from stdin; no network/API calls at runtime after encoding cache is installed."""
import sys
import tiktoken

if __name__ == '__main__':
    name = sys.argv[1]
    if name not in ('cl100k_base', 'o200k_base'):
        raise SystemExit('Encoding no admitido')
    print(len(tiktoken.get_encoding(name).encode(sys.stdin.read())))

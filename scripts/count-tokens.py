"""Exact text-only token count. Reads UTF-8 from stdin; no network/API calls at runtime after encoding cache is installed."""
import sys
import json
import tiktoken

if __name__ == '__main__':
    name = sys.argv[1]
    if name not in ('cl100k_base', 'o200k_base'):
        raise SystemExit('Encoding no admitido')
    encoding = tiktoken.get_encoding(name)
    data = sys.stdin.read()
    if '--batch' in sys.argv[2:]:
        texts = json.loads(data)
        if not isinstance(texts, list) or not all(isinstance(x, str) for x in texts):
            raise SystemExit('Lista de textos requerida')
        print(json.dumps([len(encoding.encode(x, disallowed_special=())) for x in texts]))
    else:
        print(len(encoding.encode(data, disallowed_special=())))

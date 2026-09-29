"""Reproducible text-token study of VELIQ language on a mixed harness workload proxy.

Optional: python3 research/benchmarks/harness.py corpus.jsonl
Input JSONL rows: {"text":"...","category":"agent-instruction|code|tool-result|document","language":"en|es|..."}.
No content is uploaded or included in the aggregate report. No model calls are made.
"""
import hashlib
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import tiktoken

ROOT = Path(__file__).resolve().parents[2]


def summary(rows, encoding, c2_glossary, c3_glossary):
    count = lambda text: len(encoding.encode(text))
    glossary = count(c2_glossary)
    base = conventional = previous_concise = 0
    positive = 0
    compatible = 0
    per_call_gain = 0
    c3_glossary_tokens=count(c3_glossary)
    c3_positive=c3_per_call_gain=c3_supported=0
    for row in rows:
        natural = count(row['original'])
        previous_shorter = min(natural, count(row.get('concise',row['original'])))
        shorter = min(previous_shorter, count(row.get('scopedNatural',row['original'])))
        previous_concise += previous_shorter
        base += natural
        conventional += shorter
        if 'c2' in row:
            compatible += 1
            c2 = count(row['c2'])
            positive += max(0,shorter-c2)
            per_call_gain += max(0,shorter-c2-glossary)
        if 'c3' in row:
            c3_supported += 1
            c3=count(row['c3'])
            c3_positive += max(0,shorter-c3)
            c3_per_call_gain += max(0,shorter-c3-c3_glossary_tokens)
    glossary_used = glossary if positive > glossary else 0
    candidate = conventional-max(0,positive-glossary)
    per_call = conventional-per_call_gain
    c3_candidate=conventional-max(0,c3_positive-c3_glossary_tokens)
    return {
        'cases':len(rows),'supportedCases':compatible,
        'originalTextTokens':base,'previousConciseTextTokens':previous_concise,'conventionalTextTokens':conventional,
        'veliqOneGlossaryTextTokens':candidate,'veliqPerCallGlossaryTextTokens':per_call,
        'glossaryTextTokens':glossary,'selectedGrossGainBeforeGlossary':positive,
        'conventionalReductionPercent':round(100*(base-conventional)/base,2) if base else 0,
        'veliqTotalReductionPercent':round(100*(base-candidate)/base,2) if base else 0,
        'veliqIncrementalVsConventionalPercent':round(100*(conventional-candidate)/conventional,2) if conventional else 0,
        'veliqPerCallIncrementalPercent':round(100*(conventional-per_call)/conventional,2) if conventional else 0,
        'c3SupportedCases':c3_supported,'c3GlossaryTextTokens':c3_glossary_tokens,
        'c3OneGlossaryTextTokens':c3_candidate,
        'c3PerCallGlossaryTextTokens':conventional-c3_per_call_gain,
        'c3GrossGainBeforeGlossary':c3_positive,
        'c3TotalReductionPercent':round(100*(base-c3_candidate)/base,2) if base else 0,
        'c3IncrementalVsConventionalPercent':round(100*(conventional-c3_candidate)/conventional,2) if conventional else 0,
        'c3PerCallIncrementalPercent':round(100*c3_per_call_gain/conventional,2) if conventional else 0,
    }


def main():
    cmd=['node','--experimental-strip-types','research/benchmarks/harness-corpus.ts']
    if len(sys.argv)>1:
        cmd.append(str(Path(sys.argv[1]).resolve()))
    generated=subprocess.run(cmd,cwd=ROOT,check=True,capture_output=True,text=True).stdout
    rows=[json.loads(line) for line in generated.splitlines()]
    if not rows or (len(sys.argv)==1 and len(rows)!=1000):
        raise ValueError('Corpus faltante o inesperado')
    c2_glossary,c3_glossary=json.loads(subprocess.run(['node','--experimental-strip-types','--input-type=module','-e','import {C2_GLOSSARY,C3_GLOSSARY} from "./packages/language/glossary.ts"; console.log(JSON.stringify([C2_GLOSSARY,C3_GLOSSARY]));'],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
    result=[]
    for name in ('cl100k_base','o200k_base'):
        encoding=tiktoken.get_encoding(name)
        global_row=summary(rows,encoding,c2_glossary,c3_glossary)
        groups=defaultdict(list)
        languages=defaultdict(list)
        for row in rows:
            groups[row['category']].append(row)
            if row.get('language'):
                languages[row['language']].append(row)
        result.append({'encoding':name,'total':global_row,'byCategory':{category:summary(group,encoding,c2_glossary,c3_glossary) for category,group in sorted(groups.items())},'byLanguage':{language:summary(group,encoding,c2_glossary,c3_glossary) for language,group in sorted(languages.items())}})
    json.dump({
        'method':'Exact plain-text tokens, oracle strategy selection on a synthetic/public-repo workload proxy; not measured harness traffic',
        'corpus':('external opt-in JSONL' if len(sys.argv)>1 else '800 controlled instructions in en/es and 200 exact code/tool/document excerpts from this public repository'),
        'corpusSha256':hashlib.sha256(generated.encode()).hexdigest(),
        'tokenizer':{'library':'tiktoken','version':tiktoken.__version__,'encodings':['cl100k_base','o200k_base']},
        'glossary':c2_glossary,
        'c3Glossary':c3_glossary,
        'fidelity':'VSR/C2/C3 round-trip and controlled natural templates checked for supported cases; no LLM comprehension or task correctness measured',
        'conventionalBaseline':'Per-case minimum of original, concise natural wording, and natural wording with an ID heading; each supported alternative has the same VSR',
        'unknown':['actual harness workload distribution','provider full request and output tokens','model task accuracy','latency','money','other tokenizer families'],
        'results':result,
    },sys.stdout,ensure_ascii=False,indent=2)
    print()


if __name__=='__main__':
    main()

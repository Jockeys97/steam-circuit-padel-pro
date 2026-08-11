import json
from pathlib import Path

ROOTS = [
    Path('/Users/alessiofantini/Downloads/n8n-new-backup-2026-06-15'),
    Path('/Users/alessiofantini/Downloads/n8n-old-backup-2026-06-15'),
]

ROLE_WORDS = {
    'onboarding': 9, 'offboarding': 10, 'user': 6, 'account': 7,
    'access': 8, 'role': 6, 'admin': 5, 'ticket': 6, 'alert': 7,
    'monitor': 6, 'monitoraggio': 6, 'sync': 6, 'operativ': 5,
    'error': 8, 'logger': 8, 'daily': 3, 'giornal': 3, 'report': 4,
    'dashboard': 5, 'reminder': 3, 'controllo': 5, 'check': 4,
    'drive': 4, 'google': 3, 'calendar': 3, 'github': 5,
    'document': 4, 'docs': 4, 'approv': 7, 'approval': 7,
    'escalation': 7, 'timeout': 6, 'incident': 8, 'security': 8,
}

def text_blob(data):
    return ' '.join([
        str(data.get('name', '')),
        *[str(n.get('name', '')) for n in data.get('nodes', [])],
        *[str(n.get('type', '')) for n in data.get('nodes', [])],
    ]).lower()

rows = []
for root in ROOTS:
    for path in root.glob('*.json'):
        if path.name.startswith('_index'):
            continue
        try:
            data = json.loads(path.read_text(errors='replace'))
        except Exception:
            continue
        nodes = data.get('nodes') or []
        if not isinstance(nodes, list):
            continue
        blob = text_blob(data)
        types = [str(n.get('type', '')) for n in nodes]
        node_names = [str(n.get('name', '')) for n in nodes]
        n_http = sum('httpRequest' in t for t in types)
        n_code = sum(t.endswith('.code') for t in types)
        n_if = sum(t.endswith('.if') for t in types)
        n_merge = sum(t.endswith('.merge') for t in types)
        n_loop = sum('splitInBatches' in t for t in types)
        n_wait = sum(t.endswith('.wait') for t in types)
        n_webhook = sum(t.endswith('.webhook') for t in types)
        n_schedule = sum(('scheduleTrigger' in t or 'cron' in t) for t in types)
        n_error_trigger = sum('errorTrigger' in t for t in types)
        n_credentialed = sum(bool(n.get('credentials')) for n in nodes)
        n_error_flags = sum(bool(n.get('retryOnFail') or n.get('continueOnFail') or n.get('onError')) for n in nodes)
        has_error_workflow = bool((data.get('settings') or {}).get('errorWorkflow'))
        active = bool(data.get('active'))
        score = min(len(nodes), 55) * 0.25
        score += min(n_http, 12) * 0.7 + min(n_code, 10) * 0.35
        score += min(n_if, 6) * 1.1 + min(n_merge, 5) * 0.7 + min(n_loop, 4) * 0.8
        score += min(n_wait, 4) * 0.6 + min(n_credentialed, 10) * 0.25
        score += min(n_error_flags, 8) * 1.2 + n_error_trigger * 7
        score += 6 if has_error_workflow else 0
        score += 2 if active else 0
        score += 2 if (n_webhook or n_schedule) else 0
        matched = []
        for word, weight in ROLE_WORDS.items():
            if word in blob:
                score += weight
                matched.append(word)
        rows.append({
            'score': score, 'backup': root.name, 'file': path.name,
            'name': data.get('name') or path.stem, 'active': active,
            'nodes': len(nodes), 'http': n_http, 'code': n_code,
            'ifs': n_if, 'loops': n_loop, 'merges': n_merge,
            'err_flags': n_error_flags, 'err_wf': has_error_workflow,
            'creds': n_credentialed, 'match': ','.join(matched[:10]),
        })

rows.sort(key=lambda r: (-r['score'], -r['nodes'], r['name']))
print('score\tbackup\tactive\tnodes\thttp\tcode\tif\tloop\tmerge\terr_flags\terr_wf\tcreds\tname\tmatched\tfile')
for r in rows[:80]:
    print('\t'.join(str(r[k]) for k in ['score','backup','active','nodes','http','code','ifs','loops','merges','err_flags','err_wf','creds','name','match','file']))

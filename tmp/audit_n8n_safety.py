import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

path = Path(sys.argv[1])
data = json.loads(path.read_text(errors="replace"))

all_strings = []
parameter_strings = []
header_names = []
credential_nodes = []
nodes_with_inline_auth = []

def walk(value, key_path=""):
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{key_path}.{key}" if key_path else key
            if key.lower() in {"name"} and "headerparameters" in key_path.lower() and isinstance(child, str):
                header_names.append(child)
            walk(child, child_path)
    elif isinstance(value, list):
        for idx, child in enumerate(value):
            walk(child, f"{key_path}[{idx}]")
    elif isinstance(value, str):
        all_strings.append((key_path, value))
        if ".parameters" in key_path:
            parameter_strings.append((key_path, value))

walk(data)

for node in data.get("nodes", []):
    if node.get("credentials"):
        credential_nodes.append(node.get("name"))
    serialized = json.dumps(node.get("parameters", {}), ensure_ascii=False).lower()
    if any(marker in serialized for marker in ("authorization", "bearer ", "x-api-key", "api_key", "apikey", "client_secret")):
        nodes_with_inline_auth.append(node.get("name"))

url_re = re.compile(r"https?://[^\s\"'<>]+", re.I)
email_re = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
bearer_re = re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{12,}", re.I)
token_re = re.compile(r"\b(?:sk-|pat_|ghp_|xox[baprs]-)[A-Za-z0-9_-]{12,}", re.I)
phone_re = re.compile(r"(?<!\d)(?:\+?39)?\s?(?:3\d{2})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)")

urls, emails, bearer_hits, token_hits, phone_hits = [], [], [], [], []
for key_path, value in all_strings:
    urls.extend((key_path, u) for u in url_re.findall(value))
    emails.extend((key_path, e) for e in email_re.findall(value))
    bearer_hits.extend((key_path, "redacted") for _ in bearer_re.findall(value))
    token_hits.extend((key_path, "redacted") for _ in token_re.findall(value))
    phone_hits.extend((key_path, "redacted") for _ in phone_re.findall(value))

domains = Counter()
for _, url in urls:
    try:
        domain = urlparse(url.rstrip("),.;")).netloc.lower()
    except Exception:
        domain = ""
    if domain:
        domains[domain] += 1

prompt_like = []
for node in data.get("nodes", []):
    params = node.get("parameters", {})
    blob = json.dumps(params, ensure_ascii=False)
    if len(blob) > 1000 and any(word in blob.lower() for word in ("prompt", "perplexity", "system", "messages", "istruzioni")):
        prompt_like.append((node.get("name"), len(blob)))

print(json.dumps({
    "workflow_name": data.get("name"),
    "active": data.get("active"),
    "node_count": len(data.get("nodes", [])),
    "pin_data_present": bool(data.get("pinData")),
    "credential_reference_count": len(credential_nodes),
    "inline_auth_node_count": len(set(nodes_with_inline_auth)),
    "inline_auth_nodes": sorted(set(nodes_with_inline_auth)),
    "bearer_like_secret_count": len(bearer_hits),
    "provider_token_like_count": len(token_hits),
    "email_literal_count": len(emails),
    "phone_literal_count": len(phone_hits),
    "real_url_count": len(urls),
    "url_domains": dict(domains),
    "header_names_only": sorted(set(header_names)),
    "large_prompt_or_business_logic_nodes": prompt_like,
    "webhook_nodes": [n.get("name") for n in data.get("nodes", []) if str(n.get("type", "")).endswith(".webhook")],
}, indent=2, ensure_ascii=False))

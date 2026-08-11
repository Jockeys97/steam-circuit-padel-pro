import json
import uuid
from pathlib import Path


OUTPUT = Path("/Users/alessiofantini/Documents/Padel/output/n8n/Smart_Shopping_Perplexity_Sanitized_Portfolio.json")


_UID_COUNTER = 0


def uid():
    global _UID_COUNTER
    _UID_COUNTER += 1
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"smart-shopping-sanitized-node-{_UID_COUNTER}"))


def node(name, node_type, position, parameters, version=1, **extra):
    value = {
        "parameters": parameters,
        "id": uid(),
        "name": name,
        "type": f"n8n-nodes-base.{node_type}",
        "typeVersion": version,
        "position": position,
    }
    value.update(extra)
    return value


def http(name, position, method, url, **extra):
    parameters = {
        "method": method,
        "url": url,
        "options": {"response": {"response": {"neverError": True}}},
    }
    parameters.update(extra.pop("parameters", {}))
    return node(name, "httpRequest", position, parameters, 4.3, onError="continueErrorOutput", **extra)


def if_boolean(name, position, expression):
    return node(
        name,
        "if",
        position,
        {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "strict",
                    "version": 2,
                },
                "conditions": [
                    {
                        "id": uid(),
                        "leftValue": expression,
                        "rightValue": True,
                        "operator": {"type": "boolean", "operation": "true", "singleValue": True},
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
        2.2,
    )


nodes = [
    node(
        "Portfolio Demo Request",
        "webhook",
        [-560, 120],
        {"httpMethod": "POST", "path": "smart-shopping-portfolio-demo", "responseMode": "responseNode", "options": {}},
        2.1,
        webhookId="sanitized-smart-shopping-demo",
    ),
    node(
        "Normalize & Validate Request",
        "code",
        [-320, 120],
        {
            "jsCode": "const input = $json.body ?? $json;\nconst requestId = String(input.requestId ?? `demo-${Date.now()}`);\nconst householdId = String(input.householdId ?? 'demo-household');\nconst requestedDays = Number(input.requestedDays ?? 7);\nconst valid = requestId.length > 3 && householdId.length > 3 && requestedDays >= 1 && requestedDays <= 31;\nreturn [{ json: { requestId, householdId, requestedDays, valid, receivedAt: new Date().toISOString() } }];"
        },
        2,
    ),
    if_boolean("Valid Request?", [-80, 120], "={{ $json.valid }}"),
    node(
        "Audit Rejected Request",
        "code",
        [160, 360],
        {
            "jsCode": "return [{ json: { status: 'rejected', reason: 'Invalid demo request', requestId: $json.requestId ?? 'unknown', loggedAt: new Date().toISOString() } }];"
        },
        2,
    ),
    node(
        "Return Validation Error",
        "respondToWebhook",
        [400, 360],
        {"respondWith": "json", "responseBody": "={{ $json }}", "options": {"responseCode": 400}},
        1.4,
    ),
    http(
        "Check Idempotency",
        [160, 40],
        "GET",
        "https://api.example.com/automation-runs",
        parameters={
            "sendQuery": True,
            "queryParameters": {"parameters": [{"name": "requestId", "value": "={{ $json.requestId }}"}]},
        },
    ),
    if_boolean("Already Processed?", [400, 40], "={{ $json.alreadyProcessed ?? false }}"),
    node(
        "Return Existing Result",
        "respondToWebhook",
        [640, -120],
        {
            "respondWith": "json",
            "responseBody": "={{ { status: 'already_processed', requestId: $('Normalize & Validate Request').item.json.requestId } }}",
            "options": {"responseCode": 200},
        },
        1.4,
    ),
    http(
        "Fetch Base Shopping List",
        [640, 120],
        "GET",
        "https://api.example.com/shopping/base-list",
        parameters={
            "sendQuery": True,
            "queryParameters": {
                "parameters": [
                    {"name": "householdId", "value": "={{ $('Normalize & Validate Request').item.json.householdId }}"},
                    {"name": "days", "value": "={{ $('Normalize & Validate Request').item.json.requestedDays }}"},
                ]
            },
        },
    ),
    http(
        "Fetch Dietary Preferences",
        [880, 120],
        "GET",
        "https://api.example.com/shopping/preferences",
        parameters={
            "sendQuery": True,
            "queryParameters": {
                "parameters": [{"name": "householdId", "value": "={{ $('Normalize & Validate Request').item.json.householdId }}"}]
            },
        },
    ),
    node(
        "Prepare Ingredient Batch",
        "code",
        [1120, 120],
        {
            "jsCode": "const source = Array.isArray($json.items) ? $json.items : [\n  { ingredientId: 'demo-001', name: 'seasonal vegetables', quantity: 2, unit: 'kg', referencePrice: 3.2 },\n  { ingredientId: 'demo-002', name: 'wholegrain rice', quantity: 1, unit: 'kg', referencePrice: 2.8 },\n  { ingredientId: 'demo-003', name: 'plant protein', quantity: 4, unit: 'servings', referencePrice: 2.5 }\n];\nreturn source.map((item, index) => ({ json: { ...item, batchIndex: index, requestId: $('Normalize & Validate Request').item.json.requestId } }));"
        },
        2,
    ),
    node("Process Ingredients", "splitInBatches", [1360, 120], {"options": {}}, 3),
    http(
        "AI Price Estimate (Demo)",
        [1600, 0],
        "POST",
        "https://api.example.com/ai/price-estimate",
        parameters={
            "sendBody": True,
            "contentType": "raw",
            "rawContentType": "application/json",
            "body": "={{ JSON.stringify({ item: $json.name, quantity: $json.quantity, unit: $json.unit, market: 'demo-market', instruction: 'Return a numeric estimated unit price and a confidence score.' }) }}",
        },
    ),
    node(
        "Validate Estimate & Apply Fallback",
        "code",
        [1840, 0],
        {
            "jsCode": "const source = $('Process Ingredients').item.json;\nconst candidate = Number($json.estimatedUnitPrice);\nconst confidence = Number($json.confidence ?? 0);\nconst useAI = Number.isFinite(candidate) && candidate > 0 && confidence >= 0.65;\nconst unitPrice = useAI ? candidate : Number(source.referencePrice ?? 1);\nreturn [{ json: { ...source, unitPrice, estimatedTotal: Number((unitPrice * Number(source.quantity ?? 1)).toFixed(2)), fallbackUsed: !useAI, confidence, validatedAt: new Date().toISOString() } }];"
        },
        2,
    ),
    http(
        "Save Ingredient Estimate",
        [2080, 0],
        "POST",
        "https://api.example.com/shopping/estimates",
        parameters={
            "sendBody": True,
            "contentType": "raw",
            "rawContentType": "application/json",
            "body": "={{ JSON.stringify({ requestId: $json.requestId, ingredientId: $json.ingredientId, unitPrice: $json.unitPrice, estimatedTotal: $json.estimatedTotal, fallbackUsed: $json.fallbackUsed }) }}",
        },
    ),
    http(
        "Fetch Saved Estimates",
        [1600, 280],
        "GET",
        "https://api.example.com/shopping/estimates",
        parameters={
            "sendQuery": True,
            "queryParameters": {"parameters": [{"name": "requestId", "value": "={{ $('Normalize & Validate Request').item.json.requestId }}"}]},
        },
    ),
    node(
        "Calculate Totals",
        "code",
        [1840, 280],
        {
            "jsCode": "const rows = Array.isArray($json.items) ? $json.items : [];\nconst subtotal = rows.reduce((sum, row) => sum + Number(row.estimatedTotal ?? 0), 0);\nconst fallbackCount = rows.filter((row) => row.fallbackUsed).length;\nreturn [{ json: { requestId: $('Normalize & Validate Request').item.json.requestId, itemCount: rows.length, fallbackCount, estimatedSubtotal: Number(subtotal.toFixed(2)), currency: 'EUR', calculatedAt: new Date().toISOString() } }];"
        },
        2,
    ),
    http(
        "Save Shopping List Summary",
        [2080, 280],
        "POST",
        "https://api.example.com/shopping/summaries",
        parameters={"sendBody": True, "contentType": "raw", "rawContentType": "application/json", "body": "={{ JSON.stringify($json) }}"},
    ),
    http(
        "Fetch Delivery Preferences",
        [2320, 280],
        "GET",
        "https://api.example.com/shopping/delivery-preferences",
        parameters={
            "sendQuery": True,
            "queryParameters": {"parameters": [{"name": "householdId", "value": "={{ $('Normalize & Validate Request').item.json.householdId }}"}]},
        },
    ),
    http(
        "Generate Shopping List PDF",
        [2560, 280],
        "POST",
        "https://api.example.com/documents/render",
        parameters={
            "sendBody": True,
            "contentType": "raw",
            "rawContentType": "application/json",
            "body": "={{ JSON.stringify({ template: 'shopping-list-demo', requestId: $('Normalize & Validate Request').item.json.requestId, data: $json }) }}",
        },
    ),
    http(
        "Send Shopping List Notification",
        [2800, 120],
        "POST",
        "https://api.example.com/notifications/send",
        parameters={
            "sendBody": True,
            "contentType": "raw",
            "rawContentType": "application/json",
            "body": "={{ JSON.stringify({ channel: 'configured-recipient', documentId: $json.documentId, requestId: $('Normalize & Validate Request').item.json.requestId }) }}",
        },
    ),
    node(
        "Prepare PDF Upload",
        "code",
        [2800, 360],
        {
            "jsCode": "return [{ json: { requestId: $('Normalize & Validate Request').item.json.requestId, fileName: `shopping-list-${$('Normalize & Validate Request').item.json.requestId}.pdf`, contentRef: $json.documentRef ?? 'demo-document-reference', contentType: 'application/pdf' } }];"
        },
        2,
    ),
    http(
        "Upload PDF",
        [3040, 360],
        "POST",
        "https://api.example.com/storage/documents",
        parameters={"sendBody": True, "contentType": "raw", "rawContentType": "application/json", "body": "={{ JSON.stringify($json) }}"},
    ),
    http(
        "Save Document Record",
        [3280, 360],
        "POST",
        "https://api.example.com/documents/records",
        parameters={
            "sendBody": True,
            "contentType": "raw",
            "rawContentType": "application/json",
            "body": "={{ JSON.stringify({ requestId: $('Normalize & Validate Request').item.json.requestId, storageId: $json.storageId ?? 'demo-storage-id', status: 'ready' }) }}",
        },
    ),
    http(
        "Write Success Audit Log",
        [3520, 360],
        "POST",
        "https://api.example.com/audit/events",
        parameters={
            "sendBody": True,
            "contentType": "raw",
            "rawContentType": "application/json",
            "body": "={{ JSON.stringify({ requestId: $('Normalize & Validate Request').item.json.requestId, event: 'shopping_list_completed', status: 'success', timestamp: new Date().toISOString() }) }}",
        },
    ),
    node(
        "Return Success",
        "respondToWebhook",
        [3760, 360],
        {
            "respondWith": "json",
            "responseBody": "={{ { status: 'completed', requestId: $('Normalize & Validate Request').item.json.requestId, documentStatus: 'ready' } }}",
            "options": {"responseCode": 200},
        },
        1.4,
    ),
    node(
        "Central Error Normalizer",
        "code",
        [2320, 680],
        {
            "jsCode": "const source = $json;\nreturn [{ json: { status: 'failed_safely', requestId: (() => { try { return $('Normalize & Validate Request').item.json.requestId; } catch { return 'unknown'; } })(), errorType: source.error?.name ?? 'IntegrationError', message: 'A demo integration step failed. Sensitive error details are intentionally excluded.', retryable: true, loggedAt: new Date().toISOString() } }];"
        },
        2,
    ),
    http(
        "Write Failure Audit Log",
        [2560, 680],
        "POST",
        "https://api.example.com/audit/events",
        parameters={"sendBody": True, "contentType": "raw", "rawContentType": "application/json", "body": "={{ JSON.stringify($json) }}"},
    ),
    node(
        "Return Safe Error",
        "respondToWebhook",
        [2800, 680],
        {"respondWith": "json", "responseBody": "={{ $json }}", "options": {"responseCode": 503}},
        1.4,
    ),
    node(
        "About This Portfolio Workflow",
        "stickyNote",
        [-600, -300],
        {
            "content": "## Sanitized portfolio workflow\nA safe reconstruction of an automation designed and built independently. Production endpoints, credentials, personal data and proprietary business rules have been removed. The workflow is inactive by default.",
            "height": 220,
            "width": 660,
            "color": 5,
        },
        1,
    ),
    node(
        "Stage 1 Note",
        "stickyNote",
        [-600, -40],
        {"content": "## 1 · Intake and safety\nInput validation, request tracing and idempotency prevent malformed or duplicate executions.", "height": 360, "width": 1250, "color": 6},
        1,
    ),
    node(
        "Stage 2 Note",
        "stickyNote",
        [680, -240],
        {"content": "## 2 · Data enrichment and AI pricing\nIngredients are processed in batches. Every AI estimate is validated and falls back to a reference price when confidence is insufficient.", "height": 700, "width": 1640, "color": 4},
        1,
    ),
    node(
        "Stage 3 Note",
        "stickyNote",
        [2350, -40],
        {"content": "## 3 · Delivery and observability\nThe workflow produces a document, delivers a notification, stores an audit record and routes integration failures through a safe centralized handler.", "height": 920, "width": 1660, "color": 3},
        1,
    ),
]


connections = {}


def connect(source, target, source_output=0, target_input=0):
    outputs = connections.setdefault(source, {"main": []})["main"]
    while len(outputs) <= source_output:
        outputs.append([])
    outputs[source_output].append({"node": target, "type": "main", "index": target_input})


connect("Portfolio Demo Request", "Normalize & Validate Request")
connect("Normalize & Validate Request", "Valid Request?")
connect("Valid Request?", "Check Idempotency", 0)
connect("Valid Request?", "Audit Rejected Request", 1)
connect("Audit Rejected Request", "Return Validation Error")
connect("Check Idempotency", "Already Processed?", 0)
connect("Check Idempotency", "Central Error Normalizer", 1)
connect("Already Processed?", "Return Existing Result", 0)
connect("Already Processed?", "Fetch Base Shopping List", 1)
connect("Fetch Base Shopping List", "Fetch Dietary Preferences", 0)
connect("Fetch Base Shopping List", "Central Error Normalizer", 1)
connect("Fetch Dietary Preferences", "Prepare Ingredient Batch", 0)
connect("Fetch Dietary Preferences", "Central Error Normalizer", 1)
connect("Prepare Ingredient Batch", "Process Ingredients")
connect("Process Ingredients", "AI Price Estimate (Demo)", 0)
connect("Process Ingredients", "Fetch Saved Estimates", 1)
connect("AI Price Estimate (Demo)", "Validate Estimate & Apply Fallback", 0)
connect("AI Price Estimate (Demo)", "Validate Estimate & Apply Fallback", 1)
connect("Validate Estimate & Apply Fallback", "Save Ingredient Estimate")
connect("Save Ingredient Estimate", "Process Ingredients", 0)
connect("Save Ingredient Estimate", "Central Error Normalizer", 1)
connect("Fetch Saved Estimates", "Calculate Totals", 0)
connect("Fetch Saved Estimates", "Central Error Normalizer", 1)
connect("Calculate Totals", "Save Shopping List Summary")
connect("Save Shopping List Summary", "Fetch Delivery Preferences", 0)
connect("Save Shopping List Summary", "Central Error Normalizer", 1)
connect("Fetch Delivery Preferences", "Generate Shopping List PDF", 0)
connect("Fetch Delivery Preferences", "Central Error Normalizer", 1)
connect("Generate Shopping List PDF", "Send Shopping List Notification", 0)
connect("Generate Shopping List PDF", "Prepare PDF Upload", 0)
connect("Generate Shopping List PDF", "Central Error Normalizer", 1)
connect("Send Shopping List Notification", "Write Success Audit Log", 0)
connect("Send Shopping List Notification", "Central Error Normalizer", 1)
connect("Prepare PDF Upload", "Upload PDF")
connect("Upload PDF", "Save Document Record", 0)
connect("Upload PDF", "Central Error Normalizer", 1)
connect("Save Document Record", "Write Success Audit Log", 0)
connect("Save Document Record", "Central Error Normalizer", 1)
connect("Write Success Audit Log", "Return Success", 0)
connect("Write Success Audit Log", "Central Error Normalizer", 1)
connect("Central Error Normalizer", "Write Failure Audit Log")
connect("Write Failure Audit Log", "Return Safe Error", 0)
connect("Write Failure Audit Log", "Return Safe Error", 1)


workflow = {
    "name": "Smart Shopping with AI Price Estimation - Sanitized Portfolio Demo",
    "nodes": nodes,
    "pinData": {},
    "connections": connections,
    "active": False,
    "settings": {
        "executionOrder": "v1",
        "saveDataErrorExecution": "all",
        "saveDataSuccessExecution": "all",
        "saveManualExecutions": True,
        "callerPolicy": "workflowsFromSameOwner",
        "availableInMCP": False,
    },
    "versionId": uid(),
    "meta": {"templateCredsSetupCompleted": True},
    "tags": [],
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n")
print(OUTPUT)

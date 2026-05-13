import json, sys
from collections import Counter

ADV_PATH = "/var/folders/bw/hb4jhww91jg7ty101cvn76980000gn/T/claude-hostloop-plugins/0203339e77167a9f/projects/-Users-philipgizzie-Library-Application-Support-Claude-local-agent-mode-sessions-67fafd7b-b86d-44fe-bfb0-32793fe4ee2f-eeb62b6c-aa68-4213-b52c-dec39daa54d7-local-b7943d9e-792c-4953-9d7e-63795c3a9540-ou-murae8/c2c921dd-dd19-4d5e-b42e-d5aba5a1dcfe/tool-results/mcp-6e093f45-7498-412d-81b2-88697d9505b5-get_advisors-1777874244133.txt"

raw = open(ADV_PATH).read()
data = json.loads(raw)
text = data[0]["text"]
inner = json.loads(text)
lints = inner["result"]["lints"]
print("Total lints:", len(lints))

by_name_level = Counter((l["name"], l["level"]) for l in lints)
print("\nLint types (sorted by count):")
for (n, l), cnt in sorted(by_name_level.items(), key=lambda x: -x[1]):
    print(f"  {l:5}  {cnt:4}  {n}")

errs = [l for l in lints if l["level"] == "ERROR"]
print(f"\nERROR-level lints ({len(errs)}):")
for l in errs[:30]:
    detail = l.get("detail", "")
    print(f"  {l['name']}: {detail[:140]}")

warns = [l for l in lints if l["level"] == "WARN"]
seen = set()
print(f"\nWARN-level lints ({len(warns)}) — first 20 distinct types with sample detail:")
for l in warns:
    if l["name"] not in seen:
        seen.add(l["name"])
        detail = l.get("detail", "")
        print(f"  {l['name']}: {detail[:140]}")
        if len(seen) >= 20:
            break

"""Verify actual upstream resolver results for both project tool installations."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
EXPECTED = {"lj-theo", "lj-poppy", "lj-akari", "lj-access", "lj-soren", "lj-mei", "lj-mina", "lj-vera"}


def resolve(script, *args):
    result = subprocess.run(
        [sys.executable, "-B", str(ROOT / script), *args], cwd=ROOT,
        check=True, capture_output=True, text=True, encoding="utf-8", timeout=60,
    )
    return json.loads(result.stdout)


def require(condition, message):
    if not condition:
        raise SystemExit(message)


core = resolve("_bmad/scripts/resolve_config.py", "--project-root", str(ROOT), "--key", "core")["core"]
require(core["project_name"] == "little-joys", "Wrong project config")
require(core["user_name"] == "Human", "Unexpected personal config")
require(core["output_folder"] == ".local/toy-studio-output", "Unreviewed output must be ignored")
for tool in (".agents", ".claude"):
    skill = f"{tool}/skills/bmad-party-mode"
    args = ("--project-root", str(ROOT), "--skill", skill)
    workflow = resolve("_bmad/scripts/resolve_customization.py", *args, "--key", "workflow")["workflow"]
    require(workflow["party_memory"] is False, "Default memory must be off")
    party = resolve(f"{skill}/scripts/resolve_party.py", *args)
    require(party["active"] == "little-joys-studio", "Wrong active party")
    require(party["party_mode"] == "auto", "Wrong party mode")
    require(party["memory_enabled"] is False, "Named party memory must be off")
    require(party["installed_agents_resolved"] is True, "Upstream agents did not resolve")
    require(not party["unresolved"], "Unresolved roster members")
    require({member["code"] for member in party["members"]} == EXPECTED, "Wrong roster")
    print(f"{tool}: little-joys-studio, 8 resolved members, auto mode, memory off")
print("Configuration checks passed; no Party session or runtime sprint was executed.")

import importlib.util
from pathlib import Path


def _load_server():
    root = Path(__file__).resolve().parents[1]
    script_path = root / "dashboard" / "server.py"
    spec = importlib.util.spec_from_file_location("server", script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_resolve_openclaw_cmd_prefers_windows_cmd(monkeypatch):
    server = _load_server()
    monkeypatch.setattr(server, "_OPENCLAW_CMD", None)
    monkeypatch.setattr(server.os, "name", "nt")
    monkeypatch.setenv("APPDATA", r"C:\Users\20961\AppData\Roaming")

    def fake_exists(path):
        return str(path).endswith(r"npm\openclaw.cmd")

    monkeypatch.setattr(server.pathlib.Path, "exists", fake_exists, raising=False)
    monkeypatch.setattr(server.shutil, "which", lambda cmd: None)

    resolved = server._resolve_openclaw_cmd()
    assert resolved.endswith(r"npm\openclaw.cmd")

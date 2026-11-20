import json
import types
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import eventos_mcp as module


class MaterialBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.scope = patch.object(module, "KNOWLEDGE_DIR", self.root)
        self.scope.start()
        self.addCleanup(self.scope.stop)

    def test_only_inventory_ids_can_be_read(self):
        for value in ["../config", "/etc/passwd", "SOUL.md", "06", "02/../03"]:
            with self.assertRaises(ValueError):
                module.material_path(value)

    def test_reads_only_known_text_file_and_reports_missing_images(self):
        name = module.MATERIALS["03"][1] + "-ficha.md"
        (self.root / name).write_text("Contenido de prueba", encoding="utf-8")
        self.assertEqual(module.read_text("03")["text"], "Contenido de prueba")
        entry = module.list_materials()["materials"][1]
        self.assertTrue(entry["text_available"])
        self.assertFalse(entry["slide_available"])

    def test_refuses_oversize_text(self):
        (self.root / (module.MATERIALS["02"][1] + "-ficha.md")).write_bytes(b"a" * 131073)
        with self.assertRaises(ValueError):
            module.read_text("02")

    def test_refuses_symlink_outside_inventory_directory(self):
        with tempfile.TemporaryDirectory() as other:
            target = Path(other) / "private.txt"
            target.write_text("private")
            try:
                (self.root / (module.MATERIALS["02"][1] + "-ficha.md")).symlink_to(target)
            except OSError:
                self.skipTest("Symlinks require a privilege unavailable on this Windows host; run on VPS too")
            with self.assertRaises(ValueError):
                module.read_text("02")


class PublicInformationTests(unittest.TestCase):
    def test_registered_mcp_tool_exposes_public_presentation_without_private_materials(self):
        # Exercise the actual tool registration without the SDK, network or registrations.
        registered = {}
        class Server:
            def __init__(self, *args): pass
            def tool(self, **kwargs):
                def register(fn):
                    registered[fn.__name__] = fn
                    return fn
                return register
            def run(self, **kwargs): pass
        modules = {
            'mcp': types.ModuleType('mcp'),
            'mcp.server': types.ModuleType('mcp.server'),
            'mcp.server.mcpserver': types.ModuleType('mcp.server.mcpserver'),
            'mcp.types': types.ModuleType('mcp.types'),
        }
        modules['mcp.server'].MCPServer = Server
        modules['mcp.server.mcpserver'].Image = lambda **kwargs: None
        modules['mcp.types'].ToolAnnotations = lambda **kwargs: None
        context = {
            'event': {'id': module.EVENT_ID, 'slug': module.EVENT_SLUG},
            'presentation_url': 'https://www.leandrovelasques.com.ar/presentacion/e348e08c-b0d3-46fd-a108-cfeff2eb8290',
        }
        class Response:
            status = 200
            headers = {'Content-Type': 'application/json'}
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): return json.dumps(context).encode()
        with patch.dict(sys.modules, modules), patch.object(module, 'build_opener') as opener:
            opener.return_value.open.return_value = Response()
            module.run_server()
            result = registered['get_event_information']()
        self.assertEqual(result, context)
        self.assertNotIn('get_registration_status', registered)
        self.assertEqual(set(result), {'event', 'presentation_url'})


if __name__ == "__main__":
    unittest.main()

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


if __name__ == "__main__":
    unittest.main()

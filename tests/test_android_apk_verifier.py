import importlib.util
import struct
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("apk_verifier", Path(__file__).resolve().parents[1] / "scripts/verify-android-release.py")
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


class ApkVerifierTests(unittest.TestCase):
    def test_only_compiled_false_export_is_accepted(self):
        block = 'Function<>(8 params):\n LoadConstString r2, "PANELUI_PREVIEW"\n LoadConstFalse r0\n StoreNPToEnvironment r1, 0, r0\n'
        verifier.fixture_mode_disabled(block)
        for wrong in [block.replace('LoadConstFalse', 'LoadConstTrue'), block.replace('r1, 0, r0', 'r1, 0, r2'), block * 2, '']:
            with self.assertRaises(AssertionError):
                verifier.fixture_mode_disabled(wrong)

    def test_elf_rejects_4kb_and_corrupt_headers(self):
        elf = bytearray(120)
        elf[:6] = b'\x7fELF\x02\x01'
        struct.pack_into('<Q', elf, 32, 64)
        struct.pack_into('<HH', elf, 54, 56, 1)
        struct.pack_into('<I', elf, 64, 1)
        struct.pack_into('<Q', elf, 112, 16384)
        self.assertEqual(verifier.elf_load_alignments(elf), [16384])
        struct.pack_into('<Q', elf, 112, 4096)
        with self.assertRaises(AssertionError):
            verifier.elf_load_alignments(elf)
        with self.assertRaises(AssertionError):
            verifier.elf_load_alignments(b'invalid')


if __name__ == '__main__':
    unittest.main()

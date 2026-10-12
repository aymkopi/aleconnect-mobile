"""Verify the actual standalone APK before any GitHub publication (stdlib only)."""
import hashlib
import json
import os
import re
import struct
import subprocess
import tempfile
import zipfile
from pathlib import Path

CERTIFICATE = "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c"
PACKAGE = "com.kapecakes.aleconnectmobile"


def fixture_mode_disabled(dump):
    matches = [block for block in re.split(r"(?m)^Function<", dump)
               if re.search(r'LoadConstString\s+r\d+,\s*"PANELUI_PREVIEW"', block)]
    assert len(matches) == 1, "Expected exactly one compiled fixture-mode export"
    assert re.search(r"LoadConstFalse\s+(r\d+)\s*\n\s*StoreNPToEnvironment\s+r\d+, 0, \1", matches[0]), "Fixtures are not compiled off"


def elf_load_alignments(data):
    assert data[:6] == b"\x7fELF\x02\x01", "Require a little-endian 64-bit ELF"
    offset = struct.unpack_from("<Q", data, 32)[0]
    size, count = struct.unpack_from("<HH", data, 54)
    assert size >= 56 and offset + size * count <= len(data), "Invalid ELF program header"
    loads = []
    for index in range(count):
        entry = offset + index * size
        if struct.unpack_from("<I", data, entry)[0] == 1:
            file_offset, address = struct.unpack_from("<QQ", data, entry + 8)
            alignment = struct.unpack_from("<Q", data, entry + 48)[0]
            assert alignment >= 16384 and file_offset % 16384 == address % 16384, "Native library is not 16 KB aligned"
            loads.append(alignment)
    assert loads, "No native load segments"
    return loads


def verify():
    root = Path.cwd()
    output = root / "release"
    metadata_path = output / "build-metadata.json"
    metadata = json.loads(metadata_path.read_text())
    apk = root / "android/app/build/outputs/apk/preview/app-preview.apk"
    sdk = Path(os.environ["ANDROID_HOME"])
    tools = sdk / "build-tools/36.0.0"
    suffix = ".exe" if os.name == "nt" else ""
    aapt = tools / ("aapt" + suffix)
    signer = tools / ("apksigner.bat" if os.name == "nt" else "apksigner")
    signature = subprocess.check_output([str(signer), "verify", "--verbose", "--print-certs", str(apk)], text=True)
    assert "Verified using v2 scheme (APK Signature Scheme v2): true" in signature
    assert f"certificate SHA-256 digest: {CERTIFICATE}" in signature, "Original signer changed"
    badging = subprocess.check_output([str(aapt), "dump", "badging", str(apk)], text=True)
    assert f"name='{PACKAGE}'" in badging
    assert f"versionCode='{metadata['versionCode']}'" in badging
    assert f"versionName='{metadata['version']}'" in badging
    assert "sdkVersion:'24'" in badging and "targetSdkVersion:'36'" in badging
    assert "application-debuggable" not in badging, "APK needs a standalone release runtime"
    manifest = subprocess.check_output([str(aapt), "dump", "xmltree", str(apk), "AndroidManifest.xml"], text=True)
    assert "android.permission.POST_NOTIFICATIONS" in manifest
    subprocess.run([str(tools / ("zipalign" + suffix)), "-c", "-P", "16", "4", str(apk)], check=True)
    with zipfile.ZipFile(apk) as archive:
        assert archive.testzip() is None, "Corrupt APK ZIP entry"
        libraries = [name for name in archive.namelist() if name.startswith("lib/") and name.endswith(".so")]
        assert {name.split('/')[1] for name in libraries} == {"arm64-v8a", "x86_64"}
        for name in libraries:
            elf_load_alignments(archive.read(name))
        bundle = archive.read("assets/index.android.bundle")
        assert b"https://api.aleconnect.app" in bundle, "Live HTTPS API is missing"
    with tempfile.TemporaryDirectory(prefix="aleconnect-apk-") as temporary:
        bundle_path = Path(temporary) / "index.android.bundle"
        bundle_path.write_bytes(bundle)
        hermes_path = root / "node_modules/hermes-compiler/hermesc" / ("win64-bin/hermesc.exe" if os.name == "nt" else "linux64-bin/hermesc")
        dump_path = Path(temporary) / "hermes.txt"
        with dump_path.open("w", encoding="utf-8") as stream:
            subprocess.run([str(hermes_path), "-b", "-dump-bytecode", str(bundle_path)], stdout=stream, check=True)
        fixture_mode_disabled(dump_path.read_text(encoding="utf-8"))
    payload = apk.read_bytes()
    digest = hashlib.sha256(payload).hexdigest()
    (output / metadata['fileName']).write_bytes(payload)
    (output / "SHA256SUMS").write_text(f"{digest}  {metadata['fileName']}\n", encoding="utf-8")
    metadata.update(sha256=digest, bytes=len(payload), package=PACKAGE, certificateSha256=CERTIFICATE,
                    nativeLibraries=len(libraries), abis=["arm64-v8a", "x86_64"], elf16KbAligned=True,
                    zip16KbAligned=True, debuggable=False, fixtureMode=False, api="https://api.aleconnect.app")
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    verify()

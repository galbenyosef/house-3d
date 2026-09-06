"""Fetch four self-hosted CC0 PBR sets from the publishers' official APIs."""
import hashlib
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public/textures/pbr"
USER_AGENT = "HouseGPT-asset-preparation/1.0"
SELECTION = {
    "smoked_walnut_veneer": {"color": "Diffuse", "normal": "nor_gl", "roughness": "Rough"},
    "leather_white": {"normal": "nor_gl", "roughness": "Rough"},
    "fabric_pattern_05": {"normal": "nor_gl", "roughness": "Rough"},
}


def fetch(url):
    with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=60) as response:
        return response.read()


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = {"license": "CC0-1.0", "licenseUrls": ["https://polyhaven.com/license", "https://docs.ambientcg.com/license/"],
                "resolution": "1k", "assets": {}}
    total = 0
    for asset_id, channels in SELECTION.items():
        info = json.loads(fetch("https://api.polyhaven.com/info/" + asset_id))
        files = json.loads(fetch("https://api.polyhaven.com/files/" + asset_id))
        entry = {"id": asset_id, "source": "https://polyhaven.com/a/" + asset_id,
                 "authors": list(info["authors"]), "scanSizeMillimeters": info["dimensions"],
                 "textures": {}}
        for role, channel in channels.items():
            remote = files[channel]["1k"]["jpg"]
            filename = remote["url"].rsplit("/", 1)[-1]
            path = DEST / filename
            content = path.read_bytes() if path.exists() else fetch(remote["url"])
            if len(content) != remote["size"] or hashlib.md5(content).hexdigest() != remote["md5"]:
                raise ValueError("Official file checksum mismatch: " + filename)
            total += len(content)
            if total > 15_000_000:
                raise ValueError("PBR download budget exceeded")
            path.write_bytes(content)
            entry["textures"][role] = {
                "path": "textures/pbr/" + filename, "url": remote["url"],
                "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(),
                "colorSpace": "sRGB" if role == "color" else "Non-Color", "resolution": [1024, 1024],
            }
            print(filename, len(content), flush=True)
        manifest["assets"][asset_id] = entry
    # Marble012 is a seamless authored PBR material. Poly Haven marble_01 was
    # rejected because its tile grout would be unsuitable on an unbroken tabletop.
    marble_info = json.loads(fetch("https://ambientcg.com/api/v2/full_json?id=Marble012&include=downloadData"))
    marble = next(asset for asset in marble_info["foundAssets"] if asset["assetId"] == "Marble012")
    package = next(file for file in marble["downloadFolders"]["default"]["downloadFiletypeCategories"]["zip"]["downloads"] if file["attribute"] == "1K-JPG")
    if total + package["size"] > 15_000_000:
        raise ValueError("PBR download budget exceeded")
    archive_bytes = fetch(package["downloadLink"])
    if len(archive_bytes) != package["size"]:
        raise ValueError("Official archive size mismatch")
    entry = {"id": "Marble012", "source": marble["shortLink"], "authors": ["ambientCG"],
             "creationMethod": marble["creationMethod"], "sizeMeters": 1.8,
             "scaleBasis": "design scale; publisher specifies no physical capture size",
             "archiveUrl": package["downloadLink"], "archiveBytes": len(archive_bytes),
             "archiveSha256": hashlib.sha256(archive_bytes).hexdigest(), "textures": {}}
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        for role, suffix in {"color": "Color", "normal": "NormalGL", "roughness": "Roughness"}.items():
            filename = "Marble012_1K-JPG_" + suffix + ".jpg"
            content = archive.read(filename)
            (DEST / filename).write_bytes(content)
            total += len(content)
            entry["textures"][role] = {"path": "textures/pbr/" + filename, "bytes": len(content),
                                       "sha256": hashlib.sha256(content).hexdigest(),
                                       "colorSpace": "sRGB" if role == "color" else "Non-Color", "resolution": [1024, 1024]}
            print(filename, len(content), flush=True)
    manifest["assets"]["Marble012"] = entry
    manifest["totalTextureBytes"] = total
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Verified total:", total, "bytes", flush=True)


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "image"
OUTPUT_DIR = SOURCE_DIR / "optimized"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
TARGET_WIDTHS = (480, 800, 1200)

WEBP_QUALITY = {480: 72, 800: 78, 1200: 82}
AVIF_QUALITY = {480: 46, 800: 52, 1200: 58}


def normalize(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    if image.mode in {"RGBA", "LA"}:
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        return background
    return image.convert("RGB")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict] = {}
    input_bytes = 0
    webp_bytes = 0
    avif_bytes = 0

    sources = sorted(
        path
        for path in SOURCE_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )

    for source in sources:
        input_bytes += source.stat().st_size
        with Image.open(source) as opened:
            image = normalize(opened)

        original_width, original_height = image.size
        variants = []

        for width in TARGET_WIDTHS:
            height = round(original_height * width / original_width)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
            webp_path = OUTPUT_DIR / f"{source.stem}-{width}.webp"
            avif_path = OUTPUT_DIR / f"{source.stem}-{width}.avif"

            resized.save(
                webp_path,
                "WEBP",
                quality=WEBP_QUALITY[width],
                method=6,
                optimize=True,
            )
            resized.save(
                avif_path,
                "AVIF",
                quality=AVIF_QUALITY[width],
                speed=6,
            )

            webp_bytes += webp_path.stat().st_size
            avif_bytes += avif_path.stat().st_size
            variants.append(
                {
                    "width": width,
                    "height": height,
                    "webp": f"image/optimized/{webp_path.name}",
                    "avif": f"image/optimized/{avif_path.name}",
                    "webp_bytes": webp_path.stat().st_size,
                    "avif_bytes": avif_path.stat().st_size,
                }
            )

        manifest[source.stem] = {
            "original": f"image/{source.name}",
            "original_width": original_width,
            "original_height": original_height,
            "original_bytes": source.stat().st_size,
            "variants": variants,
        }

    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "widths": TARGET_WIDTHS,
                "input_bytes": input_bytes,
                "webp_bytes": webp_bytes,
                "avif_bytes": avif_bytes,
                "images": manifest,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "images": len(manifest),
                "input_bytes": input_bytes,
                "webp_bytes": webp_bytes,
                "avif_bytes": avif_bytes,
                "generated_files": len(manifest) * len(TARGET_WIDTHS) * 2,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

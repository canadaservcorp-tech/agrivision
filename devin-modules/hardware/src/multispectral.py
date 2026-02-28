"""
Agrivision Multispectral / NDVI Module
Calculates NDVI from Pi Camera 3 NoIR with blue filter.
For true multispectral, upgrade to separate NIR sensor.

NDVI = (NIR - RED) / (NIR + RED)
With NoIR camera + blue filter: approximate using Blue channel as NIR proxy.

Install: pip install numpy Pillow
"""

import json
import logging
import numpy as np
from datetime import datetime
from pathlib import Path
from PIL import Image

logger = logging.getLogger('agrivision.multispectral')


class MultispectralAnalyzer:
    """NDVI and vegetation index calculator for crop health monitoring."""

    def __init__(self, output_dir="/home/agrivision/data/ndvi"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def calculate_ndvi(self, image_path: str) -> dict:
        """
        Calculate NDVI from a camera image.
        With standard Pi Camera 3: uses green/red ratio as vegetation proxy.
        With NoIR + blue filter: uses blue channel as NIR approximation.
        """
        try:
            img = Image.open(image_path)
            arr = np.array(img, dtype=np.float32)

            if arr.ndim != 3 or arr.shape[2] < 3:
                return {"error": "Image must be RGB", "ndvi_mean": None}

            red = arr[:, :, 0]
            green = arr[:, :, 1]
            blue = arr[:, :, 2]

            # NDVI approximation using blue as NIR proxy (NoIR camera)
            # For standard camera, use VARI: (green - red) / (green + red - blue)
            nir_proxy = blue  # With NoIR + blue filter
            denominator = nir_proxy + red
            denominator[denominator == 0] = 1  # Avoid division by zero

            ndvi = (nir_proxy - red) / denominator
            ndvi = np.clip(ndvi, -1.0, 1.0)

            # Also calculate VARI (Visible Atmospherically Resistant Index)
            vari_denom = green + red - blue
            vari_denom[vari_denom == 0] = 1
            vari = (green - red) / vari_denom
            vari = np.clip(vari, -1.0, 1.0)

            # Generate NDVI heatmap
            ndvi_path = self._save_ndvi_map(ndvi, image_path)

            # Zone analysis (divide image into grid)
            zones = self._analyze_zones(ndvi, grid_size=4)

            result = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "source_image": str(image_path),
                "ndvi_map": str(ndvi_path),
                "ndvi_mean": round(float(np.mean(ndvi)), 4),
                "ndvi_std": round(float(np.std(ndvi)), 4),
                "ndvi_min": round(float(np.min(ndvi)), 4),
                "ndvi_max": round(float(np.max(ndvi)), 4),
                "vari_mean": round(float(np.mean(vari)), 4),
                "healthy_pct": round(float(np.sum(ndvi > 0.3) / ndvi.size * 100), 1),
                "stressed_pct": round(float(np.sum((ndvi > 0.1) & (ndvi <= 0.3)) / ndvi.size * 100), 1),
                "bare_soil_pct": round(float(np.sum(ndvi <= 0.1) / ndvi.size * 100), 1),
                "zones": zones,
                "health_status": self._classify_health(float(np.mean(ndvi)))
            }

            logger.info(f"NDVI analysis complete: mean={result['ndvi_mean']}, health={result['health_status']}")
            return result

        except Exception as e:
            logger.error(f"NDVI calculation error: {e}")
            return {"error": str(e), "ndvi_mean": None}

    def _save_ndvi_map(self, ndvi: np.ndarray, source_path: str) -> Path:
        """Generate and save a color-coded NDVI heatmap."""
        # Normalize to 0-255
        normalized = ((ndvi + 1) / 2 * 255).astype(np.uint8)

        # Color map: red (bare) → yellow (stressed) → green (healthy)
        h, w = normalized.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        # Red channel: high for low NDVI
        rgb[:, :, 0] = np.clip(255 - normalized * 2, 0, 255)
        # Green channel: high for high NDVI
        rgb[:, :, 1] = np.clip(normalized * 2, 0, 255)
        # Blue channel: low overall
        rgb[:, :, 2] = np.clip(normalized // 4, 0, 60)

        img = Image.fromarray(rgb)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        output_path = self.output_dir / f"ndvi_{timestamp}.jpg"
        img.save(output_path, quality=85)
        return output_path

    def _analyze_zones(self, ndvi: np.ndarray, grid_size: int = 4) -> list:
        """Divide image into grid zones and analyze each."""
        h, w = ndvi.shape
        zone_h, zone_w = h // grid_size, w // grid_size
        zones = []

        for row in range(grid_size):
            for col in range(grid_size):
                zone = ndvi[row * zone_h:(row + 1) * zone_h, col * zone_w:(col + 1) * zone_w]
                mean_val = float(np.mean(zone))
                zones.append({
                    "row": row, "col": col,
                    "ndvi_mean": round(mean_val, 4),
                    "status": self._classify_health(mean_val),
                    "needs_attention": mean_val < 0.2
                })

        return zones

    def _classify_health(self, ndvi_mean: float) -> str:
        """Classify vegetation health from NDVI value."""
        if ndvi_mean > 0.5: return "excellent"
        if ndvi_mean > 0.3: return "healthy"
        if ndvi_mean > 0.2: return "moderate"
        if ndvi_mean > 0.1: return "stressed"
        return "bare_or_dead"


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    analyzer = MultispectralAnalyzer()
    if len(sys.argv) > 1:
        result = analyzer.calculate_ndvi(sys.argv[1])
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python multispectral.py <image_path>")

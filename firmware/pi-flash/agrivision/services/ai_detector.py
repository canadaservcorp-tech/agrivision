"""
AI Disease Detection Service
Runs TensorFlow Lite model on Raspberry Pi 4B
Processes camera images and returns disease classification.

Model: Custom-trained plant disease detector
Input: 224x224 RGB image
Output: Disease class + confidence score
"""

import logging
import numpy as np
from pathlib import Path
from PIL import Image
import io

logger = logging.getLogger("hub.ai")

# Treatment recommendations database
TREATMENTS = {
    "olive_leaf_spot": {
        "name": "Olive Leaf Spot",
        "category": "fungal",
        "treatment": "Apply copper-based fungicide (Bordeaux mixture). Remove and destroy affected leaves. Improve air circulation by pruning.",
        "severity_map": {0.65: "low", 0.80: "medium", 0.90: "high", 0.95: "critical"}
    },
    "tomato_early_blight": {
        "name": "Tomato Early Blight",
        "category": "fungal",
        "treatment": "Apply chlorothalonil or mancozeb. Remove lower infected leaves. Mulch to prevent soil splash. Rotate crops.",
        "severity_map": {0.65: "low", 0.80: "medium", 0.90: "high", 0.95: "critical"}
    },
    "tomato_late_blight": {
        "name": "Tomato Late Blight",
        "category": "fungal",
        "treatment": "URGENT: Apply metalaxyl-based fungicide immediately. Remove all infected plants. Do not compost.",
        "severity_map": {0.65: "medium", 0.80: "high", 0.90: "critical", 0.95: "critical"}
    },
    "powdery_mildew": {
        "name": "Powdery Mildew",
        "category": "fungal",
        "treatment": "Apply potassium bicarbonate or neem oil. Increase air circulation. Water at base, not overhead.",
        "severity_map": {0.65: "low", 0.80: "medium", 0.90: "high", 0.95: "high"}
    },
    "date_palm_scale": {
        "name": "Date Palm Scale",
        "category": "pest",
        "treatment": "Prune heavily infested fronds. Apply horticultural oil or insecticidal soap. Introduce natural predators.",
        "severity_map": {0.65: "low", 0.80: "medium", 0.90: "high", 0.95: "critical"}
    },
    "bayoud_disease": {
        "name": "Bayoud Disease",
        "category": "fungal",
        "treatment": "CRITICAL: No chemical cure. Immediately isolate affected trees. Remove and BURN infected palms. Quarantine zone 50m radius.",
        "severity_map": {0.65: "high", 0.80: "critical", 0.90: "critical", 0.95: "critical"}
    },
    "citrus_canker": {
        "name": "Citrus Canker",
        "category": "bacterial",
        "treatment": "Apply copper-based bactericide. Prune infected branches 30cm beyond lesions. Disinfect tools between cuts.",
        "severity_map": {0.65: "low", 0.80: "medium", 0.90: "high", 0.95: "critical"}
    },
    "spider_mites": {
        "name": "Spider Mite Infestation",
        "category": "pest",
        "treatment": "Apply neem oil or miticide. Increase humidity. Introduce predatory mites (Phytoseiulus persimilis).",
        "severity_map": {0.65: "low", 0.80: "medium", 0.90: "high", 0.95: "high"}
    },
    "healthy": {
        "name": "Healthy",
        "category": "none",
        "treatment": "No issues detected.",
        "severity_map": {}
    }
}


class DiseaseDetector:
    """TFLite plant disease classifier"""

    def __init__(self, settings):
        self.settings = settings
        self.interpreter = None
        self.labels = []
        self.input_size = settings.INPUT_SIZE

    async def load_model(self):
        """Load TFLite model and labels"""
        try:
            import tflite_runtime.interpreter as tflite
        except ImportError:
            # Fallback for development
            logger.warning("tflite_runtime not found — using stub mode")
            self.interpreter = None
            self.labels = list(TREATMENTS.keys())
            return

        model_path = self.settings.MODEL_PATH
        labels_path = self.settings.LABELS_PATH

        if not model_path.exists():
            logger.warning(f"Model not found at {model_path} — using stub mode")
            self.labels = list(TREATMENTS.keys())
            return

        # Load TFLite model
        self.interpreter = tflite.Interpreter(
            model_path=str(model_path),
            num_threads=4  # Pi 4B has 4 cores
        )
        self.interpreter.allocate_tensors()

        # Load labels
        if labels_path.exists():
            self.labels = labels_path.read_text().strip().split("\n")
        else:
            self.labels = list(TREATMENTS.keys())

        input_details = self.interpreter.get_input_details()
        self.input_size = (input_details[0]["shape"][1], input_details[0]["shape"][2])

        logger.info(f"Model loaded: {len(self.labels)} classes, input: {self.input_size}")

    async def detect(self, image_path: Path) -> dict:
        """
        Run disease detection on an image.
        Returns: {disease, confidence, severity, treatment, category} or None
        """
        try:
            # Load and preprocess image
            img = Image.open(image_path).convert("RGB")
            img_resized = img.resize(self.input_size, Image.LANCZOS)
            input_data = np.expand_dims(np.array(img_resized, dtype=np.float32) / 255.0, axis=0)

            if self.interpreter is None:
                # Stub mode for development — random detection
                import random
                label_idx = random.randint(0, len(self.labels) - 1)
                confidence = random.uniform(0.5, 0.98)
                label = self.labels[label_idx]
            else:
                # Run inference
                input_details = self.interpreter.get_input_details()
                output_details = self.interpreter.get_output_details()

                self.interpreter.set_tensor(input_details[0]["index"], input_data)
                self.interpreter.invoke()

                output = self.interpreter.get_tensor(output_details[0]["index"])[0]
                label_idx = int(np.argmax(output))
                confidence = float(output[label_idx])
                label = self.labels[label_idx] if label_idx < len(self.labels) else "unknown"

            # Skip healthy detections
            if label == "healthy" or confidence < self.settings.DETECTION_THRESHOLD:
                return None

            # Look up treatment info
            info = TREATMENTS.get(label, {
                "name": label.replace("_", " ").title(),
                "category": "unknown",
                "treatment": "Consult an agronomist for treatment options.",
                "severity_map": {0.65: "low", 0.80: "medium", 0.90: "high", 0.95: "critical"}
            })

            # Determine severity from confidence
            severity = "low"
            for threshold, level in sorted(info["severity_map"].items()):
                if confidence >= threshold:
                    severity = level

            return {
                "disease": info["name"],
                "disease_key": label,
                "category": info["category"],
                "confidence": round(confidence, 4),
                "severity": severity,
                "treatment": info["treatment"],
            }

        except Exception as e:
            logger.error(f"Detection error on {image_path}: {e}")
            return None

    def get_model_info(self) -> dict:
        """Return model metadata"""
        return {
            "model_loaded": self.interpreter is not None,
            "classes": len(self.labels),
            "input_size": self.input_size,
            "labels": self.labels,
            "threshold": self.settings.DETECTION_THRESHOLD,
        }

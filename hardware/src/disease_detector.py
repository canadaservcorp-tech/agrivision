"""TFLite disease detection — MobileNetV2 inference"""
import numpy as np
from PIL import Image

LABELS = [
    "Healthy","Early_Blight","Late_Blight","Powdery_Mildew","Downy_Mildew",
    "Fusarium_Wilt","Bacterial_Spot","Leaf_Curl","Anthracnose","Gray_Mold",
    "Rust","Mosaic_Virus","Root_Rot","Septoria","Cercospora",
    "Black_Spot","Canker","Scab","Smut","Blight_General"
]

class DiseaseDetector:
    def __init__(self, config):
        self.config = config
        self._interpreter = None
        try:
            import tflite_runtime.interpreter as tflite
            self._interpreter = tflite.Interpreter(model_path=config.MODEL_PATH)
            self._interpreter.allocate_tensors()
        except Exception as e:
            print(f"TFLite init: {e}")

    def predict(self, image_path):
        if not self._interpreter:
            return [{"disease": "Unknown", "confidence": 0.0}]
        try:
            img = Image.open(image_path).resize((224, 224))
            arr = np.array(img, dtype=np.float32) / 255.0
            arr = np.expand_dims(arr, axis=0)
            inp = self._interpreter.get_input_details()
            out = self._interpreter.get_output_details()
            self._interpreter.set_tensor(inp[0]['index'], arr)
            self._interpreter.invoke()
            probs = self._interpreter.get_tensor(out[0]['index'])[0]
            top3 = np.argsort(probs)[-3:][::-1]
            return [{"disease": LABELS[i], "confidence": float(probs[i])} for i in top3]
        except Exception as e:
            print(f"Prediction error: {e}")
            return [{"disease": "Error", "confidence": 0.0}]

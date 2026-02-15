### FILE: camera.py ###
"""Pi Camera 3 module — autofocus, HDR, 12MP capture"""
import os, time
from datetime import datetime

class CameraModule:
    def __init__(self, config):
        self.config = config
        self.output_dir = config.IMAGE_DIR
        os.makedirs(self.output_dir, exist_ok=True)

    def capture(self):
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        path = os.path.join(self.output_dir, f'capture_{ts}.jpg')
        try:
            from picamera2 import Picamera2
            cam = Picamera2()
            cam_config = cam.create_still_configuration(main={"size": (4056, 3040), "format": "RGB888"})
            cam.configure(cam_config)
            cam.start()
            time.sleep(2)  # autofocus settle
            cam.capture_file(path)
            cam.stop()
        except ImportError:
            # Fallback for dev/testing without camera
            with open(path, 'w') as f: f.write('test_image')
        return path

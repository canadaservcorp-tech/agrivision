"""
Local Storage Service
SQLite database on Pi hub for local data buffering.
Stores images metadata, detections, sensor readings locally.
Syncs to cloud when connected, retains for offline operation.
"""

import sqlite3
import logging
import shutil
from pathlib import Path
from datetime import datetime

logger = logging.getLogger("hub.storage")


class LocalStorage:
    """SQLite-based local storage for the hub"""

    def __init__(self, settings):
        self.settings = settings
        self.db_path = settings.DB_PATH
        self.conn = None

    def initialize(self):
        """Create database and tables"""
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row
        self._create_tables()
        logger.info(f"📁 Database: {self.db_path}")

    def _create_tables(self):
        cursor = self.conn.cursor()

        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_serial TEXT NOT NULL,
                filepath TEXT NOT NULL,
                file_size INTEGER,
                battery REAL,
                rssi INTEGER,
                processed INTEGER DEFAULT 0,
                synced INTEGER DEFAULT 0,
                received_at TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS detections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_serial TEXT,
                disease_name TEXT NOT NULL,
                confidence REAL NOT NULL,
                severity TEXT,
                category TEXT,
                image_path TEXT,
                treatment TEXT,
                synced INTEGER DEFAULT 0,
                detected_at TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                temperature REAL,
                humidity REAL,
                soil_moisture REAL,
                light_lux REAL,
                synced INTEGER DEFAULT 0,
                recorded_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS camera_status (
                serial TEXT PRIMARY KEY,
                online INTEGER DEFAULT 0,
                battery REAL,
                rssi INTEGER,
                last_image TEXT,
                last_contact TEXT,
                images_today INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS node_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_serial TEXT NOT NULL,
                command TEXT NOT NULL,
                executed INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_images_processed ON images(processed);
            CREATE INDEX IF NOT EXISTS idx_detections_synced ON detections(synced);
            CREATE INDEX IF NOT EXISTS idx_sensors_synced ON sensor_readings(synced);
        """)
        self.conn.commit()

    # ============================================================
    # IMAGES
    # ============================================================

    def save_image_metadata(self, filepath: Path, metadata: dict):
        """Record received image"""
        self.conn.execute(
            "INSERT INTO images (camera_serial, filepath, file_size, battery, rssi, received_at) VALUES (?, ?, ?, ?, ?, ?)",
            (metadata["camera_serial"], str(filepath), metadata["file_size"],
             metadata["battery"], metadata["rssi"], metadata["received_at"])
        )
        self.conn.commit()

    def get_pending_images(self) -> list:
        """Get images not yet processed by AI"""
        cursor = self.conn.execute(
            "SELECT filepath, camera_serial, battery, rssi FROM images WHERE processed = 0 ORDER BY received_at ASC LIMIT 10"
        )
        results = []
        for row in cursor.fetchall():
            path = Path(row["filepath"])
            if path.exists():
                results.append((path, {"camera_serial": row["camera_serial"], "battery": row["battery"]}))
        return results

    def mark_processed(self, filepath: Path):
        """Mark image as AI-processed"""
        self.conn.execute("UPDATE images SET processed = 1 WHERE filepath = ?", (str(filepath),))
        self.conn.commit()

    def get_today_image_count(self) -> int:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        cursor = self.conn.execute(
            "SELECT COUNT(*) FROM images WHERE received_at LIKE ?", (f"{today}%",)
        )
        return cursor.fetchone()[0]

    # ============================================================
    # DETECTIONS
    # ============================================================

    def save_detection(self, detection: dict):
        """Save AI detection result"""
        self.conn.execute(
            """INSERT INTO detections (camera_serial, disease_name, confidence, severity, category, image_path, treatment, detected_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (detection.get("camera_serial"), detection["disease_name"],
             detection["confidence"], detection["severity"],
             detection.get("category"), detection.get("image_path"),
             detection.get("treatment"), detection["detected_at"])
        )
        self.conn.commit()

    def get_today_detection_count(self) -> int:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        cursor = self.conn.execute(
            "SELECT COUNT(*) FROM detections WHERE detected_at LIKE ?", (f"{today}%",)
        )
        return cursor.fetchone()[0]

    def get_recent_detections(self, limit=20) -> list:
        cursor = self.conn.execute(
            "SELECT * FROM detections ORDER BY detected_at DESC LIMIT ?", (limit,)
        )
        return [dict(row) for row in cursor.fetchall()]

    # ============================================================
    # SENSOR READINGS
    # ============================================================

    def save_sensor_reading(self, reading: dict):
        """Save sensor data"""
        self.conn.execute(
            "INSERT INTO sensor_readings (temperature, humidity, soil_moisture, light_lux, recorded_at) VALUES (?, ?, ?, ?, ?)",
            (reading.get("temperature"), reading.get("humidity"),
             reading.get("soil_moisture"), reading.get("light_lux"),
             reading.get("recorded_at", datetime.utcnow().isoformat()))
        )
        self.conn.commit()

    # ============================================================
    # CAMERA STATUS
    # ============================================================

    def update_camera_status(self, serial: str, status: dict):
        """Update camera node status"""
        self.conn.execute(
            """INSERT OR REPLACE INTO camera_status (serial, online, battery, rssi, last_image, last_contact, images_today)
               VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT images_today FROM camera_status WHERE serial = ?), 0) + 1)""",
            (serial, status.get("online", False), status.get("battery"),
             status.get("rssi"), status.get("last_image"),
             status.get("last_contact"), serial)
        )
        self.conn.commit()

    def get_pending_node_commands(self, serial: str) -> dict:
        """Check for pending commands for a camera node"""
        cursor = self.conn.execute(
            "SELECT command FROM node_commands WHERE camera_serial = ? AND executed = 0 ORDER BY created_at ASC LIMIT 1",
            (serial,)
        )
        row = cursor.fetchone()
        if row:
            import json
            self.conn.execute("UPDATE node_commands SET executed = 1 WHERE camera_serial = ? AND executed = 0", (serial,))
            self.conn.commit()
            try:
                return json.loads(row["command"])
            except Exception:
                return {}
        return {}

    # ============================================================
    # STORAGE MANAGEMENT
    # ============================================================

    def get_used_gb(self) -> float:
        """Get storage usage in GB"""
        total, used, free = shutil.disk_usage(self.settings.DATA_DIR)
        return round(used / (1024 ** 3), 1)

    def cleanup_old_images(self):
        """Delete images older than retention period"""
        from datetime import timedelta
        cutoff = (datetime.utcnow() - timedelta(days=self.settings.IMAGE_RETENTION_DAYS)).isoformat()

        cursor = self.conn.execute(
            "SELECT filepath FROM images WHERE received_at < ? AND synced = 1", (cutoff,)
        )
        deleted = 0
        for row in cursor.fetchall():
            path = Path(row["filepath"])
            if path.exists():
                path.unlink()
                deleted += 1

        self.conn.execute("DELETE FROM images WHERE received_at < ? AND synced = 1", (cutoff,))
        self.conn.commit()

        if deleted:
            logger.info(f"🗑️ Cleaned up {deleted} old images")

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

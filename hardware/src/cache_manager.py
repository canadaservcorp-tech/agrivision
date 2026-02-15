"""SQLite offline cache for when 4G is unavailable"""
import sqlite3, json, os

class CacheManager:
    def __init__(self, config):
        db_path = os.path.join(config.DATA_DIR, 'cache.db')
        os.makedirs(config.DATA_DIR, exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.conn.execute('CREATE TABLE IF NOT EXISTS cache (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT, sent INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')

    def store(self, payload):
        self.conn.execute('INSERT INTO cache (payload) VALUES (?)', [json.dumps(payload)])
        self.conn.commit()

    def get_pending(self):
        rows = self.conn.execute('SELECT id, payload FROM cache WHERE sent=0 ORDER BY id LIMIT 50').fetchall()
        return [{'id': r[0], **json.loads(r[1])} for r in rows]

    def mark_sent(self, cache_id):
        self.conn.execute('UPDATE cache SET sent=1 WHERE id=?', [cache_id])
        self.conn.commit()

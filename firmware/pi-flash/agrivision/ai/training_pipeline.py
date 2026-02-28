"""
Agrivision AI Model Training Scripts
LSTM Climate Forecasting | Isolation Forest Anomaly Detection | Ensemble Predictor

Install: pip install tensorflow scikit-learn pandas numpy joblib
Run training: python lstm_climate.py --data /path/to/weather_data.csv
Deploy: Export models → /home/agrivision/models/ on Pi or backend server
"""

import json
import logging
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

logger = logging.getLogger('agrivision.ai')

# ============================================================
# LSTM CLIMATE FORECASTING MODEL
# ============================================================
class LSTMClimateTrainer:
    """
    Train LSTM model for climate risk time-series forecasting.
    Input: Historical weather data (temp, humidity, precipitation, etc.)
    Output: Multi-day forecast with risk scores.
    """

    def __init__(self, model_dir="/home/agrivision/models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.sequence_length = 30  # 30 days lookback
        self.forecast_days = 14
        self.features = ['temp_min', 'temp_max', 'humidity', 'precipitation', 'pressure', 'wind_speed']
        self.model = None
        self.scaler = None

    def prepare_data(self, csv_path: str) -> tuple:
        """Load and prepare weather data for training."""
        df = pd.read_csv(csv_path, parse_dates=['date'])
        df = df.sort_values('date').reset_index(drop=True)

        # Fill missing values
        for col in self.features:
            if col in df.columns:
                df[col] = df[col].fillna(df[col].median())

        # Normalize
        from sklearn.preprocessing import MinMaxScaler
        self.scaler = MinMaxScaler()
        data = self.scaler.fit_transform(df[self.features].values)

        # Create sequences
        X, y = [], []
        for i in range(len(data) - self.sequence_length - self.forecast_days):
            X.append(data[i:i + self.sequence_length])
            y.append(data[i + self.sequence_length:i + self.sequence_length + self.forecast_days, :2])  # temp only

        X = np.array(X)
        y = np.array(y)

        # Split 80/20
        split = int(len(X) * 0.8)
        return X[:split], y[:split], X[split:], y[split:]

    def build_model(self):
        """Build LSTM model architecture."""
        try:
            import tensorflow as tf
            from tensorflow.keras.models import Sequential
            from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional

            model = Sequential([
                Bidirectional(LSTM(64, return_sequences=True),
                             input_shape=(self.sequence_length, len(self.features))),
                Dropout(0.2),
                LSTM(32, return_sequences=False),
                Dropout(0.2),
                Dense(32, activation='relu'),
                Dense(self.forecast_days * 2),  # temp_min + temp_max per day
            ])

            model.compile(optimizer='adam', loss='mse', metrics=['mae'])
            self.model = model
            logger.info(f"LSTM model built: {model.count_params()} parameters")
            return model

        except ImportError:
            logger.error("TensorFlow not installed. Run: pip install tensorflow")
            return None

    def train(self, csv_path: str, epochs: int = 50, batch_size: int = 32):
        """Full training pipeline."""
        logger.info(f"Starting LSTM training on {csv_path}")
        X_train, y_train, X_val, y_val = self.prepare_data(csv_path)
        y_train = y_train.reshape(y_train.shape[0], -1)
        y_val = y_val.reshape(y_val.shape[0], -1)

        model = self.build_model()
        if model is None:
            return None

        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            verbose=1
        )

        # Save model
        model_path = self.model_dir / "lstm_climate.h5"
        model.save(model_path)
        logger.info(f"Model saved to {model_path}")

        # Save scaler
        import joblib
        joblib.dump(self.scaler, self.model_dir / "climate_scaler.pkl")

        return {
            "model_path": str(model_path),
            "final_loss": float(history.history['loss'][-1]),
            "final_val_loss": float(history.history['val_loss'][-1]),
            "epochs": epochs,
            "train_samples": len(X_train),
            "val_samples": len(X_val),
        }

    def predict(self, recent_data: np.ndarray) -> dict:
        """Run prediction on recent weather data sequence."""
        if self.model is None:
            import tensorflow as tf
            model_path = self.model_dir / "lstm_climate.h5"
            if model_path.exists():
                self.model = tf.keras.models.load_model(model_path)
            else:
                return {"error": "Model not trained yet"}

        if self.scaler is None:
            import joblib
            scaler_path = self.model_dir / "climate_scaler.pkl"
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)

        # Normalize input
        scaled = self.scaler.transform(recent_data) if self.scaler else recent_data
        X = scaled[-self.sequence_length:].reshape(1, self.sequence_length, -1)

        pred = self.model.predict(X, verbose=0)[0]
        pred = pred.reshape(self.forecast_days, 2)

        # Inverse scale (approximate)
        if self.scaler:
            dummy = np.zeros((self.forecast_days, len(self.features)))
            dummy[:, :2] = pred
            pred = self.scaler.inverse_transform(dummy)[:, :2]

        return {
            "forecast": [{"day": i + 1, "temp_min": round(float(pred[i][0]), 1),
                          "temp_max": round(float(pred[i][1]), 1)} for i in range(self.forecast_days)]
        }


# ============================================================
# ISOLATION FOREST ANOMALY DETECTION
# ============================================================
class IsolationForestTrainer:
    """
    Train Isolation Forest for sensor anomaly detection.
    Detects environmental outliers, equipment malfunction, food safety issues.
    """

    def __init__(self, model_dir="/home/agrivision/models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model = None

    def train(self, csv_path: str, contamination: float = 0.05):
        """Train Isolation Forest on sensor data."""
        from sklearn.ensemble import IsolationForest
        import joblib

        df = pd.read_csv(csv_path)
        features = ['temperature', 'humidity', 'soil_moisture', 'pressure']
        available = [f for f in features if f in df.columns]

        X = df[available].dropna().values

        self.model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            max_samples='auto',
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X)

        model_path = self.model_dir / "isolation_forest.pkl"
        joblib.dump({'model': self.model, 'features': available}, model_path)

        # Evaluate
        scores = self.model.decision_function(X)
        predictions = self.model.predict(X)

        return {
            "model_path": str(model_path),
            "features": available,
            "train_samples": len(X),
            "anomalies_found": int(np.sum(predictions == -1)),
            "anomaly_rate": round(float(np.sum(predictions == -1) / len(predictions) * 100), 2),
            "score_mean": round(float(np.mean(scores)), 4),
            "score_std": round(float(np.std(scores)), 4),
        }

    def detect(self, sensor_values: dict) -> dict:
        """Run anomaly detection on a single reading."""
        if self.model is None:
            import joblib
            model_path = self.model_dir / "isolation_forest.pkl"
            if model_path.exists():
                data = joblib.load(model_path)
                self.model = data['model']
                self.features = data['features']
            else:
                return {"is_anomaly": False, "error": "Model not trained"}

        values = np.array([[sensor_values.get(f, 0) for f in self.features]])
        prediction = self.model.predict(values)[0]
        score = self.model.decision_function(values)[0]

        is_anomaly = prediction == -1
        severity = "critical" if score < -0.5 else "high" if score < -0.3 else "medium" if score < -0.1 else "low"

        return {
            "is_anomaly": is_anomaly,
            "score": round(float(score), 4),
            "severity": severity if is_anomaly else "none",
            "values": sensor_values,
        }


# ============================================================
# ENSEMBLE PREDICTOR — Yield & Market Forecasting
# ============================================================
class EnsemblePredictor:
    """
    Ensemble model combining Random Forest + Gradient Boosting + Ridge.
    Predicts crop yield and market price trends.
    """

    def __init__(self, model_dir="/home/agrivision/models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

    def train_yield_model(self, csv_path: str, target_col: str = 'yield_per_ha'):
        """Train ensemble model for yield prediction."""
        from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, VotingRegressor
        from sklearn.linear_model import Ridge
        from sklearn.model_selection import cross_val_score
        import joblib

        df = pd.read_csv(csv_path)

        feature_cols = [c for c in df.columns if c not in [target_col, 'date', 'farm_id', 'id']]
        X = df[feature_cols].fillna(0).values
        y = df[target_col].values

        # Build ensemble
        rf = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
        gb = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
        ridge = Ridge(alpha=1.0)

        ensemble = VotingRegressor([('rf', rf), ('gb', gb), ('ridge', ridge)])
        ensemble.fit(X, y)

        # Cross-validation
        cv_scores = cross_val_score(ensemble, X, y, cv=5, scoring='r2')

        model_path = self.model_dir / "ensemble_yield.pkl"
        joblib.dump({'model': ensemble, 'features': feature_cols}, model_path)

        return {
            "model_path": str(model_path),
            "features": feature_cols,
            "r2_mean": round(float(np.mean(cv_scores)), 4),
            "r2_std": round(float(np.std(cv_scores)), 4),
            "train_samples": len(X),
        }

    def predict_yield(self, features: dict) -> dict:
        """Predict yield from farm features."""
        import joblib

        model_path = self.model_dir / "ensemble_yield.pkl"
        if not model_path.exists():
            return {"error": "Model not trained"}

        data = joblib.load(model_path)
        model = data['model']
        feature_names = data['features']

        X = np.array([[features.get(f, 0) for f in feature_names]])
        prediction = model.predict(X)[0]

        return {
            "predicted_yield_per_ha": round(float(prediction), 2),
            "unit": "tonnes/ha",
            "confidence": "medium",
            "input_features": features,
        }


# ============================================================
# CLI ENTRY POINT
# ============================================================
if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Agrivision AI Model Training")
    parser.add_argument("model", choices=["lstm", "isolation_forest", "ensemble"])
    parser.add_argument("--data", required=True, help="Path to training CSV")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--output", default="/home/agrivision/models")
    args = parser.parse_args()

    if args.model == "lstm":
        trainer = LSTMClimateTrainer(args.output)
        result = trainer.train(args.data, epochs=args.epochs)
    elif args.model == "isolation_forest":
        trainer = IsolationForestTrainer(args.output)
        result = trainer.train(args.data)
    elif args.model == "ensemble":
        trainer = EnsemblePredictor(args.output)
        result = trainer.train_yield_model(args.data)

    print(json.dumps(result, indent=2))

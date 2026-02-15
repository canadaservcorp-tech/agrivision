#!/usr/bin/env python3
"""Agrivision AI Training Pipeline — MobileNetV2 Disease Detection
Trains on PlantVillage dataset, exports TFLite for Raspberry Pi deployment.

Usage:
  pip install tensorflow pillow numpy
  python train_model.py --data_dir ./data/PlantVillage --epochs 25 --batch_size 32
"""
import os, argparse, json
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import MobileNetV2

LABELS = [
    "Healthy","Early_Blight","Late_Blight","Powdery_Mildew","Downy_Mildew",
    "Fusarium_Wilt","Bacterial_Spot","Leaf_Curl","Anthracnose","Gray_Mold",
    "Rust","Mosaic_Virus","Root_Rot","Septoria","Cercospora",
    "Black_Spot","Canker","Scab","Smut","Blight_General"
]
IMG_SIZE = 224

def build_model(num_classes):
    base = MobileNetV2(input_shape=(IMG_SIZE, IMG_SIZE, 3), include_top=False, weights='imagenet')
    base.trainable = False  # Freeze base for transfer learning
    x = base.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    out = layers.Dense(num_classes, activation='softmax')(x)
    model = Model(inputs=base.input, outputs=out)
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
                  loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    return model, base

def load_data(data_dir, batch_size):
    train = tf.keras.utils.image_dataset_from_directory(
        data_dir, validation_split=0.2, subset='training', seed=42,
        image_size=(IMG_SIZE, IMG_SIZE), batch_size=batch_size)
    val = tf.keras.utils.image_dataset_from_directory(
        data_dir, validation_split=0.2, subset='validation', seed=42,
        image_size=(IMG_SIZE, IMG_SIZE), batch_size=batch_size)
    # Normalize to [0,1]
    norm = layers.Rescaling(1./255)
    train = train.map(lambda x, y: (norm(x), y)).prefetch(tf.data.AUTOTUNE)
    val = val.map(lambda x, y: (norm(x), y)).prefetch(tf.data.AUTOTUNE)
    return train, val

def export_tflite(model, output_path):
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]
    tflite_model = converter.convert()
    with open(output_path, 'wb') as f:
        f.write(tflite_model)
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"TFLite model exported: {output_path} ({size_mb:.1f} MB)")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_dir', default='./data/PlantVillage')
    parser.add_argument('--epochs', type=int, default=25)
    parser.add_argument('--batch_size', type=int, default=32)
    parser.add_argument('--fine_tune_epochs', type=int, default=10)
    parser.add_argument('--output_dir', default='./models')
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    num_classes = len(LABELS)

    print(f"Loading data from {args.data_dir}...")
    train_ds, val_ds = load_data(args.data_dir, args.batch_size)

    print(f"Building MobileNetV2 model ({num_classes} classes)...")
    model, base = build_model(num_classes)

    # Phase 1: Train head only
    print(f"Phase 1: Training head ({args.epochs} epochs)...")
    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs,
              callbacks=[tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)])

    # Phase 2: Fine-tune last 30 layers
    print(f"Phase 2: Fine-tuning ({args.fine_tune_epochs} epochs)...")
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-5),
                  loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.fit(train_ds, validation_data=val_ds, epochs=args.fine_tune_epochs)

    # Evaluate
    loss, acc = model.evaluate(val_ds)
    print(f"Validation accuracy: {acc:.1%}")

    # Save
    keras_path = os.path.join(args.output_dir, 'disease_model.keras')
    tflite_path = os.path.join(args.output_dir, 'disease_model.tflite')
    model.save(keras_path)
    export_tflite(model, tflite_path)

    # Save labels
    with open(os.path.join(args.output_dir, 'labels.json'), 'w') as f:
        json.dump(LABELS, f)

    print(f"Done! Models saved to {args.output_dir}")

if __name__ == '__main__':
    main()

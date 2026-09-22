#!/usr/bin/env python3
"""
Train plant disease classifier: MobileNetV2 + custom head, two-phase training.
Dataset: backend/raw/ (optional PlantVillage/ parent with class subfolders).
Outputs: backend/models/plant_disease_model.{h5,keras}, class_names.json, training_info.json, training_history.png
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.layers import BatchNormalization, Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator, img_to_array, load_img
from tensorflow.keras.utils import Sequence

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
TOOLS_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = TOOLS_DIR.parent
RAW_DIR = BACKEND_ROOT / "raw"
MODELS_DIR = BACKEND_ROOT / "models"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp"}

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EXPECTED_NUM_CLASSES = 15
PHASE1_EPOCHS = 15
PHASE2_EPOCHS = 10


def log(msg: str) -> None:
    print(msg, flush=True)


def configure_device() -> None:
    gpus = tf.config.list_physical_devices("GPU")
    if gpus:
        log(f"[GPU] Found {len(gpus)} GPU(s): {gpus}")
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        except Exception as exc:
            log(f"[GPU] Memory growth setup note: {exc}")
    else:
        log("[WARN] No GPU detected — training will run on CPU (slower).")


def discover_class_root() -> Path:
    """Return directory whose immediate subdirs are class folders."""
    if not RAW_DIR.is_dir():
        log(f"[ERROR] Dataset folder not found: {RAW_DIR}")
        log("Create farming-assistant/backend/raw/ with one subfolder per class,")
        log("or use raw/PlantVillage/<class_name>/...")
        sys.exit(1)

    pv = RAW_DIR / "PlantVillage"
    if pv.is_dir():
        log(f"[DATA] Using class folders under: {pv} (PlantVillage is not a class)")
        return pv

    log(f"[DATA] Using class folders directly under: {RAW_DIR}")
    return RAW_DIR


def discover_class_names(class_root: Path) -> list[str]:
    names = sorted(
        d.name
        for d in class_root.iterdir()
        if d.is_dir() and d.name != "PlantVillage"
    )
    if not names:
        log(f"[ERROR] No class subfolders found under {class_root}")
        sys.exit(1)

    if len(names) != EXPECTED_NUM_CLASSES:
        log(
            f"[WARN] Found {len(names)} classes (expected {EXPECTED_NUM_CLASSES}). "
            "Training will proceed with discovered classes."
        )
    return names


def build_file_lists(class_root: Path, class_names: list[str]) -> tuple[list[str], list[str]]:
    paths: list[str] = []
    labels: list[str] = []
    missing: list[str] = []
    for cls in class_names:
        cdir = class_root / cls
        if not cdir.is_dir():
            missing.append(cls)
            continue
        for p in cdir.rglob("*"):
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                paths.append(str(p.resolve()))
                labels.append(cls)
    if missing:
        log(f"[WARN] Missing class directories: {missing}")
    if not paths:
        log("[ERROR] No image files found under class folders.")
        sys.exit(1)

    n_cls = len(set(labels))
    log(f"[DATA] Total images: {len(paths)} across {n_cls} classes")
    return paths, labels


def labels_to_categorical(str_labels: list[str], class_names: list[str]) -> np.ndarray:
    idx_map = {n: i for i, n in enumerate(class_names)}
    n = len(str_labels)
    c = len(class_names)
    out = np.zeros((n, c), dtype=np.float32)
    for i, s in enumerate(str_labels):
        out[i, idx_map[s]] = 1.0
    return out


class ImageListSequence(Sequence):
    """Loads RGB images from paths; applies ImageDataGenerator (augment + rescale) per batch."""

    def __init__(
        self,
        paths: list[str],
        y_categorical: np.ndarray,
        datagen: ImageDataGenerator,
        batch_size: int,
        shuffle: bool,
    ) -> None:
        self.paths = np.asarray(paths)
        self.y = np.asarray(y_categorical, dtype=np.float32)
        self.datagen = datagen
        self.batch_size = batch_size
        self.shuffle = shuffle
        self._order = np.arange(len(self.paths))
        self.on_epoch_end()

    def __len__(self) -> int:
        return int(np.ceil(len(self.paths) / self.batch_size))

    def on_epoch_end(self) -> None:
        if self.shuffle:
            np.random.shuffle(self._order)

    def __getitem__(self, idx: int) -> tuple[np.ndarray, np.ndarray]:
        start = idx * self.batch_size
        end = min(start + self.batch_size, len(self.paths))
        sel = self._order[start:end]
        batch_paths = self.paths[sel]
        batch_y = self.y[sel]
        batch_x = np.stack(
            [img_to_array(load_img(str(p), target_size=IMG_SIZE)) for p in batch_paths]
        )
        gen = self.datagen.flow(batch_x, batch_y, batch_size=len(batch_x), shuffle=False)
        return next(gen)


def make_sequences(
    paths: list[str],
    labels: list[str],
    class_names: list[str],
) -> tuple[ImageListSequence, ImageListSequence]:
    p_train, p_val, y_train_str, y_val_str = train_test_split(
        paths,
        labels,
        test_size=0.2,
        stratify=labels,
        random_state=42,
    )
    log(f"[SPLIT] Train: {len(p_train)} | Validation: {len(p_val)} (stratified 80/20)")

    y_train = labels_to_categorical(list(y_train_str), class_names)
    y_val = labels_to_categorical(list(y_val_str), class_names)

    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.3,
        horizontal_flip=True,
        vertical_flip=False,
        brightness_range=(0.8, 1.2),
        fill_mode="nearest",
    )
    val_datagen = ImageDataGenerator(rescale=1.0 / 255.0)

    train_seq = ImageListSequence(
        list(p_train), y_train, train_datagen, BATCH_SIZE, shuffle=True
    )
    val_seq = ImageListSequence(list(p_val), y_val, val_datagen, BATCH_SIZE, shuffle=False)
    return train_seq, val_seq


def build_model(num_classes: int) -> tuple[Model, tf.keras.Model]:
    base = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(224, 224, 3),
    )
    base.trainable = False

    x = base.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(256, activation="relu")(x)
    x = Dropout(0.4)(x)
    x = Dense(128, activation="relu")(x)
    x = Dropout(0.3)(x)
    out = Dense(num_classes, activation="softmax")(x)
    model = Model(inputs=base.input, outputs=out, name="plant_disease_mobilenetv2")
    return model, base


def get_callbacks(phase_tag: str) -> list:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    ckpt_path = MODELS_DIR / f"best_{phase_tag}.keras"
    return [
        EarlyStopping(
            monitor="val_accuracy",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            verbose=1,
        ),
        ModelCheckpoint(
            filepath=str(ckpt_path),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
    ]


def merge_histories(h1: dict, h2: dict) -> dict:
    out: dict[str, list] = {}
    for k in set(h1) | set(h2):
        a, b = h1.get(k, []), h2.get(k, [])
        out[k] = list(a) + list(b)
    return out


def plot_history(combined: dict, out_path: Path) -> None:
    sns.set_theme(style="whitegrid")
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    if "accuracy" in combined:
        axes[0].plot(combined["accuracy"], label="train")
        axes[0].plot(combined["val_accuracy"], label="val")
        axes[0].set_title("Accuracy")
        axes[0].legend()
        axes[0].set_xlabel("Epoch")
    if "loss" in combined:
        axes[1].plot(combined["loss"], label="train")
        axes[1].plot(combined["val_loss"], label="val")
        axes[1].set_title("Loss")
        axes[1].legend()
        axes[1].set_xlabel("Epoch")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    log(f"[PLOT] Saved {out_path}")


def unfreeze_last_n_layers(base: tf.keras.Model, n: int) -> None:
    layers = base.layers
    if n >= len(layers):
        n = len(layers) - 1
    cutoff = max(0, len(layers) - n)
    for i, layer in enumerate(layers):
        layer.trainable = i >= cutoff
    trainable = sum(1 for l in layers if l.trainable)
    log(f"[FINE-TUNE] Unfroze last {n} layers of MobileNetV2 ({trainable} trainable base layers)")


def collect_val_labels(val_seq: ImageListSequence) -> np.ndarray:
    parts: list[np.ndarray] = []
    for i in range(len(val_seq)):
        _, yb = val_seq[i]
        parts.append(np.argmax(yb, axis=1))
    return np.concatenate(parts)


def main() -> None:
    log("=" * 60)
    log(" Plant disease model training — MobileNetV2 (2-phase)")
    log("=" * 60)

    configure_device()

    class_root = discover_class_root()
    class_names = discover_class_names(class_root)
    num_classes = len(class_names)
    log(f"[DATA] Classes (sorted, {num_classes}): {class_names}")

    paths, labels = build_file_lists(class_root, class_names)
    train_seq, val_seq = make_sequences(paths, labels, class_names)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    class_names_path = MODELS_DIR / "class_names.json"
    class_names_path.write_text(json.dumps(class_names, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"[OUT] Wrote {class_names_path}")

    model, base = build_model(num_classes)
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    log("[MODEL] Phase 1: base frozen, Adam lr=0.001")

    cb1 = get_callbacks("phase1")
    log(f"[TRAIN] Phase 1 — up to {PHASE1_EPOCHS} epochs...")
    h1 = model.fit(
        train_seq,
        epochs=PHASE1_EPOCHS,
        validation_data=val_seq,
        callbacks=cb1,
        verbose=1,
    )

    unfreeze_last_n_layers(base, 30)
    model.compile(
        optimizer=Adam(learning_rate=0.0001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    log("[MODEL] Phase 2: last 30 base layers unfrozen, Adam lr=0.0001")

    cb2 = get_callbacks("phase2")
    log(f"[TRAIN] Phase 2 — up to {PHASE2_EPOCHS} epochs...")
    h2 = model.fit(
        train_seq,
        epochs=PHASE2_EPOCHS,
        validation_data=val_seq,
        callbacks=cb2,
        verbose=1,
    )

    combined_hist = merge_histories(h1.history, h2.history)
    plot_history(combined_hist, MODELS_DIR / "training_history.png")

    log("[EVAL] Running final validation evaluation...")
    val_loss, val_accuracy = model.evaluate(val_seq, verbose=0)
    log(f"[EVAL] Final val_loss: {val_loss:.4f}")
    log(f"[EVAL] Final val_accuracy: {val_accuracy:.4f} ({100 * val_accuracy:.2f}%)")

    y_true = collect_val_labels(val_seq)
    y_prob = model.predict(val_seq, verbose=1)
    y_pred = np.argmax(y_prob, axis=1)

    log("\n[EVAL] Per-class metrics (validation):")
    print(
        classification_report(
            y_true,
            y_pred,
            target_names=class_names,
            digits=4,
        )
    )

    cm = confusion_matrix(y_true, y_pred, labels=list(range(num_classes)))
    log("\n[EVAL] Confusion matrix (rows=true, cols=pred):")
    print(cm)

    per_class_acc = cm.diagonal() / np.maximum(cm.sum(axis=1), 1)
    log("\n[EVAL] Per-class accuracy (validation):")
    for name, acc in zip(class_names, per_class_acc):
        log(f"  {name}: {100 * acc:.2f}%")

    h5_path = MODELS_DIR / "plant_disease_model.h5"
    keras_path = MODELS_DIR / "plant_disease_model.keras"
    model.save(str(h5_path))
    model.save(str(keras_path))
    log(f"[OUT] Saved {h5_path}")
    log(f"[OUT] Saved {keras_path}")

    total_epochs = len(combined_hist.get("loss", []))
    info = {
        "num_classes": num_classes,
        "image_size": list(IMG_SIZE),
        "val_accuracy": float(val_accuracy),
        "total_epochs": total_epochs,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "class_names": class_names,
    }
    info_path = MODELS_DIR / "training_info.json"
    info_path.write_text(json.dumps(info, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"[OUT] Wrote {info_path}")

    pct = 100.0 * val_accuracy
    log("")
    log(
        f"Model saved. Val accuracy: {pct:.2f}% — Copy plant_disease_model.h5 to farming-assistant/backend/models/"
    )
    log("=" * 60)


if __name__ == "__main__":
    main()

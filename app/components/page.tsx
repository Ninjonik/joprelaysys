"use client";

import { useState } from "react";
import {
  getDefaultState,
  getDefaultTextValues,
  getStateOptions,
  getTextLayouts,
  normalizeTextValues,
  pieceEntries,
  PiecePreview,
  type PieceDefinition,
  type PieceKey,
} from "../board-demo";
import styles from "./page.module.css";

const PREVIEW_TILE = 42;

function CatalogCard({
  pieceKey,
  piece,
}: {
  pieceKey: PieceKey;
  piece: PieceDefinition;
}) {
  const stateOptions = getStateOptions(piece);
  const textLayouts = getTextLayouts(pieceKey);
  const [state, setState] = useState(getDefaultState(piece));
  const [textValues, setTextValues] = useState(() => getDefaultTextValues(pieceKey, textLayouts));
  const normalizedText = normalizeTextValues(textValues, textLayouts);
  const previewText = textLayouts.length === 0 ? undefined : textLayouts.length === 1 ? normalizedText[0] : normalizedText;

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2>{pieceKey}</h2>
          <p>
            {piece.category} · {piece.bounds.width}x{piece.bounds.height} · {piece.layer}
          </p>
        </div>
      </header>

      <div className={styles.previewWrap}>
        <PiecePreview pieceKey={pieceKey} piece={piece} state={state} text={previewText} tileSize={PREVIEW_TILE} />
      </div>

      {stateOptions.length > 0 ? (
        <label className={styles.field}>
          <span>State</span>
          <select value={state} onChange={(event) => setState(event.target.value)}>
            {stateOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className={styles.staticLabel}>Static piece</p>
      )}

      {textLayouts.map((layout, index) => (
        <label key={`${pieceKey}-${layout.label}-${index}`} className={styles.field}>
          <span>{layout.label}</span>
          <input
            type="text"
            maxLength={layout.maxLength ?? 24}
            value={normalizedText[index] ?? ""}
            onChange={(event) =>
              setTextValues((current) => {
                const next = [...current];
                next[index] = event.target.value.toUpperCase();
                return next;
              })
            }
          />
        </label>
      ))}
    </article>
  );
}

export default function ComponentsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1>Components Playground</h1>
          <p>All catalog pieces with their available states and text fields.</p>
        </header>

        <section className={styles.grid}>
          {pieceEntries.map(([pieceKey, piece]) => (
            <CatalogCard key={pieceKey} pieceKey={pieceKey} piece={piece} />
          ))}
        </section>
      </div>
    </main>
  );
}

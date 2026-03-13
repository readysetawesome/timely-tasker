import React from 'react';
import { PinnedTask } from '../../../functions/pinnedTasks';
import styles from './Timer.module.scss';

interface PinsPanelProps {
  pins: PinnedTask[];
  onReorder: (orderedIds: number[]) => void;
  onClose: () => void;
}

const PinsPanel = ({ pins, onReorder, onClose }: PinsPanelProps) => {
  const move = (idx: number, dir: -1 | 1) => {
    const reordered = [...pins];
    const tmp = reordered[idx];
    reordered[idx] = reordered[idx + dir];
    reordered[idx + dir] = tmp;
    onReorder(reordered.map((p) => p.id));
  };

  return (
    <div className={styles.pins_panel} data-test-id="pins-panel">
      <div className={styles.pins_panel_header}>
        <span>Pinned tasks</span>
        <button onClick={onClose} className={styles.pins_panel_close} title="Close">
          ×
        </button>
      </div>
      {pins.length === 0 && (
        <div className={styles.pins_panel_empty}>No pinned tasks</div>
      )}
      {pins.map((pin, idx) => (
        <div key={pin.id} className={styles.pins_panel_row} data-test-id={`pin-item-${idx}`}>
          <div className={styles.pins_panel_arrows}>
            <button
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className={styles.pins_panel_arrow}
              title="Move up"
              data-test-id={`pin-move-up-${idx}`}
            >
              ▲
            </button>
            <button
              onClick={() => move(idx, 1)}
              disabled={idx === pins.length - 1}
              className={styles.pins_panel_arrow}
              title="Move down"
              data-test-id={`pin-move-down-${idx}`}
            >
              ▼
            </button>
          </div>
          <span className={styles.pins_panel_text}>{pin.text}</span>
        </div>
      ))}
    </div>
  );
};

export default PinsPanel;

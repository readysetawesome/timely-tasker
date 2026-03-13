import styles from './Timer.module.scss';
import React, { useMemo, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { useDispatch, useSelector } from 'react-redux';
import { getSummary } from './Timer.selectors';
import { Summary } from '../../../functions/summaries';
import { PinnedTask } from '../../../functions/pinnedTasks';
import { setSummary } from './Timer.actions';
import { StorageApiType } from '../../LocalStorageApi';

export interface TaskRowSummaryProps {
  slot: number;
  date: number;
  useApi: StorageApiType;
  isLastRow?: boolean;
  onAddRow?: () => void;
  pinnedTasks?: PinnedTask[];
  isToday?: boolean;
  isTomorrow?: boolean;
  onPin?: (text: string) => void;
  onUnpin?: (id: number) => void;
  onUpdatePin?: (id: number, newText: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const TaskRowSummary = ({ slot, date, useApi, isLastRow, onAddRow, pinnedTasks, isToday, isTomorrow, onPin, onUnpin, onUpdatePin, onMoveUp, onMoveDown }: TaskRowSummaryProps) => {
  const [text, setText] = useState<string | undefined>();
  const [unpinPrompt, setUnpinPrompt] = useState<{ text: string; pinId: number } | null>(null);
  const summary = useSelector((state) => getSummary(state, slot));
  const dispatch = useDispatch();

  // Capture the active pin id at focus time so rename works even as text diverges
  const activePinIdRef = useRef<number | null>(null);
  // Stable ref to onUpdatePin so it needn't be a useMemo dep
  const onUpdatePinRef = useRef(onUpdatePin);
  onUpdatePinRef.current = onUpdatePin;

  const handleSummaryChange = useMemo(() => {
    return debounce((newText: string | undefined) => {
      if (newText !== undefined && summary?.content !== newText) {
        if (!newText.trim() && !summary?.id) return; // don't create blank rows
        setSummary({
          TimerTicks: summary?.TimerTicks || [],
          slot,
          date,
          content: newText,
          id: summary?.id,
        } as Summary)(dispatch, useApi);
      }
      if ((isToday || isTomorrow) && activePinIdRef.current !== null && newText && newText.trim()) {
        onUpdatePinRef.current?.(activePinIdRef.current, newText);
      }
    }, 800);
  }, [date, dispatch, slot, summary, useApi, isToday]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (e.key === 'ArrowDown' && isLastRow) {
      onAddRow?.();
      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>(`[data-test-id="summary-text-${slot + 1}"]`);
        if (el) { el.focus(); el.select(); }
      }, 0);
      return;
    }
    const nextSlot = e.key === 'ArrowDown' ? slot + 1 : slot - 1;
    const el = document.querySelector<HTMLInputElement>(`[data-test-id="summary-text-${nextSlot}"]`);
    if (el) { el.focus(); el.select(); }
  };

  const currentText = text === undefined ? summary?.content || '' : text;
  const pinnedTask = pinnedTasks?.find((p) => p.text === currentText);
  const isPinned = !!pinnedTask;

  // Show pin button whenever there's content in cloud mode — any day
  const showPinButton = !!pinnedTasks && currentText.trim().length > 0;
  // Pin/unpin works on all days; rename-via-typing is limited to today/tomorrow (see handleSummaryChange)
  const isInteractive = !!pinnedTasks;

  const handleFocus = () => {
    activePinIdRef.current = pinnedTask?.id ?? null;
  };

  const handlePinClick = () => {
    if (isPinned && pinnedTask) {
      onUnpin?.(pinnedTask.id);
    } else {
      onPin?.(currentText);
    }
  };

  const handleUnpinConfirm = () => {
    if (unpinPrompt) onUnpin?.(unpinPrompt.pinId);
    setUnpinPrompt(null);
  };

  if (unpinPrompt) {
    return (
      <div className={styles.summary_cell}>
        <div className={styles.unpin_prompt} data-test-id={`unpin-prompt-${slot}`}>
          <span>Unpin "{unpinPrompt.text}"?</span>
          <button className="tt-btn-ghost" onClick={handleUnpinConfirm} data-test-id={`unpin-confirm-${slot}`}>Unpin</button>
          <button className="tt-btn-ghost" onClick={() => setUnpinPrompt(null)} data-test-id={`unpin-keep-${slot}`}>Keep</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.summary_cell}>
      {(onMoveUp !== undefined || onMoveDown !== undefined) && (
        <div className={styles.row_arrows}>
          <button onClick={onMoveUp} disabled={!onMoveUp} className={styles.row_arrow} title="Move row up" data-test-id={`move-up-${slot}`}>▲</button>
          <button onClick={onMoveDown} disabled={!onMoveDown} className={styles.row_arrow} title="Move row down" data-test-id={`move-down-${slot}`}>▼</button>
        </div>
      )}
      <input
        className={styles.summary_input_container}
        type="text"
        value={currentText}
        onChange={(e) => {
          const val = e.target.value;
          if (!val && activePinIdRef.current !== null && isToday) {
            setUnpinPrompt({ text: currentText, pinId: activePinIdRef.current });
          } else if (val) {
            setUnpinPrompt(null);
          }
          setText(val);
          handleSummaryChange(val);
        }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="enter a summary"
        data-test-id={`summary-text-${slot}`}
      />
      {showPinButton && (
        <button
          className={`${styles.pin_btn}${isPinned ? ` ${styles.pin_btn_active}` : ''}${!isInteractive ? ` ${styles.pin_btn_readonly}` : ''}`}
          onClick={handlePinClick}
          title={isPinned ? (isInteractive ? 'Unpin task' : 'Pinned task') : 'Pin task — auto-fills on new days'}
          data-test-id={`pin-btn-${slot}`}
          data-pinned={isPinned}
          data-readonly={!isInteractive}
        >
          📌
        </button>
      )}
    </div>
  );
};

export default TaskRowSummary;

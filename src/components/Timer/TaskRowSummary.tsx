import styles from './Timer.module.scss';
import React, { useMemo, useState } from 'react';
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
  onPin?: (text: string) => void;
  onUnpin?: (id: number) => void;
}

const TaskRowSummary = ({ slot, date, useApi, isLastRow, onAddRow, pinnedTasks, onPin, onUnpin }: TaskRowSummaryProps) => {
  const [text, setText] = useState<string | undefined>();
  const summary = useSelector((state) => getSummary(state, slot));
  const dispatch = useDispatch();

  const handleSummaryChange = useMemo(() => {
    return debounce((text: string | undefined) => {
      if (text !== undefined && summary?.content !== text) {
        setSummary({
          TimerTicks: summary?.TimerTicks || [],
          slot,
          date,
          content: text,
          id: summary?.id,
        } as Summary)(dispatch, useApi);
      }
    }, 800);
  }, [date, dispatch, slot, summary, useApi]);

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
  const showPinButton = !!onPin && currentText.trim().length > 0;

  const handlePinClick = () => {
    if (isPinned && pinnedTask) {
      onUnpin?.(pinnedTask.id);
    } else {
      onPin?.(currentText);
    }
  };

  return (
    <div className={styles.summary_cell}>
      <input
        className={styles.summary_input_container}
        type="text"
        value={currentText}
        onChange={(e) => [
          setText(e.target.value),
          handleSummaryChange(e.target.value),
        ]}
        onKeyDown={handleKeyDown}
        placeholder="enter a summary"
        data-test-id={`summary-text-${slot}`}
      />
      {showPinButton && (
        <button
          className={`${styles.pin_btn}${isPinned ? ` ${styles.pin_btn_active}` : ''}`}
          onClick={handlePinClick}
          title={isPinned ? 'Unpin task' : 'Pin task — auto-fills on new days'}
          data-test-id={`pin-btn-${slot}`}
          data-pinned={isPinned}
        >
          📌
        </button>
      )}
    </div>
  );
};

export default TaskRowSummary;

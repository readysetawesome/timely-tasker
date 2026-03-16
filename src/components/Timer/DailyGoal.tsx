import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { StorageApiType } from '../../LocalStorageApi';
import { getTotalFocusedHours } from './Timer.selectors';

interface DailyGoalProps {
  useApi: StorageApiType;
}

const DailyGoal = ({ useApi }: DailyGoalProps) => {
  const totalHours = useSelector(getTotalFocusedHours);
  const [goalHours, setGoalHours] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    useApi.getPreferences().then((prefs) => {
      if (prefs.dailyGoalHours != null) setGoalHours(prefs.dailyGoalHours);
    });
  }, [useApi]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const handleCommit = (raw: string) => {
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) {
      setGoalHours(val);
      useApi.setPreference('dailyGoalHours', val);
    }
    setEditing(false);
  };

  if (goalHours == null) {
    return (
      <div className="tt-daily-goal" data-test-id="daily-goal">
        <button
          className="tt-daily-goal-set"
          data-test-id="daily-goal-set-btn"
          onClick={() => {
            setGoalHours(6);
            setEditing(true);
          }}
        >
          Set daily goal
        </button>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((totalHours / goalHours) * 100));
  const met = totalHours >= goalHours;

  return (
    <div className="tt-daily-goal" data-test-id="daily-goal">
      <span className="tt-daily-goal-label">
        <span className="tt-daily-goal-scope">today&nbsp;·&nbsp;</span>
        {totalHours}h&nbsp;/&nbsp;
        {editing ? (
          <input
            ref={inputRef}
            className="tt-daily-goal-input"
            data-test-id="daily-goal-input"
            defaultValue={goalHours}
            size={3}
            onBlur={(e) => handleCommit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommit((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <button
            className="tt-daily-goal-target"
            data-test-id="daily-goal-target"
            onClick={() => setEditing(true)}
            title="Click to change goal"
          >
            {goalHours}h
          </button>
        )}
        &nbsp;focused
      </span>
      <div className="tt-daily-goal-bar" data-test-id="daily-goal-bar">
        <div
          className={`tt-daily-goal-fill${met ? ' tt-daily-goal-fill--met' : ''}`}
          data-test-id="daily-goal-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default DailyGoal;

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface DatePickerProps {
  date: number;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const todayMs = () => {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
};

const DatePicker = ({ date, onClose }: DatePickerProps) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const selected = new Date(date);

  const [viewYear, setViewYear] = useState(selected.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getUTCMonth());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const today = todayMs();
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const startDow = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1))
    .toLocaleString('default', { month: 'long', timeZone: 'UTC' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleSelect = (dayMs: number) => {
    navigate(`/timer?date=${dayMs}`);
    onClose();
  };

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => Date.UTC(viewYear, viewMonth, i + 1)),
  ];

  return (
    <div className="datepicker" ref={ref}>
      <div className="datepicker-header">
        <button className="datepicker-nav" onClick={prevMonth}>‹</button>
        <span className="datepicker-month-label">{monthLabel} {viewYear}</span>
        <button className="datepicker-nav" onClick={nextMonth}>›</button>
      </div>
      <div className="datepicker-grid">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="datepicker-dow">{d}</div>
        ))}
        {cells.map((dayMs, i) => {
          if (!dayMs) return <div key={i} />;
          const isToday = dayMs === today;
          const isSelected = dayMs === date;
          const cn = ['datepicker-day',
            isToday && 'datepicker-day--today',
            isSelected && 'datepicker-day--selected',
          ].filter(Boolean).join(' ');
          return (
            <button key={i} className={cn} onClick={() => handleSelect(dayMs)}>
              {new Date(dayMs).getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DatePicker;

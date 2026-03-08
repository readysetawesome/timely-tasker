import React, { useEffect, useState } from 'react';
import { useDrag } from './DragContext';

const HINT_KEY = 'TimelyTasker:DragHintDismissed';

const DragHint = () => {
  const { onFirstDragRef } = useDrag();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(HINT_KEY, 'yes');
    }, 400);
  };

  useEffect(() => {
    if (localStorage.getItem(HINT_KEY)) return;
    // small delay so it pops in after the grid renders
    const showTimer = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    // register dismiss on first drag
    onFirstDragRef.current = dismiss;
    // auto-dismiss after 9s
    const autoTimer = setTimeout(dismiss, 9000);
    return () => clearTimeout(autoTimer);
  }, [visible, onFirstDragRef, dismiss]);

  if (!visible) return null;

  return (
    <div className={`drag-hint ${leaving ? 'drag-hint--leaving' : ''}`}>
      <span className="drag-hint-emoji">🖱️</span>
      <span className="drag-hint-text">
        click &amp; <strong>drag</strong> to fill ticks! ✨
      </span>
      <button className="drag-hint-close" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
};

export default DragHint;

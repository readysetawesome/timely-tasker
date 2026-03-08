import React, { createContext, useContext, useRef } from 'react';
import { TickState } from './Tick';

interface DragContextType {
  isDraggingRef: React.MutableRefObject<boolean>;
  dragValueRef: React.MutableRefObject<TickState | null>;
  startDrag: (value: TickState) => void;
  endDrag: () => void;
  onFirstDragRef: React.MutableRefObject<(() => void) | null>;
}

const DragContext = createContext<DragContextType>({
  isDraggingRef: { current: false },
  dragValueRef: { current: null },
  startDrag: () => {},
  endDrag: () => {},
  onFirstDragRef: { current: null },
});

export const useDrag = () => useContext(DragContext);

export const DragProvider = ({ children }: { children: React.ReactNode }) => {
  const isDraggingRef = useRef(false);
  const dragValueRef = useRef<TickState | null>(null);
  const onFirstDragRef = useRef<(() => void) | null>(null);

  const startDrag = (value: TickState) => {
    isDraggingRef.current = true;
    dragValueRef.current = value;
    if (onFirstDragRef.current) {
      onFirstDragRef.current();
      onFirstDragRef.current = null;
    }
  };

  const endDrag = () => {
    isDraggingRef.current = false;
    dragValueRef.current = null;
  };

  return (
    <DragContext.Provider value={{ isDraggingRef, dragValueRef, startDrag, endDrag, onFirstDragRef }}>
      <div onMouseUp={endDrag} onMouseLeave={endDrag}>
        {children}
      </div>
    </DragContext.Provider>
  );
};

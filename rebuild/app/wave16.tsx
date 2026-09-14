'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction
} from 'react';

type TurnDirection = 'next' | 'prev';
type DragStart = { x: number; y: number; pointerId: number };

const interactiveSelector = 'button,input,textarea,select,a,summary,details,[role="button"],[contenteditable="true"],[data-no-page-gesture]';

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(interactiveSelector));
}

export function useReaderPageTurn({
  page,
  pageCount,
  setPage
}: {
  page: number;
  pageCount: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  const [direction, setDirection] = useState<TurnDirection | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<DragStart | null>(null);
  const draggedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const go = useCallback((index: number) => {
    const target = Math.min(pageCount - 1, Math.max(0, index));
    if (target === page) return;
    const nextDirection: TurnDirection = target > page ? 'next' : 'prev';
    if (timerRef.current) clearTimeout(timerRef.current);
    setDragging(false);
    setDragX(0);
    setDirection(nextDirection);
    setPage(target);
    timerRef.current = setTimeout(() => setDirection(null), 360);
  }, [page, pageCount, setPage]);

  const turnBy = useCallback((delta: number) => go(page + delta), [go, page]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target)) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    draggedRef.current = false;
    setDragX(0);
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const cancelDrag = useCallback((element?: HTMLDivElement, pointerId?: number) => {
    if (element && pointerId !== undefined && element.hasPointerCapture?.(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
    dragStartRef.current = null;
    setDragging(false);
    setDragX(0);
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx) * 1.25 && Math.abs(dy) > 18) {
      cancelDrag(event.currentTarget, event.pointerId);
      return;
    }
    const maxDrag = Math.min(150, Math.max(96, event.currentTarget.clientWidth * 0.28));
    const bounded = Math.max(-maxDrag, Math.min(maxDrag, dx));
    if (Math.abs(bounded) > 8) draggedRef.current = true;
    setDragX(bounded);
  }, [cancelDrag]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const threshold = Math.min(72, Math.max(46, event.currentTarget.clientWidth * 0.1));
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragStartRef.current = null;
    setDragging(false);
    setDragX(0);
    if (Math.abs(dx) >= threshold) turnBy(dx < 0 ? 1 : -1);
  }, [turnBy]);

  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    cancelDrag(event.currentTarget, event.pointerId);
  }, [cancelDrag]);

  const onClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    if (isInteractiveTarget(event.target)) return;
    if (window.getSelection()?.toString()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const position = (event.clientX - rect.left) / rect.width;
    if (position <= 0.11) turnBy(-1);
    if (position >= 0.89) turnBy(1);
  }, [turnBy]);

  const className = [dragging ? 'readerDragging' : '', direction ? `readerTurn-${direction}` : ''].filter(Boolean).join(' ');
  const style: CSSProperties | undefined = dragging ? {
    transform: `translateX(${dragX}px) rotateY(${dragX / 18}deg)`,
    transition: 'none'
  } : undefined;

  return {
    go,
    turnBy,
    direction,
    dragging,
    dragX,
    className,
    style,
    gestureProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick }
  };
}

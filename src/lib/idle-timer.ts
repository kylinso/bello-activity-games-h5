import { useEffect, useRef } from 'react';

const IDLE_EVENTS: ReadonlyArray<keyof WindowEventMap> = [
  'touchstart',
  'click',
  'keydown',
  'pointermove',
];

/**
 * 监听用户交互事件，timeoutMs 内无操作则触发 onIdle。
 * 任何 touchstart/click/keydown/pointermove 都会重置计时器。
 * enabled=false 时不挂载，避免无意义监听。
 */
export const useIdleTimer = (
  timeoutMs: number,
  onIdle: () => void,
  enabled: boolean,
): void => {
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!enabled) return;

    let timerId: number | undefined;

    const reset = () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    IDLE_EVENTS.forEach((event) =>
      window.addEventListener(event, reset, { passive: true }),
    );
    reset();

    return () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      IDLE_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [enabled, timeoutMs]);
};

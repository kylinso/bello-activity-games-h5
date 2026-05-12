import { isKioskMode } from './kiosk';

export const installKioskGuards = (): void => {
  if (!isKioskMode()) return;

  document.documentElement.classList.add('kiosk-mode');

  const preventDefault = (event: Event) => event.preventDefault();
  document.addEventListener('contextmenu', preventDefault);
  document.addEventListener('selectstart', preventDefault);
  document.addEventListener('dragstart', preventDefault);

  document.addEventListener('keydown', (event) => {
    const isReload = (event.ctrlKey || event.metaKey) && (event.key === 'r' || event.key === 'R');
    const blockedKeys = event.key === 'F5' || event.key === 'F11' || event.key === 'F12';
    if (isReload || blockedKeys) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
};

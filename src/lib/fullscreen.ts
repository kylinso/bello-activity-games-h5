type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
};

export const requestFullscreen = async (
  target: HTMLElement = document.documentElement,
): Promise<boolean> => {
  const el = target as FullscreenCapableElement;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
    if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
      return true;
    }
  } catch {
    // Fullscreen 拒绝（iOS Safari 不支持、被浏览器策略拒绝等）静默忽略
  }
  return false;
};

export const exitFullscreen = async (): Promise<void> => {
  const doc = document as FullscreenCapableDocument;
  try {
    if (doc.exitFullscreen && doc.fullscreenElement) {
      await doc.exitFullscreen();
      return;
    }
    if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
      await doc.webkitExitFullscreen();
      return;
    }
    if (doc.msExitFullscreen && doc.msFullscreenElement) {
      await doc.msExitFullscreen();
    }
  } catch {
    // 静默
  }
};

export const isInFullscreen = (): boolean => {
  const doc = document as FullscreenCapableDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
};

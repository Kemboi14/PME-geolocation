import { K as Keyboard } from "./index-BxvBY8V-.js";
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
const KEYBOARD_DID_OPEN = "ionKeyboardDidShow";
const KEYBOARD_DID_CLOSE = "ionKeyboardDidHide";
const KEYBOARD_THRESHOLD = 150;
let previousVisualViewport = {};
let currentVisualViewport = {};
let keyboardOpen = false;
const resetKeyboardAssist = () => {
  previousVisualViewport = {};
  currentVisualViewport = {};
  keyboardOpen = false;
};
const startKeyboardAssist = (win) => {
  const nativeEngine = Keyboard.getEngine();
  if (nativeEngine) {
    startNativeListeners(win);
  } else {
    if (!win.visualViewport) {
      return;
    }
    currentVisualViewport = copyVisualViewport(win.visualViewport);
    win.visualViewport.onresize = () => {
      trackViewportChanges(win);
      if (keyboardDidOpen() || keyboardDidResize(win)) {
        setKeyboardOpen(win);
      } else if (keyboardDidClose(win)) {
        setKeyboardClose(win);
      }
    };
  }
};
const startNativeListeners = (win) => {
  win.addEventListener("keyboardDidShow", (ev) => setKeyboardOpen(win, ev));
  win.addEventListener("keyboardDidHide", () => setKeyboardClose(win));
};
const setKeyboardOpen = (win, ev) => {
  fireKeyboardOpenEvent(win, ev);
  keyboardOpen = true;
};
const setKeyboardClose = (win) => {
  fireKeyboardCloseEvent(win);
  keyboardOpen = false;
};
const keyboardDidOpen = () => {
  const scaledHeightDifference = (previousVisualViewport.height - currentVisualViewport.height) * currentVisualViewport.scale;
  return !keyboardOpen && previousVisualViewport.width === currentVisualViewport.width && scaledHeightDifference > KEYBOARD_THRESHOLD;
};
const keyboardDidResize = (win) => {
  return keyboardOpen && !keyboardDidClose(win);
};
const keyboardDidClose = (win) => {
  return keyboardOpen && currentVisualViewport.height === win.innerHeight;
};
const fireKeyboardOpenEvent = (win, nativeEv) => {
  const keyboardHeight = nativeEv ? nativeEv.keyboardHeight : win.innerHeight - currentVisualViewport.height;
  const ev = new CustomEvent(KEYBOARD_DID_OPEN, {
    detail: { keyboardHeight }
  });
  win.dispatchEvent(ev);
};
const fireKeyboardCloseEvent = (win) => {
  const ev = new CustomEvent(KEYBOARD_DID_CLOSE);
  win.dispatchEvent(ev);
};
const trackViewportChanges = (win) => {
  previousVisualViewport = Object.assign({}, currentVisualViewport);
  currentVisualViewport = copyVisualViewport(win.visualViewport);
};
const copyVisualViewport = (visualViewport) => {
  return {
    width: Math.round(visualViewport.width),
    height: Math.round(visualViewport.height),
    offsetTop: visualViewport.offsetTop,
    offsetLeft: visualViewport.offsetLeft,
    pageTop: visualViewport.pageTop,
    pageLeft: visualViewport.pageLeft,
    scale: visualViewport.scale
  };
};
export {
  KEYBOARD_DID_CLOSE,
  KEYBOARD_DID_OPEN,
  copyVisualViewport,
  keyboardDidClose,
  keyboardDidOpen,
  keyboardDidResize,
  resetKeyboardAssist,
  setKeyboardClose,
  setKeyboardOpen,
  startKeyboardAssist,
  trackViewportChanges
};

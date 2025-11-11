import { a as componentOnReady } from "./index-BxvBY8V-.js";
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
const ION_CONTENT_TAG_NAME = "ION-CONTENT";
const ION_CONTENT_ELEMENT_SELECTOR = "ion-content";
const ION_CONTENT_CLASS_SELECTOR = ".ion-content-scroll-host";
const ION_CONTENT_SELECTOR = `${ION_CONTENT_ELEMENT_SELECTOR}, ${ION_CONTENT_CLASS_SELECTOR}`;
const isIonContent = (el) => el.tagName === ION_CONTENT_TAG_NAME;
const getScrollElement = async (el) => {
  if (isIonContent(el)) {
    await new Promise((resolve) => componentOnReady(el, resolve));
    return el.getScrollElement();
  }
  return el;
};
const findClosestIonContent = (el) => {
  return el.closest(ION_CONTENT_SELECTOR);
};
const scrollToTop = (el, durationMs) => {
  if (isIonContent(el)) {
    const content = el;
    return content.scrollToTop(durationMs);
  }
  return Promise.resolve(el.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth"
  }));
};
const scrollByPoint = (el, x, y, durationMs) => {
  if (isIonContent(el)) {
    const content = el;
    return content.scrollByPoint(x, y, durationMs);
  }
  return Promise.resolve(el.scrollBy({
    top: y,
    left: x,
    behavior: durationMs > 0 ? "smooth" : "auto"
  }));
};
export {
  scrollByPoint as a,
  findClosestIonContent as f,
  getScrollElement as g,
  scrollToTop as s
};

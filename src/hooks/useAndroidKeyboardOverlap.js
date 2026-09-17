import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export const keyboardOverlap = (bottom, keyboardTop) => keyboardTop == null ? 0 : Math.max(0, bottom - keyboardTop);

// Measure the outer viewport, not the composer. Native adjustResize therefore
// produces zero; only an actual residual occlusion receives compensation.
export const useAndroidKeyboardOverlap = () => {
  const viewport = useRef(null), keyboardTop = useRef(null);
  const [overlap, setOverlap] = useState(0);
  const measure = useCallback(() => {
    if (Platform.OS !== 'android') return;
    viewport.current?.measureInWindow((_x, y, _width, height) => {
      setOverlap(keyboardOverlap(y + height, keyboardTop.current));
    });
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      measure();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => { keyboardTop.current = null; setOverlap(0); });
    return () => { show.remove(); hide.remove(); };
  }, [measure]);
  return { viewport, overlap, measure };
};

/**
 * 移动端列表滑出 Hook
 * 在双栏页面中，移动端将 listPanel 从左侧滑出/隐藏
 */
import { useState, useRef, useCallback } from 'react';

function isMobile() { return window.innerWidth <= 768; }

export function useMobileList() {
  const [showMobileList, setShowMobileList] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile()) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile()) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // 右滑打开列表
    if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setShowMobileList(true);
    }
    // 左滑关闭列表
    if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setShowMobileList(false);
    }
  }, []);

  /** 选中列表项后关闭 */
  const onSelectItem = useCallback(() => {
    if (isMobile()) setShowMobileList(false);
  }, []);

  return {
    showMobileList,
    setShowMobileList,
    handleTouchStart,
    handleTouchEnd,
    onSelectItem,
    isMobile,
  };
}

/**
 * 懒加载与虚拟滚动优化组件
 * 简单的 IntersectionObserver 懒加载包装器
 * 以及大列表的分页虚拟化
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** 懒加载包装器：元素进入视口时才渲染 */
export function LazyLoad({ children, height = 100 }: { children: ReactNode; height?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ minHeight: visible ? 'auto' : height }}>
      {visible ? children : null}
    </div>
  );
}

/** 虚拟列表：只渲染可视区域的条目 */
export function VirtualList<T>({
  items,
  rowHeight,
  renderItem,
  overscan = 5,
}: {
  items: T[];
  rowHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  const totalHeight = items.length * rowHeight;
  const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIdx = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan);
  const visibleItems = items.slice(startIdx, endIdx);

  return (
    <div
      ref={containerRef}
      style={{ overflow: 'auto', height: '100%' }}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => (
          <div
            key={startIdx + i}
            style={{
              position: 'absolute',
              top: (startIdx + i) * rowHeight,
              width: '100%',
              height: rowHeight,
            }}
          >
            {renderItem(item, startIdx + i)}
          </div>
        ))}
      </div>
    </div>
  );
}

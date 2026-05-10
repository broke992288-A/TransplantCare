import { ReactNode, useEffect, useRef, useState } from "react";

interface LazyMountProps {
  children: ReactNode;
  /** Min height while not mounted (prevents layout shift). */
  minHeight?: number | string;
  /** rootMargin for IntersectionObserver. */
  rootMargin?: string;
  /** Once mounted, never unmount even if scrolled away. */
  keepMounted?: boolean;
  className?: string;
}

/**
 * Mount children only when the wrapper is visible (or near visible).
 * Used to defer expensive subtrees like recharts charts until needed.
 */
export function LazyMount({
  children,
  minHeight = 200,
  rootMargin = "200px",
  keepMounted = true,
  className,
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (keepMounted) obs.disconnect();
          } else if (!keepMounted) {
            setVisible(false);
          }
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin, keepMounted]);

  return (
    <div ref={ref} className={className} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : null}
    </div>
  );
}

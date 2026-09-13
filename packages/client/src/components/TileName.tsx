import { useEffect, useRef } from 'react';

/** Fit the actual font (including map-specific uppercase/monospace) to its cell. */
export default function TileName({ children, skin }: { children: string; skin: object }) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const box = host.current;
    const text = box?.firstElementChild as HTMLSpanElement | null;
    if (!box || !text) return;
    const fit = () => {
      if (!box.clientWidth || !box.clientHeight) return;
      let low = 5, high = parseFloat(getComputedStyle(box).fontSize);
      text.style.fontSize = `${high}px`;
      while (high - low > 0.25) {
        const size = (low + high) / 2;
        text.style.fontSize = `${size}px`;
        if (text.scrollHeight <= box.clientHeight && text.scrollWidth <= box.clientWidth) low = size;
        else high = size;
      }
      text.style.fontSize = `${low}px`;
      // Exceptionally long custom names remain scrollable, with the full name
      // also exposed on the tile and in the property inspector.
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [children, skin]);
  return <span ref={host} className="tile-name"><span>{children}</span></span>;
}

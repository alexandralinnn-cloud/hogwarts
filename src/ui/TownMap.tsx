import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app';
import { isUrgentOpen } from '../model';
import { IMG_H, IMG_W, SCENES } from '../scenes';
import { TOWN_URL } from './Bits';

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** The town picture, filling the screen; buildings can be tapped. Swipe to see the edges. */
export function TownMap() {
  const { snap, lang, openScene } = useApp();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = box.current!;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.max(size.w / IMG_W, size.h / IMG_H) || 0;
  const w = IMG_W * scale;
  const h = IMG_H * scale;

  // start centred
  const centred = useRef(false);
  useLayoutEffect(() => {
    if (!w || centred.current) return;
    centred.current = true;
    const el = box.current!;
    el.scrollLeft = (w - size.w) / 2;
    el.scrollTop = (h - size.h) / 2;
  }, [w, h]);

  const urgent = (id: string) => snap.tasks.filter((t) => t.scene === id && isUrgentOpen(t)).length;

  return (
    <div class="map" ref={box}>
      {scale > 0 && (
        <div class="town" style={{ width: w, height: h }}>
          <img src={TOWN_URL} alt="" draggable={false} />
          {SCENES.map((s) => {
            const n = urgent(s.id);
            const [x1, y1, x2, y2] = s.box;
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;
            const gw = (x2 - x1) * 1.25;
            const gh = (y2 - y1) * 1.2;
            return (
              <div key={s.id}>
                {n > 0 && (
                  <div
                    class="glow"
                    style={{
                      left: pct(cx - gw / 2, IMG_W),
                      top: pct(cy - gh / 2, IMG_H),
                      width: pct(gw, IMG_W),
                      height: pct(gh, IMG_H),
                    }}
                  />
                )}
                <button
                  class="hot"
                  aria-label={s.name[lang]}
                  onClick={() => openScene(s.id)}
                  style={{ left: pct(x1, IMG_W), top: pct(y1, IMG_H), width: pct(x2 - x1, IMG_W), height: pct(y2 - y1, IMG_H) }}
                />
                <button
                  class={`plate${n ? ' urgent' : ''}`}
                  onClick={() => openScene(s.id)}
                  style={{ left: pct(s.plate[0], IMG_W), top: pct(s.plate[1], IMG_H) }}
                >
                  {s.name[lang]}
                </button>
                {n > 0 && (
                  <button
                    class="bubble"
                    onClick={() => openScene(s.id)}
                    style={{ left: pct(s.bubble[0], IMG_W), top: pct(s.bubble[1], IMG_H) }}
                  >
                    <b>!</b>
                    {n}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

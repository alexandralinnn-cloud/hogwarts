import { useState } from 'preact/hooks';
import type { Cheer, Gain } from '../actions';
import { useApp, type GainPop, type Popup, type Toast } from '../app';
import { pickCheer } from '../cheers';
import { POINTS, titleOf, txt } from '../model';
import { PixelStar } from './Bits';

// little squares that fly out from the number
const SPARKS = [
  [-60, -36], [60, -36], [-84, 6], [84, 6], [-48, 42], [48, 42], [0, -54], [0, 54],
];

export function Overlays({
  toasts,
  gains,
  popup,
  closePopup,
  question,
  answer,
}: {
  toasts: Toast[];
  gains: GainPop[];
  popup: Popup | null;
  closePopup: () => void;
  question: { text: string } | null;
  answer: (ok: boolean) => void;
}) {
  const { t, lang } = useApp();
  return (
    <>
      <div class="gains">
        {gains.map((g) => (
          <div key={g.id} class={`gain ${g.kind}${g.by < 0 ? ' neg' : ''}`}>
            <b>
              {g.by > 0 ? '+' : ''}
              {g.by}
            </b>
            <span>{t(g.kind)}</span>
            {g.by > 0 &&
              SPARKS.map(([dx, dy], i) => <i key={i} class="spark" style={{ '--dx': `${dx}px`, '--dy': `${dy}px` }} />)}
          </div>
        ))}
      </div>
      <div class="toasts">
        {toasts.map((x) => (
          <div key={x.id} class={`toast ${x.kind}`}>
            {x.text}
          </div>
        ))}
      </div>
      {popup?.kind === 'cheer' && <CheerWindow key={popup.id} cheer={popup.cheer} gain={popup.gain} close={closePopup} />}
      {popup?.kind === 'level' && (
        <div class="modal-shade center" key={popup.id} onClick={closePopup}>
          <div class="levelup pbox">
            <div class="lu-title">{t('levelUp')}</div>
            <div class={`lvbadge big ${popup.stat}`}>{popup.level}</div>
            <div class="lu-text">
              {t(popup.stat)} Lv.{popup.level} · {titleOf(popup.level, lang)}
            </div>
            <button class="pbtn green">{t('yes')}</button>
          </div>
        </div>
      )}
      {question && (
        <div class="modal-shade center">
          <div class="ask pbox">
            <p>{question.text}</p>
            <div class="btnrow">
              <button class="pbtn dark" onClick={() => answer(false)}>
                {t('cancel')}
              </button>
              <button class="pbtn red" onClick={() => answer(true)}>
                {t('yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** "Why you got points" plus a few encouraging words. */
function CheerWindow({ cheer, gain, close }: { cheer: Cheer; gain: Gain; close: () => void }) {
  const { t, lang } = useApp();
  const [line] = useState(() => pickCheer(cheer.type));
  const diffWord = (d: number) => {
    const w = [t('easy'), t('medium'), t('hard')][d - 1];
    return lang === 'en' ? w.toLowerCase() : w;
  };

  let title: string;
  let note: string | null = null;
  const reasons: { text: string; pts: number; kind: 'exec' | 'growth' }[] = [];
  switch (cheer.type) {
    case 'open':
      title = t('cheerOpen');
      reasons.push({ text: t('reasonOpen'), pts: gain.growth - (cheer.bonus ? POINTS.streakBonus : 0), kind: 'growth' });
      if (cheer.bonus) reasons.push({ text: t('reasonStreak', { n: cheer.streak }), pts: POINTS.streakBonus, kind: 'growth' });
      if (cheer.streak > 1) note = t('streakNow', { n: cheer.streak });
      break;
    case 'complete':
      title = t('cheerComplete');
      reasons.push({ text: t('reasonComplete', { d: diffWord(cheer.difficulty), t: txt(cheer.title, lang) }), pts: gain.exec, kind: 'exec' });
      break;
    case 'hardSub':
      title = t('cheerHardSub');
      reasons.push({ text: t('reasonHardSub', { t: txt(cheer.title, lang), s: txt(cheer.sub, lang) }), pts: gain.exec, kind: 'exec' });
      break;
  }

  return (
    <div class="modal-shade center" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="cheer pbox">
        <div class="ch-stars">
          <PixelStar size={18} />
          <PixelStar size={27} />
          <PixelStar size={18} />
        </div>
        <div class="ch-title">{title}</div>
        <div class="ch-why">{t('whyPoints')}</div>
        {reasons.map((r, i) => (
          <div class="ch-reason" key={i}>
            <span>{r.text}</span>
            <b class={r.kind}>
              +{r.pts} {t(r.kind)}
            </b>
          </div>
        ))}
        {note && <div class="ch-note">{note}</div>}
        <p class="ch-line">{line[lang === 'zh' ? 0 : 1]}</p>
        <button class="pbtn green" onClick={close}>
          {t('continue')}
        </button>
      </div>
    </div>
  );
}

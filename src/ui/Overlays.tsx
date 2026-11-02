import { useApp, type GainPop, type Toast } from '../app';
import { titleOf } from '../model';

// little squares that fly out from the number
const SPARKS = [
  [-60, -36], [60, -36], [-84, 6], [84, 6], [-48, 42], [48, 42], [0, -54], [0, 54],
];

export function Overlays({
  toasts,
  gains,
  levelUp,
  closeLevelUp,
  question,
  answer,
}: {
  toasts: Toast[];
  gains: GainPop[];
  levelUp: { kind: 'exec' | 'growth'; level: number } | null;
  closeLevelUp: () => void;
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
      {levelUp && (
        <div class="modal-shade center" onClick={closeLevelUp}>
          <div class="levelup pbox">
            <div class="lu-title">{t('levelUp')}</div>
            <div class={`lvbadge big ${levelUp.kind}`}>{levelUp.level}</div>
            <div class="lu-text">
              {t(levelUp.kind)} Lv.{levelUp.level} · {titleOf(levelUp.level, lang)}
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

import { useApp, type Toast } from '../app';
import { titleOf } from '../model';

export function Overlays({
  toasts,
  levelUp,
  closeLevelUp,
  question,
  answer,
}: {
  toasts: Toast[];
  levelUp: { kind: 'exec' | 'growth'; level: number } | null;
  closeLevelUp: () => void;
  question: { text: string } | null;
  answer: (ok: boolean) => void;
}) {
  const { t, lang } = useApp();
  return (
    <>
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

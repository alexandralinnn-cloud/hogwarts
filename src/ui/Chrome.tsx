import { useApp, type View } from '../app';
import { StatBar } from './Bits';
import { Icon, type IconName } from './Icon';

export function Header() {
  const { t, lang, setLang, snap, setSettingsOpen } = useApp();
  const banner =
    snap.mode === 'demo' ? t('demoBanner') : snap.mode === 'local' ? t('localBanner') : !snap.isOwner ? t('visitorBanner') : null;
  return (
    <header class="hdr pwood">
      <div class="trow">
        <div class="title">{t('appName')}</div>
        <div class="hbtns">
          <div class="lang">
            <button class={lang === 'zh' ? 'on' : ''} onClick={() => setLang('zh')}>
              中
            </button>
            <button class={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
              EN
            </button>
          </div>
          <button class="iconbtn" onClick={() => setSettingsOpen(true)} aria-label={t('settings')}>
            <Icon name="cog" size={24} />
          </button>
        </div>
      </div>
      <div class="stats">
        <StatBar kind="exec" />
        <StatBar kind="growth" />
      </div>
      {banner && <div class="banner">{banner}</div>}
      {snap.error && <div class="banner err">⚠ {t('dbError', { c: snap.error })}</div>}
    </header>
  );
}

export function Nav() {
  const { t, view, setView } = useApp();
  const items: [View, IconName, Parameters<typeof t>[0]][] = [
    ['town', 'map', 'navTown'],
    ['board', 'script', 'navBoard'],
    ['growth', 'chart', 'navGrowth'],
  ];
  return (
    <nav class="nav pwood">
      {items.map(([v, icon, label]) => (
        <button key={v} class={`ni${view === v ? ' on' : ''}`} onClick={() => setView(v)}>
          <Icon name={icon} size={24} />
          <span>{t(label)}</span>
        </button>
      ))}
    </nav>
  );
}

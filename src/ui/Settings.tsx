import { useState } from 'preact/hooks';
import { useApp } from '../app';
import { dayKey, type BackupData } from '../model';
import { Scroll, Segmented } from './Bits';
import { Icon } from './Icon';
import { DEFAULT_DEAN_MSG, DEFAULT_PC_SHORTCUT } from './SceneScroll';

const PLANCOACH_STORE = 'https://apps.apple.com/app/id6748287561';

export function Settings() {
  const { t, lang, setLang, setSettingsOpen, snap, store, toast, ask } = useApp();
  const close = () => setSettingsOpen(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState(snap.settings.deanPhone || '');
  const [msg, setMsg] = useState(snap.settings.deanMsg || DEFAULT_DEAN_MSG);
  const [shortcut, setShortcut] = useState(snap.settings.pcShortcut || DEFAULT_PC_SHORTCUT);

  const login = async () => {
    setBusy(true);
    try {
      await store.login(email.trim(), password);
      setPassword('');
    } catch {
      toast(t('loginFailed'));
    }
    setBusy(false);
  };

  const saveOwner = async () => {
    await store.saveSettings({ deanPhone: phone.trim(), deanMsg: msg.trim() || DEFAULT_DEAN_MSG, pcShortcut: shortcut.trim() || DEFAULT_PC_SHORTCUT });
    toast(t('saved'));
  };

  const exportBackup = async () => {
    const data: BackupData = {
      app: 'hogwarts',
      version: 1,
      exportedAt: Date.now(),
      tasks: snap.tasks,
      stats: snap.stats,
      log: snap.log,
      settings: snap.settings,
    };
    const name = `hogwarts-backup-${dayKey().slice(1)}.json`;
    const file = new File([JSON.stringify(data, null, 1)], name, { type: 'application/json' });
    // On iPhone this opens the share sheet ("Save to Files"); elsewhere it downloads.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch {
        /* cancelled or not allowed: fall back to a download */
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const importBackup = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as BackupData;
      if (data.app !== 'hogwarts' || !Array.isArray(data.tasks)) throw new Error('bad');
      if (!(await ask(t('importConfirm')))) return;
      await store.replaceAll(data);
      toast(t('importDone'));
    } catch {
      toast(t('importBad'));
    }
  };

  return (
    <div class="modal-shade">
      <Scroll class="editor unroll">
        <div class="shead small">
          <h2 class="ftitle">{t('settings')}</h2>
          <button class="x" onClick={close} aria-label="close">
            <Icon name="close" size={24} />
          </button>
        </div>
        <div class="sheet-body form">
          <div class="frow">
            <label class="fl">{t('language')}</label>
            <Segmented
              value={lang}
              onChange={setLang}
              options={[
                { value: 'zh', label: '中文' },
                { value: 'en', label: 'English' },
              ]}
            />
          </div>

          <h3 class="fh">{t('account')}</h3>
          {snap.mode !== 'firebase' ? (
            <p class="note">{t('notConnected')}</p>
          ) : snap.userEmail ? (
            <>
              <p class="note">{t('loggedInAs', { e: snap.userEmail })}</p>
              {!snap.isOwner && <p class="note warn">{t('notOwnerAccount')}</p>}
              <button class="pbtn dark" onClick={() => store.logout()}>
                <Icon name="logout" size={12} /> {t('logout')}
              </button>
            </>
          ) : (
            <>
              <label class="fl">{t('email')}</label>
              <input class="fi" type="email" autocomplete="username" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} />
              <label class="fl">{t('password')}</label>
              <input
                class="fi"
                type="password"
                autocomplete="current-password"
                value={password}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
              />
              <button class="pbtn green" onClick={login} disabled={busy || !email || !password}>
                <Icon name="login" size={12} /> {t('login')}
              </button>
            </>
          )}

          {snap.isOwner && (
            <>
              <h3 class="fh">{t('deanSection')}</h3>
              <label class="fl">{t('deanPhone')}</label>
              <input class="fi" type="tel" placeholder="+852 …" value={phone} onInput={(e) => setPhone((e.target as HTMLInputElement).value)} />
              <label class="fl">{t('deanMsg')}</label>
              <textarea class="fi small" rows={2} value={msg} onInput={(e) => setMsg((e.target as HTMLTextAreaElement).value)} />

              <h3 class="fh">{t('pcSection')}</h3>
              <label class="fl">{t('pcShortcut')}</label>
              <input class="fi" value={shortcut} onInput={(e) => setShortcut((e.target as HTMLInputElement).value)} />
              <p class="note">{t('pcGuide')}</p>
              <a class="link" href={PLANCOACH_STORE} target="_blank" rel="noopener">
                {t('pcStore')}
              </a>
              <button class="pbtn green" onClick={saveOwner}>
                <Icon name="check" size={12} /> {t('save')}
              </button>

              <h3 class="fh">{t('backup')}</h3>
              <div class="btnrow">
                <button class="pbtn dark" onClick={exportBackup}>
                  <Icon name="download" size={12} /> {t('exportBtn')}
                </button>
                <label class="pbtn dark">
                  <Icon name="upload" size={12} /> {t('importBtn')}
                  <input type="file" accept="application/json,.json" hidden onChange={importBackup} />
                </label>
              </div>
            </>
          )}

          <h3 class="fh">{t('about')}</h3>
          <p class="note">{t('credits')}</p>
        </div>
      </Scroll>
    </div>
  );
}

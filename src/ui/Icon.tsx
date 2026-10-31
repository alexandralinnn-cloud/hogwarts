import map from 'pixelarticons/svg/map.svg?raw';
import script from 'pixelarticons/svg/script.svg?raw';
import chart from 'pixelarticons/svg/chart-bar-big.svg?raw';
import zap from 'pixelarticons/svg/zap.svg?raw';
import heart from 'pixelarticons/svg/heart.svg?raw';
import close from 'pixelarticons/svg/close.svg?raw';
import plus from 'pixelarticons/svg/plus.svg?raw';
import check from 'pixelarticons/svg/check.svg?raw';
import lock from 'pixelarticons/svg/lock.svg?raw';
import messageText from 'pixelarticons/svg/message-text.svg?raw';
import message from 'pixelarticons/svg/message.svg?raw';
import human from 'pixelarticons/svg/human-arms-up.svg?raw';
import cog from 'pixelarticons/svg/settings-cog.svg?raw';
import pencil from 'pixelarticons/svg/pencil.svg?raw';
import trash from 'pixelarticons/svg/trash.svg?raw';
import chevronLeft from 'pixelarticons/svg/chevron-left.svg?raw';
import download from 'pixelarticons/svg/download.svg?raw';
import upload from 'pixelarticons/svg/upload.svg?raw';
import fire from 'pixelarticons/svg/fire.svg?raw';
import login from 'pixelarticons/svg/login.svg?raw';
import logout from 'pixelarticons/svg/logout.svg?raw';
import eye from 'pixelarticons/svg/eye.svg?raw';

const ICONS = {
  map, script, chart, zap, heart, close, plus, check, lock, messageText, message, human, cog,
  pencil, trash, chevronLeft, download, upload, fire, login, logout, eye,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, class: cls = '' }: { name: IconName; size?: number; class?: string }) {
  const svg = ICONS[name].replace('<svg ', `<svg width="${size}" height="${size}" aria-hidden="true" `);
  return <span class={`pi ${cls}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

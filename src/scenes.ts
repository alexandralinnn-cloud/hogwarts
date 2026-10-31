// The seven places in town. Coordinates are pixels on the original town picture (1342 × 2000).

export const IMG_W = 1342;
export const IMG_H = 2000;

export type SceneId = 'library' | 'clinic' | 'market' | 'guild' | 'tavern' | 'farm' | 'dock';

type Pair = { zh: string; en: string };

export interface Scene {
  id: SceneId;
  name: Pair;
  category: Pair;
  blurb: Pair;
  /** tap area: x1, y1, x2, y2 */
  box: [number, number, number, number];
  /** where the name plate sits */
  plate: [number, number];
  /** where the "!" bubble points to */
  bubble: [number, number];
  /** square crop used as the little picture in lists: x, y, size */
  thumb: [number, number, number];
}

export const SCENES: Scene[] = [
  {
    id: 'library',
    name: { zh: '图书馆', en: 'Library' },
    category: { zh: '智识成长', en: 'Intellectual Growth' },
    blurb: { zh: '想知道的 · 需要知道的 · 好奇的', en: 'Want to know · Need to know · Curious about' },
    box: [230, 190, 540, 720],
    plate: [390, 745],
    bubble: [480, 175],
    thumb: [190, 270, 400],
  },
  {
    id: 'clinic',
    name: { zh: '诊所', en: 'Clinic' },
    category: { zh: '自我照顾', en: 'Self Care' },
    blurb: { zh: '照顾好自己的身体和心', en: 'Looking after body and mind' },
    box: [770, 380, 1230, 680],
    plate: [1000, 365],
    bubble: [1170, 330],
    thumb: [790, 330, 420],
  },
  {
    id: 'market',
    name: { zh: '有用又开心', en: 'Helpful & Happy' },
    category: { zh: '有用又开心', en: 'Helpful & Happy' },
    blurb: { zh: '市集 · 实用又让我开心的小事', en: 'Market · Useful things that make me happy' },
    box: [80, 830, 540, 1180],
    plate: [300, 1200],
    bubble: [440, 835],
    thumb: [100, 800, 420],
  },
  {
    id: 'guild',
    name: { zh: '冒险者公会', en: "Adventurers' Guild" },
    category: { zh: '服务他人', en: 'Service' },
    blurb: { zh: '我能怎样让你的生活更轻松', en: 'How can I make your life easier?' },
    box: [820, 720, 1260, 1070],
    plate: [1040, 1095],
    bubble: [1075, 730],
    thumb: [830, 690, 420],
  },
  {
    id: 'tavern',
    name: { zh: '酒馆', en: 'Tavern' },
    category: { zh: '玩', en: 'Play' },
    blurb: { zh: '好好玩', en: 'Time to have fun' },
    box: [540, 1080, 920, 1430],
    plate: [730, 1455],
    bubble: [800, 1075],
    thumb: [520, 1050, 420],
  },
  {
    id: 'farm',
    name: { zh: '农田', en: 'Farm' },
    category: { zh: '个人成长', en: 'Personal Growth' },
    blurb: { zh: '像种地一样，慢慢长', en: 'Growing slowly, like crops' },
    box: [30, 1290, 680, 1800],
    plate: [300, 1835],
    bubble: [230, 1300],
    thumb: [40, 1290, 520],
  },
  {
    id: 'dock',
    name: { zh: '码头', en: 'Dock' },
    category: { zh: '情绪包袱', en: 'Emotional Baggage' },
    blurb: { zh: '把包袱卸下来', en: 'Unloading what weighs on me' },
    box: [910, 1640, 1180, 1860],
    plate: [1045, 1890],
    bubble: [1120, 1650],
    thumb: [860, 1560, 360],
  },
];

export const sceneById = (id: SceneId) => SCENES.find((s) => s.id === id)!;

// Encouraging lines shown in the cheer window. Each entry is [Chinese, English]; one is picked at random.

type Line = [string, string];

export const CHEERS: Record<'open' | 'complete' | 'hardSub', Line[]> = {
  open: [
    ['欢迎回到小镇，冒险者！今天从一件小事开始就好。', 'Welcome back to town, adventurer! Starting with one small thing is enough today.'],
    ['城门为你打开了。不用一次做完，今天比昨天多走一步就好。', 'The town gates are open for you. No need to do it all—just one step further than yesterday.'],
    ['学徒，你又来报到了！能出现，本身就是一种坚持。', 'You showed up again! Showing up is already a kind of persistence.'],
    ['新的一天，新的卷轴。挑一个最容易的任务暖暖身吧。', 'A new day, a new scroll. Pick the easiest quest to warm up.'],
    ['炉火还暖着，欢迎回来。慢慢来，我们一起前进。', 'The hearth is still warm—welcome back. Take it slow; we move forward together.'],
    ['每天回来看看小镇，就是在给未来的自己存经验值。', 'Every visit to town is experience saved up for your future self.'],
    ['骑士不是一天练成的，你正在一天一天变强。', "Knights aren't made in a day—you're getting stronger day by day."],
    ['今天的你来了，这就值得一颗星星。', 'You came today, and that alone deserves a star.'],
    ['小镇的居民都在等你。今天想先去哪一栋建筑？', 'The townsfolk have been waiting. Which building will you visit first today?'],
    ['不管昨天怎样，今天都是新的开始。', 'Whatever happened yesterday, today is a fresh start.'],
    ['打开地图的那一刻，冒险就已经开始了。', 'The adventure begins the moment you open the map.'],
    ['你的坚持正在悄悄累积成力量。', 'Your persistence is quietly building into strength.'],
  ],
  complete: [
    ['任务完成！又一块石头被你搬开了。', 'Quest complete! Another stone moved out of your way.'],
    ['干得漂亮，冒险者！把它划掉的感觉是不是很棒？', "Well done, adventurer! Doesn't crossing it off feel great?"],
    ['你做到了。拖延的魔咒又被你破解了一个。', 'You did it. Another procrastination spell broken.'],
    ['小镇因为你又变好了一点点。', 'The town just got a little better because of you.'],
    ['一件事做完，心里的背包就轻了一点。', 'One thing done, and your backpack feels a little lighter.'],
    ['这就是勇者的样子：不等完美，先完成。', 'This is what heroes look like: done, not perfect.'],
    ['为你鼓掌！记住现在这种完成的感觉。', 'Applause! Remember this feeling of finishing.'],
    ['又一份卷轴归档了。你比自己以为的更能干。', "Another scroll filed away. You're more capable than you think."],
    ['漂亮的一击！经验值已入账。', 'A clean strike! Experience points received.'],
    ['你今天对未来的自己很好。', 'You were kind to your future self today.'],
    ['完成比完美更重要，而你刚刚完成了。', 'Done beats perfect—and you just got it done.'],
    ['酒馆今晚会为你举杯！', 'The tavern will raise a toast to you tonight!'],
  ],
  hardSub: [
    ['困难的任务也是一步一步攻下的，你刚刚又前进了一步。', 'Hard quests fall one step at a time—you just took another.'],
    ['巨龙不是一剑打倒的。这一剑砍得很好！', "Dragons aren't slain with one blow. That was a good strike!"],
    ['高塔再高，也是一级一级爬上去的。', "However tall the tower, it's climbed one stair at a time."],
    ['难的部分正在被你一点点拆掉。', "You're taking the hard part apart, piece by piece."],
    ['进度条在动了！保持这个节奏。', 'The progress bar is moving! Keep this pace.'],
    ['这一步不小，给自己点个赞。', "That step wasn't small. Give yourself credit."],
    ['学徒，你离完成这个大任务又近了一些。', "You're one step closer to finishing this big quest."],
    ['慢慢来也是在前进，而且你在前进。', "Slow is still forward—and you're moving forward."],
    ['拆开来做，原来没那么可怕，对吧？', "Broken into pieces, it's not so scary after all, right?"],
    ['每一个小勾，都是给大任务的一记重拳。', 'Every little tick is a solid punch to the big quest.'],
    ['勇者的耐心正在发光。', "A hero's patience is shining through."],
    ['下一步也交给现在这个专注的你吧。', 'Let this focused you take the next step too.'],
  ],
};

let last = -1;
/** A random line for this kind of moment (never the same twice in a row). */
export function pickCheer(type: keyof typeof CHEERS): Line {
  const pool = CHEERS[type];
  let i = Math.floor(Math.random() * pool.length);
  if (i === last) i = (i + 1) % pool.length;
  last = i;
  return pool[i];
}

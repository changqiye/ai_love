export const classicCharacterIds = ['xiaoman', 'zhiyao', 'yuqing'] as const;
export const cgCharacterIds = ['xinglan', 'gufei', 'evelyn', 'nanzhi', 'reina', 'selene'] as const;
export const characterIds = [...classicCharacterIds, ...cgCharacterIds] as const;
export type CharacterId = typeof characterIds[number];
export type Wardrobe = 'original' | 'low';
export const wardrobeLabels:Record<Wardrobe,string>={original:'原版造型',low:'低领短裙'};
export const sceneIds = ['park', 'living', 'bedroom', 'study'] as const;
export type SceneId = typeof sceneIds[number];
export const danceActionIds = ['dance','sway','groove','shuffle','swing','ballet'] as const;
export type DanceAction = typeof danceActionIds[number];
export type Action = 'idle' | 'walk' | 'sit' | 'wave' | 'stretch' | 'hair' | DanceAction;
export const actionLabels: Record<Action,string> = {idle:'温柔待机',walk:'一起散步',sit:'坐一会儿',wave:'向你招手',stretch:'舒展一下',hair:'整理发梢',dance:'轻快律动',sway:'月光摇摆',groove:'日落舞步',shuffle:'轻盈曳步',swing:'爵士摇摆',ballet:'花间圆舞'};
export const danceTracks: Record<DanceAction,{title:string;subtitle:string;beatMs:number;beats:number;icon:string}> = {
  dance:{title:'轻快律动',subtitle:'轻盈侧步 · 清新的流行节拍',beatMs:600,beats:16,icon:'music-2'},
  sway:{title:'月光摇摆',subtitle:'柔和转身 · 慢一点的双人时光',beatMs:850,beats:12,icon:'moon'},
  groove:{title:'日落舞步',subtitle:'活力踏步 · 带一点复古律动',beatMs:500,beats:20,icon:'sun'},
  shuffle:{title:'轻盈曳步',subtitle:'交替滑步 · 脚尖追着节拍',beatMs:480,beats:24,icon:'footprints'},
  swing:{title:'爵士摇摆',subtitle:'轻巧摇摆 · 松弛的爵士时光',beatMs:550,beats:20,icon:'music-2'},
  ballet:{title:'花间圆舞',subtitle:'柔软弧线 · 像花瓣一样起舞',beatMs:750,beats:16,icon:'flower-2'},
};
export const isDance=(action:Action):action is DanceAction=>danceActionIds.includes(action as DanceAction);
export const characters = {
  xinglan: {"name":"洛星澜","short":"星澜","en":"XINGLAN","age":19,"style":"曜石运动","trait":"把勇气，放进每一个平凡日子。","color":"#625768","flower":"把勇气，放进每一个平凡日子。","likes":"散步 · 柠檬咖啡 · 小小的冒险","favorite":"coffee","greeting":"准备好了吗？今天想陪你走得远一点。","lines":{"walk":"跟紧我。走累了就告诉我，我会陪你慢下来。","dance":"节拍交给你，舞步交给我。","sit":"休息也是训练的一部分，坐过来吧。","tap":"嗯？我在。有什么小秘密要告诉我？"}},
  gufei: {"name":"顾绯","short":"顾绯","en":"GU FEI","age":19,"style":"绯红谜影","trait":"有些默契，不必说破。","color":"#a8444c","flower":"有些默契，不必说破。","likes":"黑咖啡 · 爵士乐 · 雨夜","favorite":"coffee","greeting":"比约定早了一点。看来，你也很期待今天。","lines":{"walk":"别急，有些风景适合慢慢接近。","dance":"跟上我的节奏，或许会有一点惊喜。","sit":"卸下今天的紧绷吧，这里很安静。","tap":"发现我在看你了？眼力不错。"}},
  evelyn: {"name":"伊芙琳","short":"伊芙琳","en":"EVELYN","age":19,"style":"月光香槟","trait":"让普通的一天，也有一点仪式感。","color":"#c6ac86","flower":"让普通的一天，也有一点仪式感。","likes":"鲜花 · 钢琴 · 午后甜点","favorite":"flowers","greeting":"很高兴见到你。今天的好天气，值得一起分享。","lines":{"walk":"慢慢走吧，我想记住路上的每一种颜色。","dance":"可以邀请你，陪我跳这一小段吗？","sit":"一起安静坐着，也是一种温柔的约会。","tap":"你一笑，我也忍不住跟着笑了。"}},
  nanzhi: {"name":"南栀","short":"南栀","en":"NAN ZHI","age":19,"style":"翡翠东方","trait":"风有回音，日子也有。","color":"#4e8075","flower":"风有回音，日子也有。","likes":"花草 · 茶点 · 旧书","favorite":"flowers","greeting":"你来了。茶还温着，今天有什么想告诉我的？","lines":{"walk":"有花可看，有人同行，就不算虚度光阴。","dance":"把脚步放轻一点，让旋律慢慢带着我们走。","sit":"不妨坐一会儿，看看光怎样落在窗边。","tap":"嗯，我听着呢。慢慢说就好。"}},
  reina: {"name":"蕾娜","short":"蕾娜","en":"REINA","age":19,"style":"银蓝都市","trait":"把好奇心，留给明天。","color":"#76869b","flower":"把好奇心，留给明天。","likes":"电子音乐 · 摄影 · 城市漫步","favorite":"vinyl","greeting":"来得正好！我发现了一条很适合散步的小路。","lines":{"walk":"下个路口，我们往没去过的方向走。","dance":"这段节拍不错。跟不上也没关系，我再教你一遍。","sit":"暂停键按下。先让脑袋和肩膀都放松一下。","tap":"收到你的信号了。现在，注意力归你。"}},
  selene: {"name":"赛琳","short":"赛琳","en":"SELENE","age":19,"style":"日落律动","trait":"快乐会传染，温柔也是。","color":"#b47c57","flower":"快乐会传染，温柔也是。","likes":"舞蹈 · 唱片 · 手作甜点","favorite":"vinyl","greeting":"嘿，今天过得怎么样？来，先给自己一个微笑。","lines":{"walk":"看，连影子都在陪我们散步。","dance":"肩膀放松，听见节奏了吗？我们一起开始。","sit":"再热闹的日子，也要留一点安静给自己。","tap":"在呢！你这一声，把我的好心情叫出来了。"}},
  xiaoman: { name: '林小满', short: '小满', en: 'XIAOMAN', age: 19, style: '甜美可爱', trait: '把每件小事，都过成小确幸。', color: '#d89991', flower: '花开有时，心动也是。', likes: '草莓甜点 · 鲜花 · 散步', favorite: 'cake', greeting: '你来啦！刚好，今天的阳光和我的心情都很不错。', lines: { walk: '慢一点嘛，想和你把这条路走久一点。', dance: '这个动作我偷偷练了好久，今天只跳给你看！', sit: '坐近一点吧，今天的风也很温柔。', tap: '嗯？我在呢。你一叫我，我就开心。' } },
  zhiyao: { name: '沈知遥', short: '知遥', en: 'ZHIYAO', age: 19, style: '知性御姐', trait: '慢慢来，我有时间听你说。', color: '#7c9287', flower: '不必赶路，先感受风。', likes: '手冲咖啡 · 阅读 · 雨声', favorite: 'coffee', greeting: '来了？给你留了一个位置。今天，想聊些什么？', lines: { walk: '偶尔把目的地忘掉，也是一种很好的出发。', dance: '别笑。我只是觉得，和你一起可以偶尔不那么从容。', sit: '什么都不做也很好。今天的时间，我们慢慢花。', tap: '看着我做什么？好吧，我也在看你。' } },
  yuqing: { name: '夏予晴', short: '予晴', en: 'YUQING', age: 19, style: '热辣活力', trait: '心动就行动，快乐要尽兴。', color: '#c9795a', flower: '把心跳，调成同一个节拍。', likes: '音乐唱片 · 跳舞 · 晨跑', favorite: 'vinyl', greeting: '终于等到你！今天想一起做点让心跳加速的事。', lines: { walk: '跟上我的脚步！不过你慢一点也没关系，我等你。', dance: '准备好了吗？这首歌，和我一起踩准节拍！', sit: '充电五分钟，再一起去发现一点新鲜事。', tap: '被你发现了，我刚才在偷偷看你。' } },
} as const;
export const scenes = {
  park: { name: '樱花公园', en: 'SAKURA PARK', weather: '微风 · 22°', icon: 'flower-2', time: '春日午后', subtitle: '风里，藏着一场粉色的相遇。', memory: '落在肩上的春天', color: '#8caa91' },
  living: { name: '阳光客厅', en: 'SUNLIT HOME', weather: '晴朗 · 24°', icon: 'sun', time: '温柔日光', subtitle: '有你的地方，阳光刚刚好。', memory: '一杯午后的阳光', color: '#c3a576' },
  bedroom: { name: '黄昏卧室', en: 'GOLDEN HOUR', weather: '日落 · 21°', icon: 'moon', time: '日落时分', subtitle: '把一天的温柔，留在这里。', memory: '晚霞寄来的晚安', color: '#b38986' },
  study: { name: '雨天书房', en: 'RAINY RETREAT', weather: '小雨 · 18°', icon: 'cloud-rain', time: '听雨时光', subtitle: '雨声很轻，你可以慢慢说。', memory: '读到有你的那一页', color: '#708884' },
} as const;
export const gifts = [
  { id: 'flowers', name: '一束小花', detail: '把好心情装进花束', price: 12, icon: 'flower-2', color: '#e4c5c1' },
  { id: 'coffee', name: '手冲咖啡', detail: '一杯恰到好处的温暖', price: 15, icon: 'coffee', color: '#d8c1a7' },
  { id: 'cake', name: '草莓蛋糕', detail: '今天也要有一点甜', price: 18, icon: 'cake-slice', color: '#e5b7bf' },
  { id: 'vinyl', name: '复古唱片', detail: '收藏属于两人的旋律', price: 20, icon: 'disc-3', color: '#b7c7bc' },
] as const;
export type GiftId = typeof gifts[number]['id'];
const replies: Record<typeof classicCharacterIds[number], Record<string, string[]>> = {
  xiaoman: { sad: ['今天辛苦啦。先不急着让自己开心，陪你坐一会儿，好不好？', '把不开心分给我一点吧。剩下的，我们慢慢消化。'], happy: ['真的嘛！快多讲一点，我想把你的快乐也记下来。', '好开心！今天值得加一份草莓蛋糕！'], love: ['你突然这么说，我会不好意思的……但我也很喜欢现在这样。', '和你一起的普通一天，也会变得特别。'], food: ['我今天想吃草莓蛋糕！你呢？我们可以各点一份，交换第一口。'], music: ['想听一首轻轻的歌，再和你笨笨地跳一小段。'], night: ['晚安呀。今天没做完的事，明天再说。我希望你能睡个好觉。'], default: ['嗯嗯，我在听。和你分享日常，是我最喜欢的小事。', '今天有没有一件很小、却让你记到现在的事？', '我们去走走吧？有些话，边走边说会更轻松。'] },
  zhiyao: { sad: ['不必把一切都处理好了才来见我。疲惫的时候，也可以坦然停下来。', '我在。想说就说，不想说，我们就安静坐一会儿。'], happy: ['听起来是个值得纪念的日子。你做得很好，也记得给自己一点奖励。'], love: ['我不太擅长说漂亮话，但和你在一起的时间，我很珍惜。'], food: ['刚好煮了咖啡。或者我们去吃点热的？好好吃饭，也是在认真生活。'], music: ['我喜欢旋律里留一点空白。像两个人相处，不必每一刻都说话。'], night: ['今天到这里就很好了。把明天的事交给明天，晚安。'], default: ['我听到了。对你来说，这件事最重要的部分是什么？', '我更想知道你的想法。慢慢说，我们不赶时间。', '窗外的光刚刚变了。要不要休息一下，再继续聊？'] },
  yuqing: { sad: ['今天不想逞强就别逞强，我陪你。等缓过来，我们再一起出发。'], happy: ['这也太棒了！来，击个掌！开心的事就应该大大方方庆祝。'], love: ['直球是吧？那我也直说：我很喜欢和你一起的感觉。'], food: ['运动之后吃点好吃的，才是完整的快乐！走吧，我请你想菜单。'], music: ['选一首你喜欢的，我们一起跳！跟不上也没关系，开心最重要。'], night: ['收到，今天的快乐已存档！晚安，明天继续一起冒险。'], default: ['有意思！继续讲，我还想知道后面呢。', '我有个主意：先陪我跳一段，再把今天的故事讲完。', '不一定要去很远的地方。和你一起，楼下散步也算小小的冒险。'] },
};
export function replyTo(id: CharacterId, message: string, index: number): string {
  const topic = /难过|累|烦|孤独|伤心|压力|不好|失眠/.test(message) ? 'sad' : /开心|高兴|成功|完成|快乐|喜欢今天/.test(message) ? 'happy' : /喜欢你|爱你|想你|心动|约会/.test(message) ? 'love' : /吃|饿|咖啡|蛋糕|饭/.test(message) ? 'food' : /跳舞|音乐|歌|唱片/.test(message) ? 'music' : /晚安|睡觉|夜/.test(message) ? 'night' : 'default';
  if(id in replies){const pool = replies[id as typeof classicCharacterIds[number]][topic]; return pool[index % pool.length];}
  const c=characters[id];
  const pools:Record<string,string[]>={
    sad:[`${c.short==='顾绯'?'你不用在我面前一直保持从容。':'今天已经很努力了。'}想说就说，我陪你慢慢理一理。`,c.lines.sit],
    happy:[`听起来是个值得庆祝的好消息。和你一起开心，是今天最好的安排。`,c.flower],
    love:[`和你相处的这些日常，我很珍惜。下一段回忆，也一起写吧。`,c.lines.tap],
    food:[`我喜欢${c.likes.split(' · ')[0]}。不过今天也想尝尝你推荐的，我们一起选吧。`],
    music:[c.lines.dance,`轻快、温柔，还是更有活力一点？选一首，我们一起听。`],
    night:[`晚安。今天的故事先收在这里，明天再慢慢续写。愿你睡个好觉。`],
    default:[c.flower,c.lines.walk,`我在听。今天这件事，让你最在意的是什么？`],
  };
  const pool=pools[topic];return pool[index%pool.length];
}

export const COLORS = ['#E8A59B','#A8C4B8','#9BB5CC','#C4B5D4','#F0C878','#B8D4A0','#D4A8C4','#8EC8C8']
export const PETS = {
  cat:{e:'🐱',n:'貓咪'}, dog:{e:'🐶',n:'狗狗'}, rabbit:{e:'🐰',n:'兔兔'},
  dino:{e:'🦕',n:'恐龍'}, duck:{e:'🐥',n:'小鴨'}, monster:{e:'👾',n:'怪獸'}
}
// 14 accessories across 3 rarities; slot = head|face|neck; unlockAt = cumulative earned score
export const ACCESSORIES = {
  hat1:      { emoji: '🎩', slot: 'head', rarity: 'common',    unlockAt: 5,  label: '紳士帽' },
  glasses1:  { emoji: '🕶️', slot: 'face', rarity: 'common',    unlockAt: 5,  label: '墨鏡' },
  bow1:      { emoji: '🎀', slot: 'neck', rarity: 'common',    unlockAt: 5,  label: '蝴蝶結' },
  crown1:    { emoji: '👑', slot: 'head', rarity: 'rare',      unlockAt: 20, label: '皇冠' },
  helmet1:   { emoji: '⛑️', slot: 'head', rarity: 'rare',      unlockAt: 20, label: '英雄頭盔' },
  glasses2:  { emoji: '🥽', slot: 'face', rarity: 'rare',      unlockAt: 20, label: '護目鏡' },
  scarf1:    { emoji: '🧣', slot: 'neck', rarity: 'rare',      unlockAt: 20, label: '圍巾' },
  hat2:      { emoji: '🎓', slot: 'head', rarity: 'rare',      unlockAt: 20, label: '學士帽' },
  halo1:     { emoji: '😇', slot: 'head', rarity: 'legendary', unlockAt: 40, label: '光環' },
  helmet2:   { emoji: '🪖', slot: 'head', rarity: 'legendary', unlockAt: 40, label: '勇者頭盔' },
  glasses3:  { emoji: '👓', slot: 'face', rarity: 'legendary', unlockAt: 40, label: '智慧眼鏡' },
  medal1:    { emoji: '🏅', slot: 'neck', rarity: 'legendary', unlockAt: 40, label: '勛章' },
  necklace1: { emoji: '💎', slot: 'neck', rarity: 'legendary', unlockAt: 40, label: '鑽石項鍊' },
  glasses4:  { emoji: '🎭', slot: 'face', rarity: 'legendary', unlockAt: 40, label: '派對眼鏡' },
  flower1:   { emoji: '🌸', slot: 'head', rarity: 'common',    unlockAt: 5,  label: '花環' },
  hairclip1: { emoji: '🌺', slot: 'head', rarity: 'common',    unlockAt: 5,  label: '髮夾' },
  police1:   { emoji: '👮', slot: 'head', rarity: 'rare',      unlockAt: 20, label: '警帽' },
  lotus1:    { emoji: '🪷', slot: 'head', rarity: 'rare',      unlockAt: 20, label: '荷花髮飾' },
  dive1:     { emoji: '🤿', slot: 'face', rarity: 'rare',      unlockAt: 20, label: '潛水鏡' },
  funny1:    { emoji: '🥸', slot: 'face', rarity: 'common',    unlockAt: 5,  label: '搞笑眼鏡' },
  mask1:     { emoji: '😷', slot: 'face', rarity: 'legendary', unlockAt: 40, label: '口罩' },
  tie1:      { emoji: '👔', slot: 'neck', rarity: 'rare',      unlockAt: 20, label: '領帶' },
  pearl1:    { emoji: '📿', slot: 'neck', rarity: 'legendary', unlockAt: 40, label: '珍珠項鍊' },
  corsage1:  { emoji: '🏵️', slot: 'neck', rarity: 'rare',      unlockAt: 20, label: '胸花' },
}
// Food shown/fed per pet level index (0=初生...4=傳說)
export const LEVEL_FOODS = {
  0: { emoji: '🍼', label: '牛奶' },
  1: { emoji: '🍎', label: '蘋果' },
  2: { emoji: '🍕', label: '披薩' },
  3: { emoji: '🍱', label: '便當' },
  4: { emoji: '🎂', label: '蛋糕' },
}
// 7 unlockable pet-habitat scenes; unlockAt = cumulative earned score
export const SCENES = [
  { id: 'grassland',     label: '🌱 草地',     unlockAt: 0,   bg: 'linear-gradient(180deg,#E8F5E0,#FDF8F0)', description: '初始場景' },
  { id: 'cozy_home',     label: '🏡 溫馨小屋', unlockAt: 5,   bg: 'linear-gradient(180deg,#FFE8D0,#FDF8F0)', description: '5分解鎖' },
  { id: 'beach',         label: '🏖️ 海邊度假', unlockAt: 70,  bg: 'linear-gradient(180deg,#B8E0F5,#FFF8E8)', description: '70分解鎖' },
  { id: 'space',         label: '🚀 太空冒險', unlockAt: 120, bg: 'linear-gradient(180deg,#1A1A3E,#4A3878)',  description: '120分解鎖' },
  { id: 'flower_garden', label: '🌸 花園秘境', unlockAt: 120, bg: 'linear-gradient(180deg,#FFD8E8,#F8FFE8)', description: '120分解鎖' },
  { id: 'castle',        label: '🏰 夢幻城堡', unlockAt: 200, bg: 'linear-gradient(180deg,#E8D0FF,#FFF8F0)', description: '200分解鎖' },
  { id: 'rainbow',       label: '🌈 彩虹神殿', unlockAt: 300, bg: 'linear-gradient(135deg,#FFD0D0,#FFFFC0,#C0FFC0,#C0D0FF)', description: '300分解鎖' },
]
export const PET_LEVELS = [
  {min:0, label:'初生', acc:[],                    habitat:'🌱',habitatLabel:'空地',habitatBg:'#EFF8EE',items:[]},
  {min:5, label:'幼年', acc:['🎀'],                habitat:'🏡',habitatLabel:'小窩',habitatBg:'#FFF5E8',items:['🌸']},
  {min:15,label:'少年', acc:['🎀','🕶️'],           habitat:'🏠',habitatLabel:'小屋',habitatBg:'#E8F4FF',items:['🌸','⭐']},
  {min:30,label:'青年', acc:['🎀','🕶️','🎩'],      habitat:'🏰',habitatLabel:'城堡',habitatBg:'#F5E8FF',items:['🌸','⭐','🌈']},
  {min:50,label:'傳說', acc:['🎀','🕶️','🎩','👑'], habitat:'🌟',habitatLabel:'神殿',habitatBg:'#FFF8E0',items:['🌸','⭐','🌈','💎']},
]
export const PET_MSGS = {
  feed:['😋 吃得好飽～','🍎 謝謝你餵我！','好好吃哦！🍊'],
  play:['⚽ 玩得好開心！','再來一次！🎾','追到了！😆'],
  sleep:['😴 zzz...','好舒服...💤','晚安～🌙'],
}
export const todayKey = () => new Date().toISOString().slice(0,10)
export const calcScore = (h=[]) => h.reduce((s,x)=>x.type==='earn'?s+x.pts:s-x.pts,0)
export const calcTotalEarned = (h=[]) => h.filter(x=>x.type==='earn').reduce((s,x)=>s+x.pts,0)
export const calcWeekPts = (h=[]) => {
  const now=new Date(),mon=new Date(now)
  mon.setDate(now.getDate()-((now.getDay()+6)%7));mon.setHours(0,0,0,0)
  return h.filter(x=>x.type==='earn'&&new Date(x.ts)>=mon).reduce((s,x)=>s+x.pts,0)
}
export const isDoneToday = (h=[],taskId) => {
  const td=todayKey()
  return h.some(x=>x.type==='earn'&&x.task_id===taskId&&x.ts?.startsWith(td))
}
export const getPetLevel = (total) => {
  let lv=PET_LEVELS[0]
  for(const l of PET_LEVELS){if(total>=l.min)lv=l}
  return lv
}
export const getNextLevel = (total) => PET_LEVELS.find(l=>l.min>total)||null
// 0=Sun...6=Sat
export const isWeekend = (d=new Date()) => d.getDay()===0 || d.getDay()===6
export const isSunday = (d=new Date()) => d.getDay()===0
export const fmtTime = (ts) => {
  if(!ts)return''
  const d=new Date(ts)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
const WEEKDAY_NAMES = ['日','一','二','三','四','五','六']
export const fmtTodayLabel = () => {
  const d = new Date()
  return `今天 ${d.getMonth()+1}/${d.getDate()} 週${WEEKDAY_NAMES[d.getDay()]}`
}

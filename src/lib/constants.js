export const COLORS = ['#E8A59B','#A8C4B8','#9BB5CC','#C4B5D4','#F0C878','#B8D4A0','#D4A8C4','#8EC8C8']
export const PETS = {
  cat:{e:'🐱',n:'貓咪'}, dog:{e:'🐶',n:'狗狗'}, rabbit:{e:'🐰',n:'兔兔'},
  dino:{e:'🦕',n:'恐龍'}, duck:{e:'🐥',n:'小鴨'}, monster:{e:'👾',n:'怪獸'}
}
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
export const fmtTime = (ts) => {
  if(!ts)return''
  const d=new Date(ts)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

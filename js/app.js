
const $=s=>document.querySelector(s);
const STORAGE_KEY='essay445-v1';
const state=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"answers":{},"fav":{},"wrong":{},"status":{},"index":0}');
let view=[...BANK.keys()];
let pos=Math.min(state.index||0,Math.max(0,view.length-1));
let revealed=false;

const ALIASES={
 'rockbolt':['록볼트','락볼트'],'rock bolt':['록볼트','락볼트'],
 'shotcrete':['숏크리트','쇼트크리트'],'sandmat':['샌드매트','샌드매트공법','부사'],
 'sand mat':['샌드매트','샌드매트공법','부사'],'wellpoint':['웰포인트'],
 'well point':['웰포인트'],'deepwell':['딥웰'],'deep well':['딥웰'],
 'pulling':['풀링'],'pushing':['푸싱'],'rcd':['역순환공법','알씨디'],
 'muck':['버력','먹'],'heaving':['히빙'],'boiling':['보일링','퀵샌드'],
 'quick sand':['보일링','퀵샌드'],'forepoling':['훠폴링','포어폴링'],
 'fore poling':['훠폴링','포어폴링'],'pipe roof':['파이프루프'],
 'mass curve':['토적곡선','매스커브'],'seal coat':['실코트'],
 'overlay':['오버레이'],'over lay':['오버레이'],'spalling':['스폴링']
};
const aliasEntries=Object.entries(ALIASES).sort((a,b)=>b[0].length-a[0].length);

function save(){state.index=pos;localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function norm(s){
 let x=(s||'').normalize('NFKC').toLowerCase();
 for(const [en,kos] of aliasEntries){
   const canon=kos[0];
   x=x.split(en).join(canon);
   for(const ko of kos)x=x.split(ko).join(canon);
 }
 return x.replace(/[^0-9a-z가-힣]/g,'');
}
function similarity(a,b){
 if(a===b)return 1;
 const m=a.length,n=b.length;
 if(!m||!n)return 0;
 const d=Array.from({length:m+1},(_,i)=>[i]);
 for(let j=1;j<=n;j++)d[0][j]=j;
 for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
   d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
 return 1-d[m][n]/Math.max(m,n);
}
function keywords(s){
 return [...new Set((s.match(/[가-힣]{2,}|[a-zA-Z]{2,}|[0-9.]+/g)||[])
   .map(norm).filter(x=>x.length>=2 && !['방법','공법','종류','가지','대한','의한','하는','있다','된다'].includes(x)))];
}
function assess(user,candidates){
 const u=norm(user);
 if(!u)return {score:0,matched:[],missing:keywords(candidates[0]||'')};
 for(const ans of candidates){
   const a=norm(ans);
   if(u===a||u.includes(a)||(a.includes(u)&&u.length>=3)||similarity(u,a)>=.88)
     return {score:1,matched:keywords(ans),missing:[]};
 }
 let best={score:0,matched:[],missing:[]};
 for(const ans of candidates){
   const ks=keywords(ans);
   const matched=ks.filter(k=>u.includes(k)||similarity(u,k)>=.82);
   const ratio=ks.length?matched.length/ks.length:0;
   const score=ratio>=.8?1:ratio>=.55?.75:ratio>=.3?.5:ratio>0?.25:0;
   if(score>best.score)best={score,matched,missing:ks.filter(k=>!matched.includes(k))};
 }
 return best;
}
function current(){return BANK[view[pos]]}
function qkey(q){return String(q.id)}

function render(){
 const q=current(),key=qkey(q);
 revealed=false;
 $('#number').textContent=q.number;
 $('#label').textContent=q.label;
 $('#frequency').textContent='★'.repeat(Math.min(5,q.frequency))+(q.frequency>1?` (${q.frequency}회)`:'');
 $('#question').textContent=q.question;
 $('#answers').innerHTML='';
 const saved=state.answers[key]||[];
 q.inputLabels.forEach((label,i)=>{
   const wrap=document.createElement('div');wrap.className='answer-item';
   const lab=document.createElement('label');lab.className='answer-label';lab.textContent=label||`${i+1}.`;
   const ta=document.createElement('textarea');ta.className='answer-input';ta.value=saved[i]||'';
   ta.placeholder='답을 입력하세요';
   ta.addEventListener('input',()=>{
     state.answers[key]=[...document.querySelectorAll('.answer-input')].map(x=>x.value);
     save();
   });
   wrap.append(lab,ta);$('#answers').append(wrap);
 });
 $('#fav').textContent=state.fav[key]?'★ 즐겨찾기':'☆ 즐겨찾기';
 $('#result').className='result';$('#result').innerHTML='';
 $('#official').className='official';$('#officialContent').innerHTML='';
 document.querySelectorAll('.status-row button').forEach(b=>b.classList.remove('active'));
 const st=state.status[key];
 if(st)$('#mark'+st[0].toUpperCase()+st.slice(1))?.classList.add('active');
 $('#progress').textContent=`${pos+1} / ${view.length}`;
 $('#score').textContent=`전체 445문항`;
 $('#wrongCount').textContent=`오답 ${Object.keys(state.wrong).length}`;
 save();
 window.scrollTo({top:0,behavior:'instant'});
}
function showOfficial(){
 const q=current();
 const box=$('#officialContent');box.innerHTML='';
 q.allAnswers.forEach((group,i)=>{
   const div=document.createElement('div');div.className='official-group';
   const label=q.mode==='grouped'?(q.inputLabels[i]||`${i+1}.`):`${i+1}.`;
   const b=document.createElement('b');b.textContent=label+' ';
   const span=document.createElement('span');span.textContent=group.join(' / ');
   div.append(b,span);box.append(div);
 });
 $('#official').classList.add('show');
}
$('#check').addEventListener('click',()=>{
 const q=current(),key=qkey(q);
 const vals=[...document.querySelectorAll('.answer-input')].map(x=>x.value);
 let total=0,html=[];
 vals.forEach((v,i)=>{
   const r=assess(v,q.answerGroups[i]||[]);
   total+=r.score;
   const cls=r.score===1?'correct':r.score>0?'partial':'wrong';
   const name=r.score===1?'정답':r.score>0?'부분정답':'오답';
   html.push(`<div class="${cls}">${i+1}. ${name} (${Math.round(r.score*100)}%)</div>`);
 });
 const pct=Math.round(total/Math.max(1,vals.length)*100);
 state.wrong[key]=pct<100;
 if(pct===100)delete state.wrong[key];
 $('#result').innerHTML=`<b>채점 결과: ${pct}점</b><br>${html.join('')}`;
 $('#result').classList.add('show');
 save();renderStatsOnly();
});
function renderStatsOnly(){
 $('#wrongCount').textContent=`오답 ${Object.keys(state.wrong).length}`;
}
$('#reveal').addEventListener('click',()=>{showOfficial();revealed=true});
$('#fav').addEventListener('click',()=>{const k=qkey(current());state.fav[k]=!state.fav[k];if(!state.fav[k])delete state.fav[k];save();render()});
$('#prev').addEventListener('click',()=>{if(pos>0){pos--;render()}});
$('#next').addEventListener('click',()=>{if(pos<view.length-1){pos++;render()}});
function setStatus(name){
 const k=qkey(current());state.status[k]=name;save();render();
}
$('#markMastered').onclick=()=>setStatus('mastered');
$('#markUncertain').onclick=()=>setStatus('uncertain');
$('#markUnmastered').onclick=()=>setStatus('unmastered');
$('#manageToggle').onclick=()=>$('#managePanel').classList.toggle('open');

function applyView(){
 const mode=$('#mode').value;
 const term=norm($('#search').value);
 view=BANK.map((q,i)=>({q,i})).filter(({q})=>{
   const k=qkey(q);
   if(mode==='wrong'&&!state.wrong[k])return false;
   if(mode==='fav'&&!state.fav[k])return false;
   if(['mastered','uncertain','unmastered'].includes(mode)&&state.status[k]!==mode)return false;
   if(term&&!norm(`${q.number} ${q.label} ${q.question}`).includes(term))return false;
   return true;
 }).map(x=>x.i);
 if(!view.length){alert('조건에 맞는 문제가 없습니다.');view=[...BANK.keys()]}
 pos=0;render();
}
$('#mode').onchange=applyView;
$('#search').oninput=applyView;
$('#shuffle').onclick=()=>{for(let i=view.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[view[i],view[j]]=[view[j],view[i]]}pos=0;render()};
$('#reset').onclick=()=>{if(confirm('답안, 오답, 즐겨찾기, 숙지 기록을 모두 초기화할까요?')){localStorage.removeItem(STORAGE_KEY);location.reload()}};

render();

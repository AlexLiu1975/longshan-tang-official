export function randomDigit(){return Math.floor(Math.random()*8)+1}
export function buildCode(h,t,o){return `${h}${t}${o}`}
export function lookupHexagram(data,code){return data?.[code]??null}
export function validateDivinationData(data){
  if(!data||typeof data!=="object"||Object.keys(data).length!==512)return false;
  for(let a=1;a<=8;a+=1){
    for(let b=1;b<=8;b+=1){
      for(let c=1;c<=8;c+=1){
        const code=`${a}${b}${c}`;
        const item=data[code];
        if(!item||typeof item.name!=="string"||!item.name.trim()||typeof item.text!=="string"||!item.text.trim())return false;
      }
    }
  }
  return true;
}

if(typeof document!=="undefined"){
  const state={hundreds:null,tens:null,ones:null,isDrawing:false,data:null};
  const places=["hundreds","tens","ones"];
  const labels={hundreds:"第一支",tens:"第二支",ones:"第三支"};
  const buttons=Object.fromEntries(places.map(p=>[p,document.querySelector(`#draw-${p}`)]));
  const reset=document.querySelector("#reset-divination");
  const codeEl=document.querySelector("#hexagram-code");
  const result=document.querySelector("#hexagram-result");
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  async function load(){
    try{
      const r=await fetch('/data/divination.json',{cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      if(!validateDivinationData(data))throw new Error('divination data is incomplete or invalid');
      state.data=data;
      buttons.hundreds.disabled=false;
    }catch(e){
      result.hidden=false;
      result.innerHTML='<h2>卦辭資料暫時無法載入</h2><p>資料尚未完整，請稍後再試。</p>';
      console.error(e);
    }
  }

  async function draw(place){
    if(state.isDrawing||state[place]!==null)return;
    const i=places.indexOf(place);
    if(i>0&&state[places[i-1]]===null)return;
    state.isDrawing=true;
    Object.values(buttons).forEach(b=>b.disabled=true);
    const card=document.querySelector(`[data-place="${place}"]`);
    const cylinder=card.querySelector('.cylinder');
    const stick=card.querySelector('.drawn-stick');
    const status=card.querySelector('.draw-status');
    status.textContent='誠心抽籤中…';
    cylinder.classList.add('is-shaking');
    await sleep(1200);
    cylinder.classList.remove('is-shaking');
    const n=randomDigit();
    state[place]=n;
    stick.textContent=n;
    stick.classList.add('is-revealed');
    status.textContent=`${labels[place]}：${n}`;
    await sleep(600);
    state.isDrawing=false;
    if(i<2){buttons[places[i+1]].disabled=false}else{reveal()}
  }

  async function reveal(){
    const code=buildCode(state.hundreds,state.tens,state.ones);
    codeEl.textContent=code;
    document.querySelector('.code-card').hidden=false;
    await sleep(450);
    const hit=lookupHexagram(state.data,code);
    result.hidden=false;
    if(hit){
      result.innerHTML=`<h2>${hit.name}・${code}</h2><p class="result-text">${hit.text}</p>`;
    }else{
      result.innerHTML=`<h2>${code}</h2><p>此卦資料尚待校對，請重新占卦或稍後再試。</p>`;
      console.error('Missing divination code:',code);
    }
    reset.hidden=false;
  }

  function resetAll(){
    places.forEach(p=>{
      state[p]=null;
      const card=document.querySelector(`[data-place="${p}"]`);
      card.querySelector('.drawn-stick').classList.remove('is-revealed');
      card.querySelector('.drawn-stick').textContent='';
      card.querySelector('.draw-status').textContent='';
    });
    codeEl.textContent='';
    document.querySelector('.code-card').hidden=true;
    result.hidden=true;
    result.innerHTML='';
    reset.hidden=true;
    buttons.hundreds.disabled=!state.data;
    buttons.tens.disabled=true;
    buttons.ones.disabled=true;
  }

  places.forEach(p=>buttons[p]?.addEventListener('click',()=>draw(p)));
  reset?.addEventListener('click',resetAll);
  Object.values(buttons).forEach(b=>{if(b)b.disabled=true});
  load();
}

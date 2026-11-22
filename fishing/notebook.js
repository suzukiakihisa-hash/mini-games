'use strict';
globalThis.FishingNotebookUI={
  metres(value){return Math.round(value*10)/10;},
  fieldNotes:{
    1:{title:'魚がいる深さ「タナ」',fact:'魚が泳ぐ深さを「タナ」というよ。',tryNext:'ウキから えさまでの長さを変えると、べつの深さをさぐれるよ。'},
    2:{title:'ウキが教える「アタリ」',fact:'魚がえさをくわえた合図を「アタリ」というよ。',tryNext:'ウキがしずむときのほかに、横に動くこともあるよ。'},
    4:{title:'走る魚と 糸のはり',fact:'魚が走ったら巻く手を休めて、さおで糸のはりを保つよ。',tryNext:'さおは持ったまま。引きが弱まったら、また巻いて魚をよせよう。'}
  },
  showDiscovery(value,title,message,diagram){
    const page=value.phase==='AfterCatch'&&this.fieldNotes[value.latestFieldNote];
    diagram.hidden=!page;
    if(!page)return false;
    const label='手帳に発見！ '+page.title;
    const description=value.latestFieldNote===1?`えさを ${this.metres(value.latestNoteDepth)} m にしたら、食いついた！`:
      value.latestFieldNote===2?'ウキがしずんでから、合わせられたね。':'強く引かれたとき、巻く手を休められたね。';
    if(diagram.dataset.page!==String(value.latestFieldNote))diagram.dataset.page=String(value.latestFieldNote);
    if(title.textContent!==label)title.textContent=label;
    if(message.textContent!==description)message.textContent=description;
    return true;
  },
  renderFieldNotes(value,ui){
    const mask=value.fieldNotes||0;
    const pages=[2,1,4].filter(bit=>mask&bit);
    ui.notesCount.textContent=pages.length?`釣ってあつめた ${pages.length} / 3 ページ`:'釣った魚を記録すると、この手帳に発見がふえるよ。';
    if(ui.notesList.dataset.mask===String(mask))return;
    const entries=pages.map(bit=>{
      const page=this.fieldNotes[bit],row=document.createElement('li');
      const title=document.createElement('strong'),tip=document.createElement('span');
      title.textContent=page.title;
      tip.textContent=page.fact+' '+page.tryNext;
      row.replaceChildren(title,tip);
      return row;
    });
    ui.notesList.replaceChildren(...entries);
    ui.notesList.dataset.mask=String(mask);
  },
  fishNotes:[
    '尾に近い体の横に、かたい「ぜいご」があるよ。図の金色のところを見つけてみよう。',
    'マアジは群れで泳ぐ魚。ゲームでも魚影を見つけ、えさの深さを合わせてみよう。',
    '持ち帰る魚は大人と保冷して家へ。料理も大人と一緒に。必要な分だけ持ち帰る選び方を大切にしよう。'
  ],
  daceNotes:[
    'ウグイの背びれは、体のまんなかにひとつあるよ。',
    '川の流れがゆるむところや湖で、泳ぐ群れをさがそう。',
    '地域によっては塩焼きや甘露煮にする魚だよ。持ち帰りと料理は大人と一緒に。'
  ],
  showFishPart(id,ui){if(id<0||id>2)return;ui.fishPartButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===id)));ui.fishNote.textContent=(this.selectedNotes||(ui.fishNote.dataset.species==='ウグイ'?this.daceNotes:this.fishNotes))[id];ui.fishScutes.classList.toggle('dim',id!==0);},
  lessonStatus(read,tried,id){return (tried&(1<<id))&&id<3?'つりで試した':(read&(1<<id))?'見た':'これから';},
  render(value,ui){
    const regions=value.regions||[],lessons=value.lessons||[];
    const species=value.bookSpecies||'マアジ',dace=species==='ウグイ';
    if(ui.fishNote.dataset.species!==species){
      ui.fishNote.dataset.species=species;
      const fish=FishingOutfit.entry(value.bookId,value);
      this.selectedNotes=fish?[fish.fact, FishingOutfit.habitat(fish,regions),fish.food]:null;
      ui.fishPartButtons[0].textContent=fish?.mark||(dace?'背びれ':'ぜいご');
      ui.fishPartButtons[1].textContent=fish?'すむ水辺':'群れ';
      ui.fishDiagram.hidden=species!=='マアジ';ui.daceDiagram.hidden=!dace;
      ui.fishTitle.textContent=species+' · わたしの魚ずかん';
      this.showFishPart(0,ui);
    }
    this.renderFieldNotes(value,ui);
    ui.memory.textContent=value.catchReady?'この魚をどうするか決めると、ずかんとコインに残るよ。':value.landed?`自分で釣った魚：${value.landed}匹 · 最大 ${value.best.toFixed(1)} cm\nさいきんの1匹：${value.lastFish||'記録に残っているよ'}`:'まだ釣っていないよ。最初の1匹を、ずかんの思い出にしよう。';
    const count=mask=>[0,1,2].filter(i=>(mask||0)&(1<<i)).length;
    ui.discoveries.textContent=`旅の思い出 ${regions.filter(r=>(value.visitedMask||0)&(1<<r.id)).length}/${regions.length}の水辺 · つりで試したこと ${count(value.triedMask)}/3`;
    ui.memories.disabled=!!value.catchReady||!(value.memories?.length);
    const memoryKey=JSON.stringify(value.memories||[]);if(ui.memories.dataset.key!==memoryKey){ui.memories.replaceChildren(...(value.memories||[]).map(memory=>{const option=document.createElement('option');option.value=memory.id;option.textContent=memory.title;return option;}));ui.memories.dataset.key=memoryKey;}ui.memories.value=value.selectedCatchId||'';
    const discovery=this.fieldNotes[value.selectedFieldNote];
    ui.story.textContent=value.catchStory?(value.catchTitle?value.catchTitle+'\n':'')+value.catchStory+(discovery?'\nこの魚で見つけたこと：'+discovery.title:''):'この1匹の地点・深さ・操作は、これからの釣果に残るよ。';
    const area=value.region||0;ui.spots.textContent=(value.pointLabels||[]).map((name,i)=>{const at=area*3+i,n=value.pointCounts?.[at]||0;return name+(value.pointMarks?.[i]?'（'+value.pointMarks[i]+'）':'')+'：'+n+'匹'+(value.pointBest?.[at]?' · 最大 '+value.pointBest[at].toFixed(1)+' cm':'')+((value.observationMask||0)&(1<<at)?' · タナの観察あり':'')+(value.pointStyles?.[i]?'\n  '+value.pointStyles[i]:'');}).join('\n');
    ui.fish.textContent=value.fishInfo||'';ui.gear.textContent=value.gearInfo||'';
    const current=regions.find(r=>r.id===value.region);
    ui.current.textContent=current?`${current.name} · ${current.reference}`:'';
    ui.message.textContent=value.travelMessage||'';
    ui.source.hidden=!current;if(current)ui.source.href=current.url;
    ui.regionButtons.forEach((button,i)=>{
      const r=regions[i],locked=i===5&&!value.boatPass||i===6&&!value.abroad;
      button.disabled=!r||!value.canTravel||value.region===i||locked;
      button.setAttribute('aria-pressed',String(value.region===i));
      const action=value.region===i?'いまここ':locked?(i===5?'3種・2か所':'相模湾で1匹'):value.canTravel?'行く ›':'';
      button.textContent=r?.name||'';button.dataset.action=action;
      const featured=['コノシロ','シロギス','クロダイ','オイカワ','ワカサギ','カツオ','シイラ'];
      if(r&&FishingOutfit.catalog.length){
        const destination=document.createElement('span'),special=document.createElement('small');
        destination.textContent=r.name;special.textContent=featured[i];destination.append(special);button.replaceChildren(destination);
      }
      const label=r?r.name+' · '+(value.region===i?'いまここ':locked?action:'ここへ行く'):'';
      button.setAttribute('aria-label',label);
      ui.markers[i].disabled=button.disabled;ui.markers[i].setAttribute('aria-label',label);
      ui.markers[i].classList.toggle('selected',value.region===i);
    });
    ui.lessonButtons.forEach((button,i)=>{
      const lesson=lessons[i];button.textContent=lesson?`${lesson.title} · ${this.lessonStatus(value.readMask,value.triedMask,i)}${i<3&&(value.selectedPractice&(1<<i))?' ／ この魚で':''}`:'';
      button.setAttribute('aria-pressed',String(value.selectedLesson===i));
    });
    const chosen=lessons[value.selectedLesson||0];ui.lessonTitle.textContent=chosen?.title||'';ui.lessonText.textContent=chosen?.text||'';
    ui.totals.textContent=regions.map((r,i)=>`${r.name}：${value.regionCounts?.[i]||0}匹${value.regionBest?.[i]?` · 最大 ${value.regionBest[i].toFixed(1)} cm`:''}`).join('\n');
  }
};

globalThis.FishingOutfit={
  catalog:[],outings:[],spotNames:[],costs:[],viewKey:'',listKey:'',current:null,
  seasons:['春','夏','秋','冬'],hours:['朝','昼','夕方'],
  rods:['はじめの磯竿 · 6m','遠投の万能竿 · 9m','大物用の船竿 · 12m'],
  baits:[['アミエビ・ウキサビキ','イソメ・ちょい投げ','小魚ルアー'],['ミミズ・ウキ','紅サシ','スプーンルアー'],['オキアミ・コマセ','イワシ・泳がせ','メタルジグ']],
  shop:[
    [16,'砂地のキス針','イソメでシロギスをねらいやすい。横須賀の砂地へ。'],
    [32,'湖の小針','紅サシでワカサギをねらいやすい。冬の丹沢湖へ。'],
    [1,'遠投の万能竿','投げられる長さ 6 → 9 m。市原のクロダイや丹沢湖のニジマスへ。'],
    [8,'ルアーセット','港の小魚ルアー、川・湖のスプーン、船のジグが使える。'],
    [4,'力もちリール','いつもの速さで巻くと、魚をよせる速さが24％アップ。'],
    [2,'大物用の船竿','投げられる長さ 12 m。ジグとそろえるとキハダの釣行へ。']
  ],
  price(mask,purchases=0){
    let sum=0; const missing=mask&~purchases;
    for(let slot=0;slot<6;slot++)if(missing&(1<<slot)){
      if(!Number.isFinite(this.costs[slot]))return Infinity;
      sum+=this.costs[slot];
    }
    return sum;
  },
  entry(id,v){if(v?.catalog?.length)this.catalog=v.catalog;return this.catalog.find(f=>f.id===id);},
  habitat(f,regions){return (regions||[]).filter(r=>f.areas&(1<<r.id)).map(r=>r.name).join('・');},
  options(select,options,selected,available){
    select.replaceChildren(...options.map((label,index)=>{
      const o=document.createElement('option');o.value=String(index);o.textContent=label+(available(index)?'':'（お店で入手）');o.disabled=!available(index);return o;
    }));select.value=String(selected);
  },
  connect($,send){
    for(const key of ['rod','bait','season','time'])$('outfit-'+key).addEventListener('change',e=>send(key+':'+e.target.value));
    $('shop-items').addEventListener('click',e=>{const button=e.target.closest('button[data-buy]');if(button&&!button.disabled)send('buy:'+button.dataset.buy);});
    $('tuna-target').addEventListener('click',()=>send('tuna:'+(this.current?.tunaTarget?'0':'1')));
  },
  render(v,$){
    this.current=v;
    if(v.outings?.length)this.outings=v.outings;
    if(v.allSpots?.length)this.spotNames=v.allSpots;
    if(v.gearCosts?.length)this.costs=v.gearCosts;
    this.entry(v.speciesId,v);
    const key=[v.region,v.landed,v.coins,v.purchases,v.gearRod,v.bait,v.season,v.dayTime,v.tunaTarget,v.boatPass,v.abroad,v.canTravel,v.readOnly,v.gearMessage,v.goal,v.foundMask,v.observationMask,v.plan,v.cookedMask,this.catalog.length,this.costs.length].join('|');
    if(key===this.viewKey)return;this.viewKey=key;
    this.renderOutings(v,$);
    const own=(item)=>!!((v.purchases||0)&item), always=()=>true;
    const sea=v.region>=5?2:v.region>=3?1:0;
    this.options($('outfit-rod'),this.rods,v.gearRod||0,i=>i===0||own(i===1?1:2));
    const baits=this.baits[sea].slice();
    if(v.region===1&&own(16))baits[1]='イソメ・砂地のキス針';
    if(v.region===4&&own(32))baits[1]='紅サシ・湖の小針';
    this.options($('outfit-bait'),baits,v.bait||0,i=>i!==2||own(8));
    this.options($('outfit-season'),this.seasons,v.season??1,always);
    this.options($('outfit-time'),this.hours,v.dayTime??0,always);
    for(const key of ['rod','bait','season','time'])$('outfit-'+key).disabled=!v.canTravel||v.readOnly;
    $('wallet').textContent=(v.coins||0)+' コイン';
    $('outfit-status').textContent=v.gearMessage||'';
    $('kit-targets').textContent=v.targets?'この日の群れ　'+v.targets:'このえさに合う魚は おやすみ。えさをかえてみよう。';
    $('kit-goal').textContent=v.goal||'';
    $('map-goal').textContent='いつかキハダマグロを釣ろう。'+(v.goal||'');
    $('map-fish').textContent='この水辺の魚　'+this.catalog.filter(f=>f.areas&(1<<(v.region||0))).map(f=>f.name).join('・');
    const goal=$('tuna-target');goal.hidden=!v.tunaReady;goal.disabled=!v.canTravel;goal.setAttribute('aria-pressed',String(!!v.tunaTarget));goal.textContent=v.tunaTarget?'キハダをねらい中 · やめる':'マグロをねらう';
    $('shop-items').replaceChildren(...this.shop.map(([item,name,benefit])=>{
      const row=document.createElement('div'),title=document.createElement('strong'),tip=document.createElement('small'),buy=document.createElement('button');
      const price=this.price(item);
      row.className='shop-row';title.textContent=name;tip.textContent=benefit;buy.dataset.buy=String(item);buy.type='button';
      buy.disabled=!v.canTravel||v.readOnly||own(item)||(v.coins||0)<price||(item===2&&!v.boatPass);
      buy.textContent=own(item)?'持っている':Number.isFinite(price)?(item===2&&!v.boatPass?'きっぷと ':'')+price+'枚':'準備中';buy.setAttribute('aria-label',name+' '+buy.textContent);
      row.append(title,tip,buy);return row;
    }));
    const counts=v.speciesCounts||[],best=v.speciesBest||[],libraryKey=counts.join(',')+'|'+best.join(',')+'|'+v.cookedMask+'|'+this.catalog.length;
    if(libraryKey!==this.listKey){
      this.listKey=libraryKey;$('species-total').textContent='魚ずかん　'+counts.filter(n=>n>0).length+' / '+this.catalog.length+' 種';
      const sorted=this.catalog.slice().sort((a,b)=>Number(!!counts[b.id-1])-Number(!!counts[a.id-1]));
      $('species-list').replaceChildren(...sorted.map(f=>{
        const card=document.createElement('details'),heading=document.createElement('summary'),p=document.createElement('p'),locations=this.habitat(f,v.regions);
        const count=counts[f.id-1]||0;card.className='species-row';card.dataset.known=String(!!count);const record=best[f.id-1]||0;
        heading.textContent=f.name+(count?'　自己ベスト '+record.toFixed(1)+' cm':'　まだ見ぬ魚');
        if(record>=f.master)heading.textContent+=' ★ヌシ級';
        const region=(v.regions||[]).find(r=>f.areas&(1<<r.id)),water=region?.id>=5?2:region?.id>=3?1:0;
        const tryBait=f.id===15?'大物ルアー便のジグ（ルアーセット）':this.baits[water].filter((_,i)=>f.baits&(1<<i)).join('・');
        p.textContent=(count?('最大 '+(best[f.id-1]||0).toFixed(1)+' cm　'+f.fact+' '+f.food+' '):'')+'ねらう水辺　'+locations+'。さおは「'+this.rods[f.rod].split(' · ')[0]+'」から。えさの例　'+tryBait+'。';
        const trophy=document.createElement('small');
        trophy.textContent=(count?count+'匹 · ':'')+'ヌシ級 '+(f.master||f.max)+' cm';
        card.append(heading,trophy,p);return card;
      }));
      const meals=this.catalog.filter(f=>v.cookedMask&(1<<(f.id-1))).map(f=>{
        const li=document.createElement('li');li.textContent=f.dish+'　·　'+f.name;return li;
      });
      if(!meals.length){const li=document.createElement('li');li.textContent='持ち帰った魚が、家族の一皿になるよ。';meals.push(li);}
      $('meals').replaceChildren(...meals);
    }
  },
  renderOutings(v,$){
    const season=this.seasons,time=this.hours;
    const count=v.speciesCounts||[],coins=v.coins||0;
    const price=o=>this.price(o.item,v.purchases||0);
    const open=o=>o.area===6?!!v.abroad:o.area===5?!!v.boatPass:true;
    const affordable=o=>open(o)&&coins>=price(o);
    const fresh=o=>!count[o.fish-1];
    const priority=o=>{
      if(o.fish===14&&v.boatPass&&fresh(o))return -10;
      if(v.boatPass&&o.fish===15&&affordable(o)&&fresh(o))return -9;
      return (open(o)?0:30)+(fresh(o)?0:15)+(affordable(o)?0:6)+(o.item===16||o.item===32?0:o.item?2:3);
    };
    const list=this.outings.slice().sort((a,b)=>priority(a)-priority(b));
    const cards=list.map(o=>{
      const f=this.entry(o.fish,v),button=document.createElement('button'),title=document.createElement('strong'),line=document.createElement('span'),action=document.createElement('small');
      button.type='button';button.dataset.outing=String(o.fish);
      title.textContent=(f?.name||'魚')+'をねらう';
      line.textContent=o.place+' · '+season[o.season]+'の'+time[o.time];
      const cost=price(o);
      action.textContent=!open(o)?(o.area===6?'相模湾で1匹釣ると 出発':'魚3種・水辺2か所で 出航'):cost?o.outfit+'　'+cost+'枚で買って出発':o.outfit+'で 出発';
      if(open(o)&&!Number.isFinite(cost))action.textContent='道具を確認中';
      else if(open(o)&&cost>coins)action.textContent+='（あと'+(cost-coins)+'枚）';
      button.disabled=!v.canTravel||v.readOnly||!affordable(o);
      const portrait=document.createElement('i');portrait.className='outing-fish';portrait.setAttribute('aria-hidden','true');
      portrait.setAttribute('style','background-position:0 -'+((o.fish-1)*35)+'px');
      button.append(portrait,title,line,action);return button;
    });
    $('outing-picks').replaceChildren(...cards.slice(0,2));$('other-outings').replaceChildren(...cards.slice(2));
    $('outing-balance').textContent='おさいふ　'+coins+' 枚';
    const current=this.entry(v.plan,v);
    $('outing-weather').textContent=current?'ねらいは '+current.name+' · '+season[v.season]+'の'+time[v.dayTime]:'この水辺のつり旅　'+season[v.season??1]+'の'+time[v.dayTime||0];
    const spots=[];
    for(let i=0;i<this.spotNames.length;i++)if(v.foundMask&(1<<i)){
      const b=document.createElement('button');b.type='button';b.dataset.spot=String(i);b.disabled=!v.canTravel||v.readOnly;
      b.textContent=(v.regions?.[Math.floor(i/3)]?.name||'')+' · '+this.spotNames[i]+((v.observationMask||0)&(1<<i)?' · タナを覚えた':'');spots.push(b);
    }
    $('spot-book').hidden=!spots.length;$('visited-spots').replaceChildren(...spots);
  }
};

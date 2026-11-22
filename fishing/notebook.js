'use strict';
globalThis.FishingNotebookUI={
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
    const description=value.latestFieldNote===1?`えさを ${value.latestNoteDepth} m にしたら、食いついた！`:
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
    const area=value.region||0;ui.spots.textContent=(value.pointLabels||[]).map((name,i)=>{const at=area*3+i,n=value.pointCounts?.[at]||0;return name+(value.pointMarks?.[i]?'（'+value.pointMarks[i]+'）':'')+'：'+n+'匹'+(value.pointBest?.[at]?' · 最大 '+value.pointBest[at].toFixed(1)+' cm':'')+(value.pointStyles?.[i]?'\n  '+value.pointStyles[i]:'');}).join('\n');
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
  catalog:[],viewKey:'',listKey:'',current:null,
  rods:['はじめの磯竿 · 6m','遠投の万能竿 · 9m','大物用の船竿 · 12m'],
  baits:[['アミエビ・ウキサビキ','イソメ・ちょい投げ','小魚ルアー'],['ミミズ・ウキ','紅サシ・小針','スプーンルアー'],['オキアミ・コマセ','イワシ・泳がせ','メタルジグ']],
  shop:[[1,35,'遠投の万能竿','遠くに投げて、クロダイやニジマスも。'],[4,30,'力もちリール','ひと巻きで魚をよせる距離がのびる。'],[8,25,'ルアーセット','港の小魚ルアー、川のスプーン、船のジグ。'],[2,85,'大物用の船竿','沖のキハダに届く。船のきっぷで解禁。']],
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
    this.entry(v.speciesId,v);
    const key=[v.region,v.landed,v.coins,v.purchases,v.gearRod,v.bait,v.season,v.dayTime,v.tunaTarget,v.boatPass,v.abroad,v.canTravel,v.gearMessage,v.goal,this.catalog.length].join('|');
    if(key===this.viewKey)return;this.viewKey=key;
    const own=(item)=>!!((v.purchases||0)&item), always=()=>true;
    const sea=v.region>=5?2:v.region>=3?1:0;
    this.options($('outfit-rod'),this.rods,v.gearRod||0,i=>i===0||own(i===1?1:2));
    this.options($('outfit-bait'),this.baits[sea],v.bait||0,i=>i!==2||own(8));
    this.options($('outfit-season'),['春','夏','秋','冬'],v.season??1,always);
    this.options($('outfit-time'),['朝','昼','夕方'],v.dayTime||0,always);
    for(const key of ['rod','bait','season','time'])$('outfit-'+key).disabled=!v.canTravel||v.readOnly;
    $('wallet').textContent=(v.coins||0)+' コイン';
    $('outfit-status').textContent=v.gearMessage||'';
    $('kit-targets').textContent='この組み合わせでねらえる魚　'+(v.targets||'');
    $('kit-goal').textContent=v.goal||'';
    $('map-goal').textContent='いつかキハダマグロを釣ろう。'+(v.goal||'');
    $('map-fish').textContent='この水辺の魚　'+this.catalog.filter(f=>f.areas&(1<<(v.region||0))).map(f=>f.name).join('・');
    const goal=$('tuna-target');goal.hidden=!v.tunaReady;goal.disabled=!v.canTravel;goal.setAttribute('aria-pressed',String(!!v.tunaTarget));goal.textContent=v.tunaTarget?'キハダをねらい中 · やめる':'マグロをねらう';
    $('shop-items').replaceChildren(...this.shop.map(([item,price,name,benefit])=>{
      const row=document.createElement('div'),title=document.createElement('strong'),tip=document.createElement('small'),buy=document.createElement('button');
      row.className='shop-row';title.textContent=name;tip.textContent=benefit;buy.dataset.buy=String(item);buy.type='button';
      buy.disabled=!v.canTravel||v.readOnly||own(item)||(v.coins||0)<price||(item===2&&!v.boatPass);
      buy.textContent=own(item)?'持っている':(item===2&&!v.boatPass?'きっぷと ':'')+price+'枚';buy.setAttribute('aria-label',name+' '+buy.textContent);
      row.append(title,tip,buy);return row;
    }));
    const counts=v.speciesCounts||[],best=v.speciesBest||[],libraryKey=counts.join(',')+'|'+this.catalog.length;
    if(libraryKey!==this.listKey){
      this.listKey=libraryKey;$('species-total').textContent='魚ずかん　'+counts.filter(n=>n>0).length+' / '+this.catalog.length+' 種';
      $('species-list').replaceChildren(...this.catalog.map(f=>{
        const card=document.createElement('details'),heading=document.createElement('summary'),p=document.createElement('p'),locations=this.habitat(f,v.regions);
        const count=counts[f.id-1]||0;card.className='species-row';card.dataset.known=String(!!count);heading.textContent=f.name+(count?'　'+count+'匹':'　未発見');
        const region=(v.regions||[]).find(r=>f.areas&(1<<r.id)),water=region?.id>=5?2:region?.id>=3?1:0;
        const tryBait=this.baits[water].filter((_,i)=>f.baits&(1<<i)).join('・');
        p.textContent=(count?('最大 '+(best[f.id-1]||0).toFixed(1)+' cm　'+f.fact+' '+f.food+' '):'')+'ねらう水辺　'+locations+'。さおは「'+this.rods[f.rod].split(' · ')[0]+'」から。えさの例　'+tryBait+'。';
        card.append(heading,p);return card;
      }));
    }
  }
};

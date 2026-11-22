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
  showFishPart(id,ui){if(id<0||id>2)return;ui.fishPartButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===id)));ui.fishNote.textContent=this.fishNotes[id];ui.fishScutes.classList.toggle('dim',id!==0);},
  lessonStatus(read,tried,id){return (tried&(1<<id))&&id<3?'つりで試した':(read&(1<<id))?'見た':'これから';},
  render(value,ui){
    const regions=value.regions||[],lessons=value.lessons||[];
    this.renderFieldNotes(value,ui);
    ui.memory.textContent=value.catchReady?'いま釣れた魚は、持ち帰り・リリースを選ぶと記録に残るよ。':value.landed?`自分で釣ったマアジ：${value.landed}匹 · 最大 ${value.best.toFixed(1)} cm\nさいきんの1匹：${value.lastFish||'記録に残っているよ'}`:'まだ釣っていないよ。最初の1匹を、ずかんの思い出にしよう。';
    const count=mask=>[0,1,2].filter(i=>(mask||0)&(1<<i)).length;
    ui.discoveries.textContent=`旅の思い出 ${count(value.visitedMask)}/3の海 · つりで試したこと ${count(value.triedMask)}/3`;
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
      const r=regions[i];button.disabled=!r||!value.canTravel||value.region===i;
      button.setAttribute('aria-pressed',String(value.region===i));
      button.textContent=r?`${r.name}${value.region===i?' · いまここ':value.visitedMask&(1<<i)?' · 訪問ずみ':''}\n${r.description}`:'';
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

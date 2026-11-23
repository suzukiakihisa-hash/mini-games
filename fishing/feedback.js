'use strict';
// Presentation only. No timers, input capture, storage or engine commands.
globalThis.FishingFeedback={
  fishCue(state,practised){
    if(!state || state.phase!=='Reeling' || state.paused)return {beat:'',tip:'',demo:false};
    const beat=state.fightCue;
    const teach=state.guided && !state.autoReel && !(practised & (1<<state.lessonStep));
    const tip=!teach?'':beat==='wind'?(state.lessonStep===3?'もう一度 まこう':'いま、くるくる'):'手を とめよう';
    return {beat,tip,demo:!!teach && beat==='wind' && state.lessonStep===1};
  },
  describe(state){
    const hide={kind:'',text:'',action:'',button:'',visible:false};
    if(!state||state.paused)return hide;
    const age=Number.isFinite(state.phaseAge)?state.phaseAge:99;
    let kind='',text='',action='',button='';
    const knowsBite=!!(state.fieldNotes&2);
    if(state.phase==='Nibble' && !state.strikeReady){kind='nibble';text=knowsBite?'まだ ウキの先が 見えるよ':'ちょん… まだ まとう';action='wait';}
    else if(state.phase==='Bite'||state.phase==='Nibble'){kind='bite';text=state.phase==='Nibble'?'しずむよ！ 竿をあげて':Number.isFinite(state.phaseAge)&&age>9?'まだ くわえてるよ。タップ！':knowsBite?'しずんだ！ これがアタリ':'しずんだ！ あわせよう';action='strike';}
    else if(state.phase==='Reeling'){
      kind=state.fightCue;
      action=kind==='wind'?'reel':state.held?'ease':'rest';
      button='リール';
      if(kind==='wind')text=age<.55&&knowsBite?'アタリを 読めた！ いま、まこう':state.held?'まけているよ':'魚がこちらを向いた。いま、まこう';
      else if(kind==='danger')text=state.held?'糸が きれそう！ 回す手をとめて':'糸がゆるむまで、とめておこう';
      else text=state.held?'魚が走る。手をとめよう':'そのまま待とう';
    }
    else if(state.phase==='Landing')return {kind:'landing',text:'',action:'wait',button:'',visible:false};
    else if(state.phase==='Catch'&&age<.9){kind='caught';text='つれた！';action='decide';}
    return kind?{kind,text,action,button,visible:!!text}:hide;
  }
};

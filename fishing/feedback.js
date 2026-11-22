'use strict';
// Presentation only. No timers, input capture, storage or engine commands.
globalThis.FishingFeedback={
  describe(state){
    const hide={kind:'',text:'',action:'',button:'',visible:false};
    if(!state||state.paused)return hide;
    const age=Number.isFinite(state.phaseAge)?state.phaseAge:99;
    let kind='',text='',action='',button='';
    const knowsBite=!!(state.fieldNotes&2);
    if(state.phase==='Nibble'){kind='nibble';text=knowsBite?'まだ ウキの先が 見えるよ':'ちょん… まだ まとう';action='wait';}
    else if(state.phase==='Bite'){kind='bite';text=knowsBite?'しずんだ！ これがアタリ':'しずんだ！ あわせよう';action='strike';}
    else if(state.phase==='Reeling'){
      const direction=state.runDirection<0?'← ':state.runDirection>0?'→ ':'';
      const danger=state.lineDanger??(state.tension>.85);
      action=danger||state.pulling?(state.held?'ease':'rest'):'reel';
      button=action==='ease'?'はなそう':action==='rest'?'そのまま まつ':state.held?'そのまま まく':'おして まく';
      if(danger){kind='danger';text='糸がぴん！';}
      else if(state.pulling){kind=state.held?'run':'eased';text=direction+'魚が 走ってる';}
      else if(age<.55){kind='hook';text=knowsBite?'アタリを 読めたね！':'かかった！';}
      else if(state.reelOpening){kind='opening';text='魚が こちらを向いた！';if(!state.held)button='いま まこう';}
      else if(state.warning){kind='warning';text=direction+'走りそう';}
      else kind='calm';
    }
    else if(state.phase==='Landing')return {kind:'landing',text:'',action:'wait',button:'',visible:false};
    else if(state.phase==='Catch'&&age<.9){kind='caught';text='つれた！';action='decide';}
    return kind?{kind,text,action,button,visible:!!text}:hide;
  }
};

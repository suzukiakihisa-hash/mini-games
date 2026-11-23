'use strict';
// Presentation only. No timers, input capture, storage or engine commands.
globalThis.FishingFeedback={
  fishCue(state,signal,hasTurned){
    if(!state || state.phase!=='Reeling' || state.paused)return {beat:'',tip:'',demo:false};
    const teaching=!!state.guided;
    const danger=state.lineDanger??(state.tension>=.70);
    if(danger && state.held)return {beat:'danger',tip:teaching?'手を とめよう':'',demo:false};
    if(state.pulling || (teaching && state.lessonStep===2) || danger){
      return {beat:state.held?'pause':'slack',tip:teaching?(state.held?'手を とめよう':'糸が ゆるんだ'):'',demo:false};
    }
    if(teaching){
      if(state.held)return {beat:'',tip:'',demo:false};
      return {beat:'wind',tip:state.lessonStep===3?'こっちを向いた！ くるくる':'下で くるくる',demo:!hasTurned};
    }
    if(signal.kind==='warning')return {beat:'turn',tip:'',demo:false};
    if(state.reelOpening&&!state.held)return {beat:'wind',tip:'',demo:false};
    return {beat:'',tip:'',demo:false};
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
      const direction=state.runDirection<0?'← ':state.runDirection>0?'→ ':'';
      const danger=state.lineDanger??(state.tension>=.70);
      action=danger||state.pulling?(state.held?'ease':'rest'):'reel';
      button='リール';
      if(danger){kind='danger';text=state.held?'糸が きれそう！ 回すのを とめて':'とめられた！ ゆるむよ';}
      else if(state.guided){
        const easing=state.lessonStep===2;
        kind=easing?(state.held?'run':'eased'):'opening';
        text=easing?(state.held?'魚が 走った！ 回すのを とめて':'ゆるめられた！'):state.held?'まけてるよ！':state.lessonStep===3?'こっちを向いた！ また 回そう':'かかった！ リールを くるくる';
        action=easing?(state.held?'ease':'rest'):'reel';
      }
      else if(state.pulling){kind=state.held?'run':'eased';text=state.held?direction+'魚が 走った！ 回すのを とめて':direction+(state.runHint||'魚が 走ってる')+'。まとう';}
      else if(age<.55){kind='hook';text=knowsBite?'アタリを 読めた！':'かかった！ リールを くるくる';}
      else if(state.reelOpening){kind='opening';text='こっちを向いた！ 今 まこう';}
      else if(state.warning){kind='warning';text=direction+'走りそう。手を とめる じゅんび';}
      else {kind='calm';text=state.held?'いいよ、そのまま！':'リールを くるくる';}
    }
    else if(state.phase==='Landing')return {kind:'landing',text:'',action:'wait',button:'',visible:false};
    else if(state.phase==='Catch'&&age<.9){kind='caught';text='つれた！';action='decide';}
    return kind?{kind,text,action,button,visible:!!text}:hide;
  }
};

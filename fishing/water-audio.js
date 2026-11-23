'use strict';
// Pre-rendered original music and foley. The audio device advances the loops between Unity frames.
const FishingWaterAudio=(()=>{
  const folders='water-sounds/';
  const musicName=region=>region>=5?'offshore':region===4?'lake':region===3?'river':'harbor';
  function attach(win,doc){
    let context, state, away=false, speaking=false, primed=false, previewPending=false, previewUntil=0;
    let fallback=false, lastPhase='', gesture=0;
    const clips=new Map(), slots=new Map(), nativePlayers=new Map();
    function permitted(){return !!state?.sound && !doc.hidden && !away;}
    function stop(key){
      const slot=slots.get(key); if(!slot)return;
      slots.delete(key);
      if(slot.node){slot.node.onended=null;try{slot.node.stop();}catch{}slot.node.disconnect();}
      if(slot.level)slot.level.disconnect();
      if(slot.media){slot.media.onended=null;slot.media.pause();}
    }
    function allStop(){for(const key of [...slots.keys()])stop(key);}
    function clip(name){
      if(!clips.has(name)){
        const promise=win.fetch(folders+name+'.mp3').then(response=>{
          if(!response.ok)throw Error('Unavailable sound');
          return response.arrayBuffer();
        }).then(bytes=>context.decodeAudioData(bytes)).catch(error=>{clips.delete(name);throw error;});
        clips.set(name,promise);
      }
      return clips.get(name);
    }
    function volume(key){
      if(key==='music')return speaking ? .32 : state?.phase==='Reeling' ? .48 : .76;
      return key==='reel' ? .85 : key==='net' ? (speaking ? .26 : .96) : .92;
    }
    function setLevel(key,slot){
      const value=volume(key);
      if(slot.lastVolume===value)return;
      slot.lastVolume=value;
      if(slot.level)slot.level.gain.setTargetAtTime(value,context.currentTime,.06);
      if(slot.media)slot.media.volume=value;
    }
    function playMedia(key,slot){
      slot.blocked=false;
      slot.media.play().catch(()=>{
        if(slots.get(key)!==slot)return;
        if(slot.loop)slot.blocked=true;
        else stop(key);
      });
    }
    function native(key,slot){
      if(slots.get(key)!==slot||typeof win.Audio!=='function')return;
      let media=nativePlayers.get(key);
      if(!media){media=new win.Audio();nativePlayers.set(key,media);}
      const file=folders+slot.name+'.mp3';
      if(media.getAttribute('src')!==file)media.src=file;
      else try{media.currentTime=0;}catch{}
      slot.media=media;media.preload='auto';media.loop=slot.loop;setLevel(key,slot);
      if(key==='reel')media.playbackRate=state?.pulling ? .82 : 1;
      media.onended=()=>{if(slots.get(key)===slot)stop(key);};
      playMedia(key,slot);
    }
    function start(key,name,loop=false){
      if(!primed||!permitted())return;
      const old=slots.get(key);
      if(loop&&old?.name===name)return;
      stop(key);
      if(key==='music'&&old)clips.delete(old.name);
      const slot={name,loop}; slots.set(key,slot);
      if(!context||fallback||context.state!=='running'){native(key,slot);return;}
      clip(name).then(buffer=>{
        if(slots.get(key)!==slot||!permitted())return;
        if(context.state!=='running'){native(key,slot);return;}
        const node=context.createBufferSource(), level=context.createGain();
        slot.node=node;slot.level=level;node.buffer=buffer;node.loop=loop;
        level.gain.value=volume(key);
        if(key==='reel')node.playbackRate.value=state?.pulling ? .82 : 1;
        node.connect(level);level.connect(context.destination);
        node.onended=()=>{if(slots.get(key)===slot)stop(key);};
        node.start();
      }).catch(()=>native(key,slot));
    }
    function sync(){
      if(!permitted()||!primed){allStop();return;}
      if(state.paused || state.phase==='Intro' || state.phase==='TripEnd'){
        for(const key of [...slots.keys()])if(key!=='preview')stop(key);
        return;
      }
      const type=musicName(state.region||0);
      start('music',type,true);
      const music=slots.get('music');if(music)setLevel('music',music);
      if(state.phase==='Reeling'&&state.held){
        start('reel','reel',true);
        const reel=slots.get('reel'), speed=state.pulling ? .82 : 1;
        if(reel?.node)reel.node.playbackRate.value=speed;
        if(reel?.media)reel.media.playbackRate=speed;
      }else stop('reel');
    }
    function warm(){
      if(!context||!primed||fallback||!state?.sound)return;
      const names=state.phase==='Intro'||state.phase==='Explore'?[musicName(state.region||0),'splash']:
        ['Preparing','Aim','Casting'].includes(state.phase)?['bite','strike','reel','landed']:[];
      for(const name of names)if(!clips.has(name))clip(name).catch(()=>{});
    }
    function wake(unlocked){
      if(unlocked&&!context){context=unlocked;context.addEventListener?.('statechange',()=>{
        if(context.state==='running'){fallback=false;sync();}
      });}
      if(!primed||!context||context.state!=='running')return;
      fallback=false;warm();sync();
    }
    function activate(event){
      if(!state || !state.sound || doc.hidden)return;
      // A pointer release, tap or key is an actual play gesture. Browser interruptions can require another.
      primed=true;
      const sequence=++gesture;
      for(const [key,slot] of slots)if(slot.blocked&&slot.loop)playMedia(key,slot);
      if(context?.state==='running')wake(context);
      else if(!win.AudioContext && !win.webkitAudioContext){
        fallback=true;
        if(state?.phase==='Intro'&&event.target?.closest?.('#primary'))start('music',musicName(state.region||0),true);
        else sync();
      }
      else win.setTimeout(()=>{
        if(sequence!==gesture||context?.state==='running')return;
        fallback=true;
        for(const [key,slot] of slots)if(slot.loop&&slot.node)stop(key);
        sync();
      },400);
    }
    function speak(on){
      speaking=!!on;
      for(const key of ['music','net']){const slot=slots.get(key);if(slot)setLevel(key,slot);}
    }
    function update(value){
      const previous=lastPhase, changed=previous!==value.phase;
      state=value;lastPhase=value.phase;
      if(!permitted()){allStop();return;}
      sync();
      if(previewPending && value.sound && Date.now()<previewUntil){
        previewPending=false;start('preview','bite');
      }else if(!value.paused)previewPending=false;
      if(value.paused||!primed)return;
      if(changed){
        warm();
        if(value.phase==='Waiting'&&previous==='Casting')start('impact','splash');
        if(value.phase==='Bite')start('bite','bite');
        if(value.phase==='Reeling')start('strike','strike');
        if(value.phase==='Landing')start('net','landed');
      }
    }
    function preview(){
      // The Unity acknowledgement follows this genuine button click; don't sound a toggle-off.
      if(state && !state.sound){previewPending=true;previewUntil=Date.now()+1200;}
    }
    function leave(){away=true;previewPending=false;allStop();}
    function back(){away=false;if(context?.state==='running'||fallback)sync();}
    for(const event of ['pointerup','touchend','click','keydown'])win.addEventListener(event,activate,{capture:true,passive:true});
    win.addEventListener('blur',leave);win.addEventListener('pagehide',leave);
    win.addEventListener('focus',back);win.addEventListener('pageshow',back);
    doc.addEventListener('visibilitychange',()=>doc.hidden?leave():back());
    return {wake,speak,update,preview};
  }
  return {attach};
})();

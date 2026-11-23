'use strict';
// Pre-rendered original music and foley. The audio device advances the loops between Unity frames.
const FishingWaterAudio=(()=>{
  const url=name=>'water-sounds/'+name+'.mp3?v=062';
  // Brief silent PCM for arming reusable media elements inside the actual input event.
  const silence='data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQQAAAAAAAAA';
  const musicName=region=>region>=5?'offshore':region===4?'lake':region===3?'river':'harbor';
  function attach(win,doc){
    let context, state, away=false, speaking=false, primed=false, previewPending=false, previewUntil=0;
    let fallback=false, lastPhase='', output, lastEase=-Infinity;
    const clips=new Map(), slots=new Map(), nativePlayers=new Map();
    const authorizedMedia=new WeakSet(),pendingMedia=new WeakSet();
    const nativeGroup=key=>['music','reel','strain'].includes(key)?key:'effect';
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
        const promise=win.fetch(url(name)).then(response=>{
          if(!response.ok)throw Error('Unavailable sound');
          return response.arrayBuffer();
        }).then(bytes=>context.decodeAudioData(bytes)).catch(error=>{clips.delete(name);throw error;});
        clips.set(name,promise);
      }
      return clips.get(name);
    }
    function volume(key){
      if(key==='music')return speaking ? .50 : state?.phase==='Reeling' ? .54 : .98;
      if(key==='net')return speaking ? .56 : .98;
      return key==='strain' ? .84 : key==='reel' ? .96 : .94;
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
      const group=nativeGroup(key);
      const media=nativePlayers.get(group)||new win.Audio();
      nativePlayers.set(group,media);
      for(const [other,playing] of slots)if(other!==key&&playing.media===media)stop(other);
      const file=url(slot.name);
      if(media.getAttribute('src')!==file)media.src=file;
      else try{media.currentTime=0;}catch{}
      slot.media=media;slot.lastVolume=null;media.preload='auto';media.loop=slot.loop;setLevel(key,slot);
      if(key==='reel')media.playbackRate=state?.pulling ? .82 : 1;
      media.onended=()=>{if(!slot.loop&&media.ended&&slots.get(key)===slot)stop(key);};
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
        node.connect(level);level.connect(output||context.destination);
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
      if(state.phase==='Reeling'&&state.held&&(state.lineDanger||state.tension>=.74||state.pulling&&state.tension>=.56))
        start('strain','strain',true);
      else stop('strain');
    }
    function warm(){
      if(!primed||!state?.sound)return;
      const names=state.phase==='Intro'||state.phase==='Explore'?[musicName(state.region||0),'splash']:
        ['Preparing','Aim','Casting'].includes(state.phase)?['splash','bite','strike','reel','ease','strain','landed']:[];
      if(!context||fallback){
        for(const key of ['reel','strain']){
          const media=nativePlayers.get(key);
          if(names.includes(key)&&media&&!slots.has(key)&&media.getAttribute('src')!==url(key)){
            media.src=url(key);media.preload='auto';media.load?.();
          }
        }
        return;
      }
      for(const name of names)if(!clips.has(name))clip(name).catch(()=>{});
    }
    function ready(){
      if(context?.state!=='running')return;
      if(fallback)for(const [key,slot] of [...slots])if(slot.loop&&slot.media)stop(key);
      fallback=false;warm();sync();
    }
    function primeMedia(){
      if(typeof win.Audio!=='function')return;
      for(const group of ['music','reel','strain','effect']){
        const media=nativePlayers.get(group)||new win.Audio();
        nativePlayers.set(group,media);
        if(authorizedMedia.has(media)||pendingMedia.has(media))continue;
        const inUse=[...slots.values()].some(slot=>slot.media===media);
        if(!inUse){media.preload='auto';media.src=silence;}
        // Changing src on the same authorized element also works when Web Audio is interrupted.
        try{
          pendingMedia.add(media);
          media.play().then(()=>authorizedMedia.add(media),()=>{}).finally(()=>pendingMedia.delete(media));
        }catch{pendingMedia.delete(media);}
      }
    }
    function useMedia(){
      if(context?.state==='running'){ready();return;}
      fallback=true;
      for(const [key,slot] of [...slots])if(slot.node)stop(key);
      sync();
    }
    function activate(event){
      const enabling=event.target?.closest?.('#sound') && state?.sound===false;
      if(doc.hidden||(state?.sound===false&&!enabling)||event.isTrusted===false)return;
      primed=true;
      const Audio=win.AudioContext||win.webkitAudioContext;
      if(!context&&Audio)try{
        context=new Audio({latencyHint:'interactive'});
        if(context.createDynamicsCompressor){
          output=context.createDynamicsCompressor();output.threshold.value=-7;output.knee.value=5;
          output.ratio.value=5;output.attack.value=.004;output.release.value=.16;
          output.connect(context.destination);
        }
        context.addEventListener?.('statechange',()=>{
          if(context.state==='running')ready();
          else if(primed&&permitted())useMedia();
        });
      }catch{}
      if(context?.state==='running')ready();
      else{
        primeMedia();
        if(context)try{
          // Call resume synchronously in this gesture, before fetching or waiting on a promise.
          context.resume().then(ready,useMedia);
        }catch{useMedia();}
        useMedia();
      }
      for(const [key,slot] of slots)if(slot.blocked&&slot.loop)playMedia(key,slot);
    }
    function speak(on){
      speaking=!!on;
      for(const key of ['music','net']){const slot=slots.get(key);if(slot)setLevel(key,slot);}
    }
    function update(value){
      const previous=lastPhase, changed=previous!==value.phase, wasWinding=state?.held && !state.paused && state.sound;
      state=value;lastPhase=value.phase;
      if(!permitted()){allStop();return;}
      sync();
      if(previewPending && value.sound && Date.now()<previewUntil){
        previewPending=false;start('preview','bite');
      }else if(!value.paused)previewPending=false;
      if(value.paused||!primed)return;
      const now=Date.now();
      if(previous==='Reeling'&&value.phase==='Reeling'&&wasWinding&&!value.held&&now-lastEase>230){
        lastEase=now;start('ease','ease');
      }
      if(changed){
        warm();
        if(previous==='Casting'&&['Waiting','Nibble','Bite'].includes(value.phase))start('impact','splash');
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
    function back(){
      away=false;
      if(!primed||!permitted())return;
      if(context?.state==='running')ready();
      else if(context)context.resume().then(ready,useMedia);
      else sync();
    }
    for(const event of ['pointerup','touchend','click','keydown'])win.addEventListener(event,activate,{capture:true,passive:true});
    win.addEventListener('blur',leave);win.addEventListener('pagehide',leave);
    win.addEventListener('focus',back);win.addEventListener('pageshow',back);
    doc.addEventListener('visibilitychange',()=>doc.hidden?leave():back());
    return {audioContext:()=>context,speak,update,preview};
  }
  return {attach};
})();

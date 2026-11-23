'use strict';
const FishingGuideVoice=(()=>{
  function cueFor(value,hint){
    if(!value.sound||value.paused)return '';
    switch(value.phase){
      case 'Preparing':
        if(hint.includes('「浅いところ」'))return 'depth-shallow';
        if(hint.includes('「中ほど」'))return 'depth-middle';
        if(hint.includes('「深いところ」'))return 'depth-deep';
        return 'depth-choice';
      case 'Aim':return 'aim';
      case 'Miss':
        if(hint.startsWith('えさが浅すぎ'))return 'miss-shallow';
        if(hint.startsWith('えさが深すぎ'))return 'miss-deep';
        if(hint.startsWith('まだ早い'))return 'miss-early';
        if(hint.startsWith('アタリを逃した'))return 'miss-late';
        if(hint.startsWith('魚影から遠かった'))return 'miss-aim';
        if(hint.startsWith('糸が切れた'))return 'miss-strain';
        if(hint.startsWith('糸が緩み続けた'))return 'miss-slack';
        return '';
      // The little cheer starts as the fish is secured and can finish over the measurement.
      case 'Landing':return value.phaseAge>=.75?'landed':'';
      case 'Measuring':return 'landed';
      case 'Catch':return value.catchReady&&(value.firstSpecies??value.landed===0)&&(!value.species||value.species==='マアジ')?'fish-maaji':'landed';
      case 'AfterCatch':
        if(value.lastDecision)return '';
        if(value.latestFieldNote===1)return 'note-depth';
        if(value.latestFieldNote===2)return 'note-bite';
        if(value.latestFieldNote===4)return 'note-run';
        return hint.startsWith('深さを合わせ')?'lesson':'resume';
      default:return '';
    }
  }

  function attach(win,doc,showVoice,onAudioReady=()=>{}){
    const AudioContext=win.AudioContext||win.webkitAudioContext;
    const clips=new Map();
    let context,request,source,media,activated=false,nativeFallback=false;
    function load(cue){
      if(!clips.has(cue)){
        const clip=win.fetch('guide-voice/'+cue+'.wav')
          .then(response=>{
            if(!response.ok)throw new Error('Guide voice unavailable');
            return response.arrayBuffer();
          })
          .then(bytes=>context.decodeAudioData(bytes))
          .catch(error=>{clips.delete(cue);throw error;});
        clips.set(cue,clip);
      }
      return clips.get(cue);
    }
    function playMedia(current){
      if(request!==current||doc.hidden||typeof win.Audio!=='function')return;
      if(!media)media=new win.Audio();
      media.src='guide-voice/'+current.cue+'.wav';
      media.onended=()=>{if(request===current)showVoice('');};
      media.play().then(()=>{if(request===current&&!media.paused)showVoice(current.cue);})
        .catch(()=>{if(request===current)current.started=false;});
    }
    function play(){
      if(!request||request.started||doc.hidden||!activated)return;
      if(context?.state!=='running'){
        if(nativeFallback){request.started=true;playMedia(request);}
        return;
      }
      const current=request;
      current.started=true;
      load(current.cue).then(buffer=>{
        if(request!==current||doc.hidden)return;
        if(context.state!=='running'){current.started=false;return;}
        const node=context.createBufferSource();
        node.buffer=buffer;
        node.connect(context.destination);
        node.onended=()=>{
          node.disconnect();
          if(source===node){source=null;showVoice('');}
        };
        node.start();
        source=node;
        showVoice(current.cue);
      }).catch(()=>playMedia(current));
    }
    function setCue(cue){
      if(cue===(request?.cue||''))return;
      request=cue?{cue,started:false}:null;
      if(source){source.stop();source=null;showVoice('');}
      if(media){media.pause();media.onended=null;showVoice('');}
      play();
    }
    function unlock(){
      if(doc.hidden)return;
      activated=true;
      if(!AudioContext){nativeFallback=true;play();return;}
      try{
        if(!context){context=new AudioContext();onAudioReady(context);}
        const ready=()=>{nativeFallback=false;onAudioReady(context);play();};
        if(context.state==='running')ready();
        else context.resume().then(ready).catch(()=>{nativeFallback=true;play();});
      }catch{nativeFallback=true;play();}
    }
    for(const event of ['pointerup','touchend','click','keydown'])win.addEventListener(event,unlock,{capture:true,passive:true});
    for(const event of ['blur','pagehide'])win.addEventListener(event,()=>setCue(''));
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden)setCue('');});
    return {setCue};
  }
  return {attach,cueFor};
})();


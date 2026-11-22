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
        if(value.latestFieldNote===1)return 'note-depth';
        if(value.latestFieldNote===2)return 'note-bite';
        if(value.latestFieldNote===4)return 'note-run';
        return hint.startsWith('深さを合わせ')?'lesson':'resume';
      default:return '';
    }
  }

  function attach(win,doc,showVoice){
    const AudioContext=win.AudioContext||win.webkitAudioContext;
    const clips=new Map();
    let context,request,source;
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
    function play(){
      if(!request||request.started||context?.state!=='running'||doc.hidden)return;
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
      }).catch(()=>{ /* Advice remains readable if the clip cannot play. */ });
    }
    function setCue(cue){
      if(cue===(request?.cue||''))return;
      request=cue?{cue,started:false}:null;
      if(source){source.stop();source=null;showVoice('');}
      play();
    }
    function unlock(){
      if(!AudioContext||doc.hidden)return;
      try{
        context??=new AudioContext();
        if(context.state==='running')play();
        else context.resume().then(play).catch(()=>{});
      }catch{ /* Audio activation may be unavailable. */ }
    }
    for(const event of ['pointerup','click','keydown'])win.addEventListener(event,unlock,{capture:true,passive:true});
    for(const event of ['blur','pagehide'])win.addEventListener(event,()=>setCue(''));
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden)setCue('');});
    return {setCue};
  }
  return {attach,cueFor};
})();


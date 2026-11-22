'use strict';
// Original plucked melody, ratchet and landing jingle, synthesized on the guide's audio clock.
const FishingWaterAudio=(()=>{
  const phrases=[
    [62,69,71,0,69,64,0,0,66,69,64,0,62,0,0,0],
    [67,71,74,0,71,69,0,0,67,62,64,0,62,0,0,0],
    [65,69,72,0,67,0,65,0,62,65,69,0,67,0,0,0]
  ];
  const frequency=note=>440*2**((note-69)/12);
  function attach(win,doc){
    let ctx,master,music,mechanism,celebration,timer,state=null,lastPhase='',voice=false,away=false;
    let note=0,nextNote=0,nextClick=0,lastRegion=-1,winding=false;
    const active=new Map();
    function bus(){
      const gain=ctx.createGain(); gain.connect(master); return gain;
    }
    function tone(channel,start,hz,endHz,duration,gain,type){
      const oscillator=ctx.createOscillator(), envelope=ctx.createGain();
      oscillator.type=type; oscillator.frequency.setValueAtTime(hz,start);
      oscillator.frequency.exponentialRampToValueAtTime(endHz,start+duration);
      envelope.gain.setValueAtTime(.0001,start);
      envelope.gain.exponentialRampToValueAtTime(gain,start+Math.min(.009,duration*.25));
      envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
      oscillator.connect(envelope);envelope.connect(channel);active.set(oscillator,channel);
      oscillator.onended=()=>{active.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
      oscillator.start(start);oscillator.stop(start+duration+.012);
    }
    function hush(channel){
      for(const [osc,bus] of active)if(!channel||bus===channel){try{osc.stop();}catch{}}
    }
    function stop(){
      if(timer!==undefined){win.clearInterval(timer);timer=undefined;}
      hush();winding=false;nextNote=nextClick=0;
    }
    function playable(){return ctx?.state==='running' && state?.sound && !state.paused && !doc.hidden && !away;}
    function tick(){
      if(!playable()){stop();return;}
      const now=ctx.currentTime,horizon=now+.13,region=state.region||0;
      const quiet=region===4,offshore=region>=5;
      if(lastRegion!==region){note=0;nextNote=now;lastRegion=region;}
      if(nextNote<now-.1)nextNote=now;
      const interval=quiet ? .56 : offshore ? .36 : .43;
      const melody=phrases[quiet?1:offshore?2:0];
      // Leave space during the little bite and the landing flourish.
      const background=['Explore','Preparing','Aim','Waiting','AfterCatch'].includes(state.phase);
      while(nextNote<=horizon){
        const pitch=melody[note%melody.length];
        if(background&&pitch){
          tone(music,nextNote,frequency(pitch),frequency(pitch),quiet ? .47 : .34,.14,'triangle');
          if(note%8===0)tone(music,nextNote,frequency(pitch-12),frequency(pitch-12),.54,.12,'sine');
        }
        nextNote+=interval;note=(note+1)%melody.length;
      }
      const reel=state.phase==='Reeling'&&state.held;
      if(reel){
        if(!winding||nextClick<now-.08)nextClick=now;
        while(nextClick<=horizon){
          tone(mechanism,nextClick,1130,270,.041,.23,'triangle');
          tone(mechanism,nextClick+.014,190,88,.041,.11,'sine');
          nextClick+=state.pulling ? .19 : .105;
        }
      }else if(winding)hush(mechanism);
      winding=reel;
    }
    function wake(context){
      if(!context)return;
      if(!ctx){
        ctx=context;master=ctx.createGain();master.gain.value=.76;master.connect(ctx.destination);
        music=bus();mechanism=bus();celebration=bus();
        music.gain.value=voice ? .34 : .70;mechanism.gain.value=.88;celebration.gain.value=.73;
      }
      if(playable()&&timer===undefined){tick();timer=win.setInterval(tick,80);}
    }
    function speak(on){
      voice=on;
      if(ctx)music.gain.setTargetAtTime(on ? .32 : .70,ctx.currentTime,.07);
    }
    function update(value){
      const changed=lastPhase!==value.phase;
      state=value;lastPhase=value.phase;
      if(!playable()){stop();return;}
      wake(ctx);
      if(changed&&value.phase==='Bite'){
        tone(mechanism,ctx.currentTime,600,320,.13,.24,'sine');
      }else if(changed&&value.phase==='Landing'){
        const now=ctx.currentTime;
        const pitches=value.firstSpecies||value.newBest?[67,71,74,79,78,79]:[67,71,74,79];
        pitches.forEach((pitch,i)=>tone(celebration,now+i*.13,frequency(pitch),frequency(pitch),i===pitches.length-1 ? .49 : .20,.36,'triangle'));
        tone(celebration,now,frequency(55),frequency(55),.5,.18,'sine');
      }
      if(!value.held&&winding){hush(mechanism);winding=false;}
    }
    function leave(){away=true;stop();}
    function back(){away=false;wake(ctx);}
    win.addEventListener('blur',leave);win.addEventListener('pagehide',leave);
    win.addEventListener('focus',back);win.addEventListener('pageshow',back);
    doc.addEventListener('visibilitychange',()=>doc.hidden?leave():back());
    return {wake,speak,update};
  }
  return {attach};
})();

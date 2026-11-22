'use strict';
globalThis.FishingControls = {
  attach(engine, ui, env) {
    const {document,window}=env; let started=false,background=!!document.hidden,menu=false,active=null,state=null,originX=0,lastRod=0,movePointer=null;const moveKeys=new Set();
    let moveTarget=null,moveOrigin=null,lastMove='';
    const listeners=[]; const on=(target,name,fn)=>{target.addEventListener(name,fn);listeners.push(()=>target.removeEventListener(name,fn));};
    const send=(method,value)=>engine.SendMessage('FishingMobileGame',method,value);
    function stampReel(event){
      if(!['Bite','Reeling'].includes(state?.phase)||!Number.isFinite(event?.timeStamp)||!window.performance?.now)return;
      const age=(window.performance.now()-event.timeStamp)/1000;
      if(age>=0&&age<60)send('ReelInputDelay',String(age));
    }
    const locked=()=>background||menu||!state||state.paused;
    function rod(value){if(!Number.isFinite(value))return;value=Math.max(-1,Math.min(1,value));if(Math.abs(value-lastRod)<.02)return;lastRod=value;ui.primary.style?.setProperty('--rod',String(value));send('RodInput',String(value));}
    function stopMove(){if(movePointer===null&&moveKeys.size===0)return;const id=movePointer,target=moveTarget;movePointer=null;moveTarget=moveOrigin=null;moveKeys.clear();if(typeof id==='number'&&target?.hasPointerCapture?.(id))target.releasePointerCapture(id);lastMove='';send('MoveInput','0,0');}
    let pressTarget=null;
    function release(event){
      clearCastTap();stopMove();
      if(active!==null){
        const id=active,target=pressTarget;
        active=null;pressTarget=null;stampReel(event);send('PrimaryUp');
        if(typeof id==='number'&&target?.hasPointerCapture?.(id))target.releasePointerCapture(id);
      }
      lastRod=0;ui.primary.style?.setProperty('--rod','0');ui.primary.classList.remove('pressed');
    }
    const resting=()=>state?.phase==='Reeling'&&FishingFeedback.describe(state).action==='rest';
    function sync(){if(!state)return;if(resting())ui.primary.setAttribute('aria-disabled','true');else ui.primary.removeAttribute('aria-disabled');ui.primary.disabled=locked()||!!state.walking||(state.manualWalking&&state.phase==='Explore'&&!state.canPrepare)||['Casting','Waiting','Nibble','Landing','Measuring','Catch'].includes(state.phase);}
    function bindRodSurface(target){
      on(target,'pointerdown',event=>{
        if(target===ui.canvas&&!['Bite','Reeling'].includes(state?.phase))return;
        if(!started||locked()||ui.primary.disabled||resting()||active!==null||movePointer!==null||moveKeys.size>0||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
        event.preventDefault();active=event.pointerId;pressTarget=target;originX=event.clientX;lastRod=0;
        target.setPointerCapture?.(active);ui.primary.classList.add('pressed');stampReel(event);send('PrimaryDown');
      });
      on(target,'pointermove',event=>{
        if(pressTarget!==target||event.pointerId!==active||state?.phase!=='Reeling'||locked())return;
        event.preventDefault();rod((event.clientX-originX)/90);
      });
      for(const name of ['pointerup','pointercancel','lostpointercapture'])on(target,name,event=>{
        if(pressTarget===target&&event.pointerId===active)release(event);
      });
    }
    bindRodSurface(ui.primary);
    bindRodSurface(ui.canvas);
    on(ui.primary,'click',event=>{
      if(!state||background||menu)return;
      if(!started){started=true;send('StartGame');return;}
      // Keyboard/assistive activation: Space key holds; a synthesized click performs one tap.
      if(event.detail===0&&state.phase!=='Reeling'&&!ui.primary.disabled){send('PrimaryDown');send('PrimaryUp');}
    });
    on(ui.primary,'keydown',event=>{if(event.code==='Space'&&!event.repeat&&active===null&&started&&!locked()&&!ui.primary.disabled&&!resting()){event.preventDefault();active='keyboard';stampReel(event);send('PrimaryDown');}});
    on(ui.primary,'keyup',event=>{if(event.code==='Space'&&active==='keyboard'){event.preventDefault();release(event);}});
    on(ui.primary,'keydown',event=>{if(active==='keyboard'&&state?.phase==='Reeling'&&['ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();rod(event.code==='ArrowLeft'?-1:1);}});
    on(ui.primary,'keyup',event=>{if(active==='keyboard'&&['ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();rod(0);}});
    // Only a short, uninterrupted tap which started on the water view can cast.
    let castTap=null;
    const recentSchool=[];
    function rememberSchool(value){
      if(value.phase!=='Aim'||value.paused){recentSchool.length=0;return;}
      if(ui.castTarget?.hidden!==false||!Number.isFinite(value.castTargetX)||!Number.isFinite(value.castTargetY))return;
      recentSchool.push({x:value.castTargetX,y:value.castTargetY,at:Date.now()});
      if(recentSchool.length>6)recentSchool.shift();
    }
    function tappedSchoolMark(event){
      if(!recentSchool.length)return false;
      const r=ui.canvas.getBoundingClientRect(),now=Date.now();
      const half=Math.max(84,Math.min(116,r.width*.25))*.5;
      return recentSchool.some(p=>{
        const x=event.clientX-r.left-p.x*r.width,y=event.clientY-r.top-p.y*r.height;
        return now-p.at<=420&&Math.abs(x)<=half+10&&y>=-58&&y<=30;
      });
    }
    function clearCastTap(){castTap=null;}
    function bindCastSurface(target, onSchool){
      on(target,'pointerdown',event=>{
        if(!started||locked()||state.phase!=='Aim'||event.isPrimary===false||
            (event.pointerType==='mouse'&&event.button!==0))return;
        castTap={surface:target,id:event.pointerId,x:event.clientX,y:event.clientY,school:onSchool||tappedSchoolMark(event)};
        // Keep ownership of a tap while the projected shoal moves underneath the finger.
        if(onSchool)target.setPointerCapture?.(event.pointerId);
      });
      on(target,'pointermove',event=>{
        if(castTap?.id===event.pointerId&&Math.hypot(event.clientX-castTap.x,event.clientY-castTap.y)>14)clearCastTap();
      });
      for(const name of ['pointercancel','lostpointercapture','pointerleave'])on(target,name,event=>{
        if(castTap?.surface!==target||castTap.id!==event.pointerId)return;
        if(name==='pointerleave'&&onSchool&&target.hasPointerCapture?.(event.pointerId))return;
        clearCastTap();
      });
      on(target,'pointerup',event=>{
        const tap=castTap;
        if(!tap||tap.surface!==target||tap.id!==event.pointerId)return;
        clearCastTap();
        if(locked()||state.phase!=='Aim'||Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>14)return;
        if(tap.school){send('CastAtSchool');return;}
        const rect=ui.canvas.getBoundingClientRect();send('CastAt',`${(event.clientX-rect.left)/rect.width},${1-(event.clientY-rect.top)/rect.height}`);
      });
    }
    bindCastSurface(ui.canvas,false);
    if(ui.castTarget){
      bindCastSurface(ui.castTarget,true);
      on(ui.castTarget,'click',event=>{
        if(event.detail===0&&started&&!locked()&&state.phase==='Aim')send('CastAtSchool');
      });
    }
    function page(index){ui.tabs?.forEach((b,j)=>b.setAttribute('aria-selected',String(index===j)));ui.pages?.forEach((p,j)=>p.hidden=index!==j);ui.drawer.scrollTop=0;}
    on(ui.menu,'click',()=>{if(!started||background)return;release();menu=!menu;ui.drawer.hidden=!menu;const catchBook=menu&&['Catch','AfterCatch','TripEnd'].includes(state?.phase)&&!!state?.selectedCatchId;if(catchBook)page(1);else if(menu&&state?.phase==='Explore'&&state?.manualWalking)page(2);send(menu?(catchBook?'OpenCatchBook':'OpenMenu'):'CloseMenu');ui.menu.setAttribute('aria-expanded',String(menu));sync();});
    on(ui.sound,'click',()=>send('ToggleSound'));
    on(ui.retrieve,'click',()=>{if(!background){menu=false;ui.drawer.hidden=true;ui.menu.setAttribute('aria-expanded','false');send('CloseMenu');send('Retrieve');sync();}});
    on(ui.export,'click',()=>send('ExportSave'));
    if(ui.walk)on(ui.walk,'click',()=>{if(!state||background||['Intro','Measuring','Catch','TripEnd'].includes(state.phase))return;release();menu=false;ui.drawer.hidden=true;ui.menu.setAttribute('aria-expanded','false');send('CloseMenu');send('BackToWalk');sync();});
    if(ui.exploreAgain)on(ui.exploreAgain,'click',()=>{if(locked()||!['Preparing','Aim','Miss','AfterCatch'].includes(state.phase))return;release();send('BackToWalk');sync();});
    if(ui.help)on(ui.help,'click',()=>{if(!locked()&&state.phase==='Preparing')send('DepthHelp');});
    if(ui.castDepth)on(ui.castDepth,'change',()=>{
      const depth=ui.castDepth.value;
      if(!locked()&&state.phase==='Aim'&&(state.fieldNotes&1)&&['2','4','6'].includes(depth))
        send('SelectDepth',depth);
    });
    if(ui.returnHome)on(ui.returnHome,'click',()=>{if(!locked()&&state.phase==='AfterCatch'&&state.canFinish)send('FinishTrip');});
    if(ui.finish)on(ui.finish,'click',()=>{if(background||!state?.canFinish)return;if(menu){release();menu=false;ui.drawer.hidden=true;ui.menu.setAttribute('aria-expanded','false');send('CloseMenu');send('FinishTrip');sync();}else if(!locked())send('FinishTrip');});
    for(const [index,button] of (ui.depths||[]).entries())on(button,'click',()=>{if(!locked()&&state.phase==='Preparing')send('SelectDepth',String(2+index*2));});
    if(ui.outfit)on(ui.outfit,'click',()=>{if(locked()||state.phase!=='Preparing')return;release();menu=true;ui.drawer.hidden=false;page(3);ui.menu.setAttribute('aria-expanded','true');send('OpenMenu');sync();});
    for(const decision of ['keep','release','sell'])if(ui[decision])on(ui[decision],'click',()=>{if(!locked()&&state.catchReady)send('Decide',decision);});
    for(const [i,tab] of (ui.tabs||[]).entries())on(tab,'click',()=>{if(!menu||background)return;page(i);});
    for(const [i,button] of (ui.lessonButtons||[]).entries())on(button,'click',()=>{if(menu&&!background)send('ReadLesson',String(i));});
    function travel(index){
      if(!menu||background||!state?.canTravel||state.region===index)return;
      release();menu=false;ui.drawer.hidden=true;ui.menu.setAttribute('aria-expanded','false');
      send('CloseMenu');send('TravelTo',String(index));ui.menu.focus?.({preventScroll:true});sync();
    }
    for(const buttons of [ui.regionButtons||[],ui.markers||[]])
      buttons.forEach((button,index)=>on(button,'click',()=>travel(index)));
    for(const [i,button] of (ui.fishPartButtons||[]).entries())on(button,'click',()=>{if(menu&&!background)FishingNotebookUI.showFishPart(i,ui);});
    if(ui.memories)on(ui.memories,'change',()=>{if(menu&&!background&&!state?.catchReady)send('ReadCatch',ui.memories.value);});
    function movement(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;const n=Math.hypot(x,y);if(n<.01)x=y=0;else if(n>1){x/=n;y/=n;}const value=x.toFixed(3)+','+y.toFixed(3);if(value!==lastMove){lastMove=value;send('MoveInput',value);}}
    // Freeze the projected boy position for this press: camera easing must not steer a stationary finger.
    function moveAt(event){
      if(!moveOrigin||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
      let x=event.clientX-moveOrigin.x,y=moveOrigin.y-event.clientY;
      const speed=Math.min(1,Math.max(0,(Math.hypot(x,y)-22)/68));
      const basis=moveOrigin.axes;
      if(basis&&basis.x*basis.w-basis.y*basis.z>.00001){
        // Aim along the painted path on the tilted ground, including at the
        // edges of a tall screen. Preserve the original screen-space push strength.
        const dx=x/moveOrigin.width,dy=y/moveOrigin.height;
        x=basis.w*dx-basis.z*dy;
        y=basis.x*dy-basis.y*dx;
      }
      const length=Math.hypot(x,y);
      movement(length?x/length*speed:0,length?y/length*speed:0);
    }
    {
      for(const target of [ui.canvas]){
        on(target,'pointerdown',event=>{if(!started||locked()||state?.phase!=='Explore'||active!==null||movePointer!==null||moveKeys.size>0||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0)||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;const r=target.getBoundingClientRect();if(r.width<=0||r.height<=0)return;event.preventDefault();movePointer=event.pointerId;moveTarget=target;const x=Number.isFinite(state.walkX)?Math.max(0,Math.min(1,state.walkX)):.46,y=Number.isFinite(state.walkY)?Math.max(0,Math.min(1,state.walkY)):.62;moveOrigin={x:r.left+r.width*x,y:r.top+r.height*y,width:r.width,height:r.height,axes:state.walkAxes};target.setPointerCapture?.(movePointer);moveAt(event);});
        on(target,'pointermove',event=>{if(target!==moveTarget||event.pointerId!==movePointer||locked())return;event.preventDefault();moveAt(event);});
        for(const name of ['pointerup','pointercancel','lostpointercapture'])on(target,name,event=>{if(target===moveTarget&&event.pointerId===movePointer)stopMove();});
      }
      const directionKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
      function keys(){movement((moveKeys.has('KeyD')||moveKeys.has('ArrowRight')?1:0)-(moveKeys.has('KeyA')||moveKeys.has('ArrowLeft')?1:0),(moveKeys.has('KeyW')||moveKeys.has('ArrowUp')?1:0)-(moveKeys.has('KeyS')||moveKeys.has('ArrowDown')?1:0));}
      on(window,'keydown',event=>{if(locked()||state?.phase!=='Explore'||movePointer!==null||event.altKey||event.ctrlKey||event.metaKey||event.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)||!directionKeys.includes(event.code))return;event.preventDefault();if(moveKeys.has(event.code))return;moveKeys.add(event.code);keys();});
      on(window,'keyup',event=>{if(!moveKeys.delete(event.code))return;if(moveKeys.size)keys();else movement(0,0);});
    }
    const suspend=()=>{release();background=true;send('Suspend');sync();};
    const resume=()=>{if(document.hidden)return;background=false;send('Resume');sync();};
    on(document,'visibilitychange',()=>document.hidden?suspend():resume());
    on(window,'blur',suspend);on(window,'pagehide',suspend);on(window,'focus',resume);on(window,'pageshow',resume);
    on(window,'resize',release);on(window,'orientationchange',release);
    return {release,update(value){state=value;rememberSchool(value);if(state.phase!=='Aim'||state.paused)clearCastTap();if(state.phase!=='Intro')started=true;if(state.phase!=='Explore'||state.paused)stopMove();if(state.phase!=='Reeling'&&active!==null)release();sync();},dispose(){release();listeners.forEach(fn=>fn());}};
  }
};

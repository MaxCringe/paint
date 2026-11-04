// Static vector thumbnails describe composition/layout. They allocate no canvas,
// WebGLRenderer, geometry or material. Actual GPU previews live in comparison scene.
export function compositionThumbnail(id){
 id=({'original:tree':'crown','original:lava':'lava','original:smoldering':'smolder'})[id]??id;
 const flame=(x,y,s=1,blue=false)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 0C-13-8-7-19-2-31C1-17 7-25 6-38C20-16 17-7 0 0Z" fill="${blue?'#45b7ff':'#ff9637'}"/><path transform="translate(${x} ${y}) scale(${s*.6})" d="M0 0C-7-8-1-14 3-25C7-13 12-6 0 0Z" fill="${blue?'#d4f6ff':'#ffe5a2'}"/>`;
 const puff=(x,y,s=1,dark=false)=>`<ellipse cx="${x}" cy="${y}" rx="${11*s}" ry="${8*s}" fill="${dark?'#62616b':'#adb0b8'}" opacity=".55"/>`;
 let content='';
 if(id==='trunk'||id==='crown'){content='<path d="M40 48V10M40 30L19 20M40 25L64 10M40 35L62 29" stroke="#967559" stroke-width="6" fill="none"/>';content+=id==='trunk'?[13,25,39].map((y,i)=>flame(43,y,.4+i*.04)).join(''):[flame(20,23,.52),flame(39,14,.4),flame(62,16,.55),flame(60,33,.4)].join('');}
 else if(id==='campfire'||id==='inferno'){content=puff(44,11,1.4,true)+[flame(23,47,.65),flame(42,48,id==='inferno'?1.15:.95),flame(59,48,.7) ].join('')+'<path d="M15 48L63 44M25 43L66 49" stroke="#786253" stroke-width="4"/>'+(id==='inferno'?'<path d="M10 13L12 17M65 7L67 12M60 30L62 34" stroke="#ffe4a8" stroke-width="2"/>':'');}
 else if(id==='smolder')content='<path d="M18 46V34L55 31L62 46Z" fill="#625044"/><path d="M23 39L49 34M35 45L55 40" stroke="#ff7434" stroke-width="3"/>'+puff(42,24)+puff(46,12,.8);
 else if(id==='lava')content=[flame(20,46,.42),flame(36,46,.5),flame(53,46,.38),flame(68,46,.45)].join('');
 else if(id==='sparkStream')content=Array.from({length:12},(_,i)=>`<circle cx="${30+(i%4)*7}" cy="${7+Math.floor(i/4)*12}" r="1.7" fill="#ffce7d"/>`).join('');
 else if(['thinSmoke','lightSmoke','darkSmoke','lowSmoke'].includes(id))content=[puff(35,id==='lowSmoke'?39:36,1,id==='darkSmoke'),puff(43,id==='lowSmoke'?35:24,id==='thinSmoke'?.6:1.2,id==='darkSmoke'),puff(38,id==='lowSmoke'?40:11,id==='thinSmoke'?.4:1.4,id==='darkSmoke')].join('');
 else content=flame(40,48,1,id==='magic');
 return `<svg viewBox="0 0 80 54" aria-hidden="true" focusable="false">${content}</svg>`;
}

// Self-contained game-over panel. Run state and saved records stay in game.js.
export function createGameOver({onRetry,onMainMenu,onRevive=()=>{}}){
 const root=document.getElementById('game-over');
 const distance=document.getElementById('game-over-distance');
 const souls=document.getElementById('game-over-souls');
 const metresCard=document.getElementById('game-over-metres-card');
 const soulsCard=document.getElementById('game-over-souls-card');
 const revive=document.getElementById('game-over-revive');
 const retry=document.getElementById('game-over-retry');
 const mainMenu=document.getElementById('game-over-menu');
 revive.addEventListener('click',()=>{if(!revive.disabled)onRevive()});
 retry.addEventListener('click',onRetry);
 mainMenu.addEventListener('click',onMainMenu);

 function show({metres=0,collectedSouls=0,records={},canRevive=false}={}){
  distance.textContent=Math.max(0,Math.floor(metres))+' м';
  souls.textContent=String(Math.max(0,Math.floor(collectedSouls)));
  // Reuse exactly the in-run achievement flags; the first-ever run cannot glow.
  metresCard.classList.toggle('new-record',Boolean(records.metres));
  soulsCard.classList.toggle('new-record',Boolean(records.souls));
  revive.disabled=!canRevive;
  revive.classList.toggle('hidden',!canRevive);
  root.classList.remove('hidden');
  retry.focus({preventScroll:true});
 }
 function hide(){
  root.classList.add('hidden');
  revive.disabled=true;revive.classList.add('hidden');
  metresCard.classList.remove('new-record');
  soulsCard.classList.remove('new-record');
 }
 return {show,hide};
}

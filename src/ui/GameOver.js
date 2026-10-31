// Self-contained game-over panel. Run state and saved records stay in game.js.
export function createGameOver({onRetry,onMainMenu}){
 const root=document.getElementById('game-over');
 const distance=document.getElementById('game-over-distance');
 const souls=document.getElementById('game-over-souls');
 const retry=document.getElementById('game-over-retry');
 const mainMenu=document.getElementById('game-over-menu');
 retry.addEventListener('click',onRetry);
 mainMenu.addEventListener('click',onMainMenu);

 function show({metres=0,collectedSouls=0}={}){
  distance.textContent=Math.max(0,Math.floor(metres))+' м';
  souls.textContent=String(Math.max(0,Math.floor(collectedSouls)));
  root.classList.remove('hidden');
  retry.focus({preventScroll:true});
 }
 function hide(){root.classList.add('hidden');}
 return {show,hide};
}

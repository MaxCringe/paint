// Animation slots for the optional Fiona 3D dev run.
// These are cosmetic clips only; gameplay state still owns timing and collisions.
export const FIONA_ANIMATION_SLOTS = Object.freeze([
 {id:'idle',label:'Ожидание',group:'Основные',loop:true},
 {id:'run',label:'Бег',group:'Основные',loop:true},
 {id:'moveLeft',label:'Перестроение влево',group:'Основные'},
 {id:'moveRight',label:'Перестроение вправо',group:'Основные'},
 {id:'jump',label:'Прыжок',group:'Основные'},
 {id:'doubleJump',label:'Двойной прыжок',group:'Основные'},
 {id:'land',label:'Приземление',group:'Основные'},
 {id:'slide',label:'Подкат под бревном',group:'Основные',loop:true},
 {id:'slideEnd',label:'Выход из подката',group:'Основные'},
 {id:'slip',label:'Скольжение на луже',group:'Основные',loop:true},
 {id:'broomStart',label:'Взлёт на метле',group:'Полёты'},
 {id:'broomFly',label:'Полёт на метле',group:'Полёты',loop:true},
 {id:'broomDuck',label:'Пригибание на метле',group:'Полёты',loop:true},
 {id:'broomLand',label:'Посадка с метлы',group:'Полёты'},
 {id:'ultimateStart',label:'Начало ульты',group:'Полёты'},
 {id:'ultimateFly',label:'Полёт во время ульты',group:'Полёты',loop:true},
 {id:'ultimateEnd',label:'Окончание ульты',group:'Полёты'},
 {id:'soulPickup',label:'Сбор души',group:'События'},
 {id:'hatPickup',label:'Подбор шляпы',group:'События'},
 {id:'scarfPickup',label:'Подбор платка',group:'События'},
 {id:'hitTree',label:'Удар о дерево',group:'События'},
 {id:'death',label:'Смерть',group:'События'},
 {id:'revive',label:'Воскрешение',group:'События'}
]);
export const FIONA_ANIMATION_SLOT_IDS = Object.freeze(FIONA_ANIMATION_SLOTS.map(slot=>slot.id));

# KNOTTY PINE — отдельные звуковые эффекты

Каждый игровой эффект — отдельный файл .ogg. Звуки не генерируются осцилляторами, поэтому вместо ретро-пищалок используются готовые звуковые записи. Заменить звук можно просто заменив файл с тем же именем; длительность/громкость/скорость воспроизведения задаются в `src/audio/sfx.js`.

Все использованные исходные записи опубликованы под **CC0 1.0 (public domain)**, коммерческое использование и публикация с исходным кодом разрешены. Указание авторства необязательно, но ниже оно сохранено.

| Файл | Событие | Исходная запись |
|---|---|---|
| `start.ogg` | Начало забега | Kenney Impact Sounds; версия heartbeat из brickstorm (обработанная CC0) |
| `move.ogg` | Смена полосы | Kenney RPG Audio — footstep00.ogg |
| `jump.ogg` | Прыжок | rubberduck, 80 CC0 RPG SFX — blade_01.ogg |
| `slide.ogg` | Подкат | Kenney RPG Audio — footstep02.ogg |
| `soul.ogg` | Сбор души | rubberduck, 80 CC0 RPG SFX — spell_01.ogg |
| `ultimate.ogg` | Ульта | Kenney Music Jingles — jingles_STEEL14.ogg |
| `slip.ogg` | Скольжение по луже | Kenney RPG Audio — footstep09.ogg |
| `hat.ogg` | Ведьмина шляпа | Kenney Interface Sounds — confirmation_001.ogg |
| `death.ogg` | Поражение | Kenney Impact Sounds — impactMetal_heavy_001.ogg |
| `step.ogg` | Тихие шаги при беге | Kenney RPG Audio — footstep06.ogg |
| `land.ogg` | Приземление | Kenney Impact Sounds — impactMining_002.ogg |

Источники и лицензии:
- https://kenney.nl/assets/rpg-audio
- https://kenney.nl/assets/impact-sounds
- https://kenney.nl/assets/interface-sounds
- https://kenney.nl/assets/music-jingles
- https://opengameart.org/content/80-cc0-rpg-sfx
- https://creativecommons.org/publicdomain/zero/1.0/

Звук загружается при первом взаимодействии с игрой, в настройке громкости остаётся прежнее значение 0–100%, кнопка отключения звука сохраняется.

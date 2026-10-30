# KNOTTY PINE — отдельные звуковые эффекты

Большинство эффектов — отдельные файлы .ogg. Звуки не генерируются осцилляторами. Для сбора души теперь используется запись Mixkit Fast magic game spell #883, выбранная автором игры; она воспроизводится с CDN Mixkit и не включена в исходники. Параметры звуков задаются в `src/audio/sfx.js`.

Локальные файлы Kenney и rubberduck опубликованы под **CC0 1.0 (public domain)**. Исключение — запись Mixkit, доступная по **Mixkit Sound Effects Free License**: её можно использовать в видеоиграх, но нельзя выкладывать отдельно в комплекте с исходными звуковыми файлами. Поэтому в репозитории хранится только ссылка на официальную CDN, а старый `soul.ogg` сохранён для возможного отката, но не используется.

| Файл | Событие | Исходная запись |
|---|---|---|
| `start.ogg` | Начало забега | Kenney Impact Sounds; версия heartbeat из brickstorm (обработанная CC0) |
| `move.ogg` | Смена полосы | Kenney RPG Audio — footstep00.ogg |
| `jump.ogg` | Прыжок | rubberduck, 80 CC0 RPG SFX — blade_01.ogg |
| `slide.ogg` | Подкат | Kenney RPG Audio — footstep02.ogg |
| `soul.ogg` | Запасной звук, сейчас НЕ используется | rubberduck, 80 CC0 RPG SFX — spell_01.ogg |
| Mixkit #883, удалённый MP3 | Сбор души (текущий звук) | https://mixkit.co/free-sound-effects/spell/ — Fast magic game spell (Mixkit Sound Effects Free License) |
| `ultimate.ogg` | Ульта | Kenney Music Jingles — jingles_STEEL14.ogg |
| `slip.ogg` | Скольжение по луже | Kenney RPG Audio — footstep09.ogg |
| `hat.ogg` | Ведьмина шляпа | Kenney Interface Sounds — confirmation_001.ogg |
| `death.ogg` | Поражение | Kenney Impact Sounds — impactMetal_heavy_001.ogg |
| `step.ogg` | Тихие шаги при беге | Kenney RPG Audio — footstep06.ogg |
| `land.ogg` | Приземление | Kenney Impact Sounds — impactMining_002.ogg |
| `rat-squeak-breviceps.mp3` | Писк крыс при испуге, один раз на стаю | Breviceps — Cartoon - Bat / Mouse Squeak (Freesound #445958), CC0 |
| `bats-flock-digpro120.mp3` | **Текущий звук стаи летучих мышей (~5 секунд)** | DigPro120, Birds Wings.mp3, Freesound #432639, CC0 |
| `bats-flap_1.ogg` | Запасной звук взмаха, сейчас не используется | Cerise_Virtuelle, Large flying creature (Freesound 759529), переработка CC0 из simplyWings |
| `bats-flap_2.ogg` | Запасной звук взмаха, сейчас не используется | Тот же источник, отдельная обработанная вариация CC0 |
| `bats-flap_3.ogg` | Запасной звук взмаха, сейчас не используется | Тот же источник, отдельная обработанная вариация CC0 |

Источники и лицензии:
- https://kenney.nl/assets/rpg-audio
- https://kenney.nl/assets/impact-sounds
- https://kenney.nl/assets/interface-sounds
- https://kenney.nl/assets/music-jingles
- https://opengameart.org/content/80-cc0-rpg-sfx
- https://creativecommons.org/publicdomain/zero/1.0/
- https://freesound.org/people/Breviceps/sounds/445958/
- https://freesound.org/people/DigPro120/sounds/432639/
- https://freesound.org/people/Cerise_Virtuelle/sounds/759529/
- https://github.com/zorago/simplyWings/blob/main/art/sounds/SOURCES.md
- https://mixkit.co/license/modal/sfxFree/

Звук загружается при первом взаимодействии с игрой, в настройке громкости остаётся прежнее значение 0–100%, кнопка отключения звука сохраняется.


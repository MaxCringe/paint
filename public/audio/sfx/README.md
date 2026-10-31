# KNOTTY PINE — отдельные звуковые эффекты

Большинство эффектов — отдельные файлы .ogg. Звуки не генерируются осцилляторами. Все игровые звуки загружаются из локального комплекта. Для сосны используется выбранный автором Mixkit Fast impact blow #2655 (сокращённый хвост тишины), для сбора душ — локальный CC0 `soul.ogg`. Параметры звуков задаются в `src/audio/sfx.js`.

Локальные файлы Kenney и rubberduck опубликованы под **CC0 1.0 (public domain)**. Исключение — запись Mixkit под **Mixkit Sound Effects Free License**, которая разрешена в играх, но ограничена в распространении отдельно или вместе с исходниками. Публичному репозиторию с этим файлом потребуется пересмотр лицензирования либо замена на CC0.

| Файл | Событие | Исходная запись |
|---|---|---|
| `start.ogg` | Начало забега | Kenney Impact Sounds; версия heartbeat из brickstorm (обработанная CC0) |
| `move.ogg` | Смена полосы | Kenney RPG Audio — footstep00.ogg |
| `jump.ogg` | Прыжок | rubberduck, 80 CC0 RPG SFX — blade_01.ogg |
| `slide.ogg` | Подкат | Kenney RPG Audio — footstep02.ogg |
| `soul.ogg` | Сбор души, локальный звук | rubberduck, 80 CC0 RPG SFX — spell_01.ogg |
| `mixkit-fast-impact-blow-2655.mp3` | Удар Фионы о сосну | Mixkit Fast impact blow #2655 (Mixkit Sound Effects Free License) |
| `ultimate.ogg` | Ульта | Kenney Music Jingles — jingles_STEEL14.ogg |
| `slip.ogg` | Скольжение по луже | Kenney RPG Audio — footstep09.ogg |
| `hat.ogg` | Ведьмина шляпа | Kenney Interface Sounds — confirmation_001.ogg |
| `death.ogg` | Поражение на других препятствиях | Kenney Impact Sounds — impactMetal_heavy_001.ogg |
| `pine-body-impact-courtneyeck.mp3` | Резервный звук удара о сосну | courtneyeck, Freesound 673424, Falling body hits the floor, CC0 |
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
- https://freesound.org/people/courtneyeck/sounds/673424/
- https://freesound.org/people/Breviceps/sounds/445958/
- https://freesound.org/people/DigPro120/sounds/432639/
- https://freesound.org/people/Cerise_Virtuelle/sounds/759529/
- https://github.com/zorago/simplyWings/blob/main/art/sounds/SOURCES.md
- https://mixkit.co/license/modal/sfxFree/

Звук загружается при первом взаимодействии с игрой, в настройке громкости остаётся прежнее значение 0–100%, кнопка отключения звука сохраняется.


В production-сборке Vite автоматически создаётся `sw.js`, который после первого открытия кэширует все файлы игры для последующих запусков без интернета. Первый запуск и обновления требуют доступа к сайту.

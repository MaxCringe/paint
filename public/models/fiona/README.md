# Модель и анимации Фионы

- `rigged-model (1) (1).fbx` — основная модель с 27 костями ArcadeRig и skinned mesh.
- `animations/motions.json.gz` — 23 авторские скелетные анимации, сгенерированные на Python/NumPy.
- Скрипт воспроизведения: `src/player/FionaPythonMotions.js`, `src/player/FionaTest.js`.
- Генератор: `tools/generate_fiona_motions.py`. Для обновления анимаций: `python -m pip install numpy`, затем `python tools/generate_fiona_motions.py`, затем `npm test` и `npm run build`.

**Не загружай Run Forward.fbx и Jump.fbx:** они больше не нужны. Тестовый забег получает модель из этой папки, а все движения — из Python-данных.

Обычная Фиона в `src/player/Fiona.js` остаётся нетронутой. Движения нужно визуально проверить, прежде чем переносить их в основной забег.

// Vite entry point. index.html loads the stylesheet; game logic lives in its own module.
import './game.js';

// Standalone editor: does not alter the normal runner or collision logic.
import { createBroomLab } from './ui/BroomLab.js';
createBroomLab();

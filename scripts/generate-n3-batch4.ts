import fs from 'fs';
import path from 'path';
import { LessonPack, LessonPackSchema } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';

console.log('Starting authoring of JLPT N3 Batch 4 (n3.l31 - n3.l40)...');

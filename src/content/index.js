import { part1 } from './part1.js';
import { part2 } from './part2.js';
import { part3 } from './part3.js';
import { part4 } from './part4.js';

/** Every chapter, in reading order. */
export const chapters = [...part1, ...part2, ...part3, ...part4];

/** Every exercise, flattened, each tagged with the chapter it belongs to. */
export const exercises = chapters.flatMap((ch, index) =>
  ch.blocks
    .filter((b) => b.exercise && b.exercise.kind !== 'sandbox')
    .map((b) => ({ ...b.exercise, chapterId: ch.id, chapterIndex: index }))
);

/** Exercises belonging to a given chapter (sandboxes excluded). */
export const exercisesIn = (chapterId) =>
  exercises.filter((e) => e.chapterId === chapterId);

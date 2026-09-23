import { describe, expect, it } from 'vitest';
import { History } from '../src/core/history';

describe('History', () => {
  it('undoes and redoes in order', () => {
    const history = new History<number>();
    history.record(1);
    history.record(2);
    expect(history.undo(3)).toBe(2);
    expect(history.undo(2)).toBe(1);
    expect(history.undo(1)).toBeUndefined();
    expect(history.redo(1)).toBe(2);
    expect(history.redo(2)).toBe(3);
  });

  it('clears redo after a new change', () => {
    const history = new History<number>();
    history.record(1);
    history.undo(2);
    history.record(1);
    expect(history.canRedo).toBe(false);
  });

  it('drops the oldest entries past the limit', () => {
    const history = new History<number>(2);
    history.record(1);
    history.record(2);
    history.record(3);
    expect(history.undo(4)).toBe(3);
    expect(history.undo(3)).toBe(2);
    expect(history.canUndo).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { test } from '../src/dummy';

describe('test function', () => {
  it('adds two numbers correctly', () => {
    expect(test(2, 3)).toBe(5);
  });
});
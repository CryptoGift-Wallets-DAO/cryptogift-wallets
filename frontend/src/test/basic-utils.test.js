/**
 * Tests for basic utilities - provides coverage
 */

const { add, multiply, isEven, formatString } = require('../utils/basic');

describe('Basic Utilities', () => {
  describe('add function', () => {
    test('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    test('should add negative numbers', () => {
      expect(add(-1, -2)).toBe(-3);
    });

    test('should handle zero', () => {
      expect(add(5, 0)).toBe(5);
    });
  });

  describe('multiply function', () => {
    test('should multiply two numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });

    test('should handle zero multiplication', () => {
      expect(multiply(5, 0)).toBe(0);
    });

    test('should handle negative numbers', () => {
      expect(multiply(-2, 3)).toBe(-6);
    });
  });

  describe('isEven function', () => {
    test('should identify even numbers', () => {
      expect(isEven(4)).toBe(true);
      expect(isEven(0)).toBe(true);
      expect(isEven(-2)).toBe(true);
    });

    test('should identify odd numbers', () => {
      expect(isEven(3)).toBe(false);
      expect(isEven(1)).toBe(false);
      expect(isEven(-1)).toBe(false);
    });
  });

  describe('formatString function', () => {
    test('should format string correctly', () => {
      expect(formatString('  HELLO  ')).toBe('hello');
    });

    test('should handle empty string', () => {
      expect(formatString('')).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(formatString(null)).toBe('');
      expect(formatString(undefined)).toBe('');
    });

    test('should handle normal string', () => {
      expect(formatString('Test')).toBe('test');
    });
  });
});
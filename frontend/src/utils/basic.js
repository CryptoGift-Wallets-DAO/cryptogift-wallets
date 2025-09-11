/**
 * Basic utility functions for testing coverage
 */

function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

function isEven(n) {
  return n % 2 === 0;
}

function formatString(str) {
  if (!str) return '';
  return str.trim().toLowerCase();
}

module.exports = { add, multiply, isEven, formatString };
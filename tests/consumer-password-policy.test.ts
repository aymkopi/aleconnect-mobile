import assert from 'node:assert/strict';
import test from 'node:test';
import { consumerPasswordError, consumerPasswordRules } from '../src/lib/consumer-password-policy.ts';
import { validatePasswordChange } from '../src/features/profile/profile-state.ts';

const strong = 'Frosty-River!93';
test('all live rules match the server policy, including common and personal choices', () => {
  for (const value of ['Aa1!xxx', 'FROSTYRIVER!93', 'frostyriver!93', 'Frosty-River!!', 'FrostyRiver93 ', 'FrostyRiver93\u0000', 'Password123!', 'Admin123!', 'P@ssw0rd123!'])
    assert.ok(consumerPasswordError(value, value), value);
  for (const size of [64, 128]) {
    const value = strong + 'x'.repeat(size - strong.length);
    assert.equal(consumerPasswordError(value, value), null);
  }
  assert.ok(consumerPasswordError(strong + 'x'.repeat(129 - strong.length)));
  assert.ok(consumerPasswordError('Justine!9284', undefined, ['justine@example.com']));
  assert.ok(consumerPasswordError('Safe0123456789!', undefined, ['0123456789']));
  assert.equal(consumerPasswordRules(strong).every(rule => rule.met), true);
  assert.equal(consumerPasswordRules('').some(rule => rule.met), false);
  for (const value of ['Aa1!😀😀', 'Ab1!e\u0301e\u0301']) assert.ok(consumerPasswordError(value, value), 'Count normalized Unicode characters');
  for (const value of ['Pａssword123!', ' Password123! ']) assert.ok(consumerPasswordError(value, value), 'Common canonical credentials remain blocked');
  assert.ok(consumerPasswordError(strong, 'different'));
});
test('forced replacement applies the full policy, current-password difference and confirmation', () => {
  assert.equal(validatePasswordChange('temporary', strong, strong), null);
  assert.ok(validatePasswordChange(strong, strong, strong));
  assert.ok(validatePasswordChange('temporary', 'Admin123!', 'Admin123!'));
  assert.ok(validatePasswordChange('temporary', 'Justine!9284', 'Justine!9284', ['Justine Dela Cruz']));
  assert.ok(validatePasswordChange('temporary', strong, 'different'));
});

import { describe, expect, it } from 'vitest';
import { SIGN_UP_NAME_MAX, signUpNameProblem } from './sign-up-name';

/** The name given at sign-up: optional, one line, of a sensible length. */

describe('the name given at sign-up', () => {
  it('accepts a name, an empty one, and accents and other scripts', () => {
    for (const name of [
      'Ama Owusu',
      '',
      'Zoë Ó Briain',
      'Kwame Nkrumah-Asante',
      '王小明',
      'a'.repeat(SIGN_UP_NAME_MAX),
    ]) {
      expect(signUpNameProblem(name), name).toBeNull();
    }
  });

  it('refuses a name that is too long, runs over more than one line or carries control characters', () => {
    for (const name of [
      'a'.repeat(SIGN_UP_NAME_MAX + 1),
      'there.\nYour invoices are ready',
      'tab\there',
      'bell\u0007',
      'zero​width',
    ]) {
      expect(signUpNameProblem(name), JSON.stringify(name)).toMatch(/up to 100 characters, on one line/);
    }
  });
});

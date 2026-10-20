/** The texts of the emails sign-in sends (docs/specs/sign-in-by-email.md). */

export interface AuthEmail {
  subject: string;
  text: string;
}

/**
 * Sign-in emails greet no one by name: the name was chosen by whoever signed up, who may not be the person at the
 * address, and confirming the address does not show who chose it.
 */
const GREETING = 'Hello,';

export function verificationEmail(input: { url: string }): AuthEmail {
  return {
    subject: 'Confirm your email for Invoica',
    text: [
      GREETING,
      '',
      'To finish creating your Invoica account, open this link and enter the password you chose:',
      '',
      input.url,
      '',
      'The link works for 24 hours. If you did not create an account, you can ignore this email.',
      '',
      'Invoica',
    ].join('\n'),
  };
}

export function resetPasswordEmail(input: { url: string }): AuthEmail {
  return {
    subject: 'Reset your Invoica password',
    text: [
      GREETING,
      '',
      'To choose a new password for your Invoica account, open this link:',
      '',
      input.url,
      '',
      'The link works once, for one hour. If you did not ask to reset your password, ignore this email and your password stays as it is.',
      '',
      'Invoica',
    ].join('\n'),
  };
}

export function existingAccountEmail(input: { appUrl: string }): AuthEmail {
  return {
    subject: 'You already have an Invoica account',
    text: [
      GREETING,
      '',
      'Someone tried to create an Invoica account with this email address, which already has one.',
      '',
      `To sign in: ${input.appUrl}/sign-in`,
      `If you have forgotten your password: ${input.appUrl}/forgot-password`,
      '',
      'If this was not you, you can ignore this email.',
      '',
      'Invoica',
    ].join('\n'),
  };
}

export function passwordChangedEmail(input: { appUrl: string }): AuthEmail {
  return {
    subject: 'Your Invoica password was changed',
    text: [
      GREETING,
      '',
      'The password for your Invoica account has just been changed, and every device was signed out.',
      '',
      `If you did not change it, reset it now: ${input.appUrl}/forgot-password`,
      '',
      'Invoica',
    ].join('\n'),
  };
}

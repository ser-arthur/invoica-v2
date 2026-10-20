/** The texts of the emails sign-in sends (docs/specs/sign-in-by-email.md). */

export interface AuthEmail {
  subject: string;
  text: string;
}

/** "Hello Ama Owusu," or "Hello," when the name given at sign-up was only an email address. */
const greeting = (name: string) => (name && !name.includes('@') ? `Hello ${name},` : 'Hello,');

/** No name: whoever signed up chose it, and the address is not confirmed yet. */
export function verificationEmail(input: { url: string }): AuthEmail {
  return {
    subject: 'Confirm your email for Invoica',
    text: [
      'Hello,',
      '',
      'Confirm your email address to finish creating your Invoica account:',
      '',
      input.url,
      '',
      'The link works for 24 hours. If you did not create an account, you can ignore this email.',
      '',
      'Invoica',
    ].join('\n'),
  };
}

export function resetPasswordEmail(input: { name: string; url: string }): AuthEmail {
  return {
    subject: 'Reset your Invoica password',
    text: [
      greeting(input.name),
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

export function existingAccountEmail(input: { name: string; appUrl: string }): AuthEmail {
  return {
    subject: 'You already have an Invoica account',
    text: [
      greeting(input.name),
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

export function passwordChangedEmail(input: { name: string; appUrl: string }): AuthEmail {
  return {
    subject: 'Your Invoica password was changed',
    text: [
      greeting(input.name),
      '',
      'The password for your Invoica account has just been changed, and every device was signed out.',
      '',
      `If you did not change it, reset it now: ${input.appUrl}/forgot-password`,
      '',
      'Invoica',
    ].join('\n'),
  };
}

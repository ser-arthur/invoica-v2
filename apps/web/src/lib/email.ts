import 'server-only';
import { emailAdapterFor, type EmailAdapter } from './email-adapters';

export { EmailSendError, type EmailAdapter, type OutgoingEmail } from './email-adapters';

export function getEmailAdapter(): EmailAdapter {
  return emailAdapterFor(process.env);
}

export const EMAIL_FROM = () => process.env.EMAIL_FROM ?? 'Invoica <invoices@invoica.local>';

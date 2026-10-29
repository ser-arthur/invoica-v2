'use client';

import { useState } from 'react';
import type { AuthField, AuthFieldErrors } from '@/lib/auth-messages';

const ORDER: AuthField[] = ['name', 'email', 'password'];

/**
 * The errors under a sign-in form's fields: shown under each field, marking it invalid, with focus on the first. A
 * field's error goes once the field is changed.
 */
export function useFieldErrors() {
  const [errors, setErrors] = useState<AuthFieldErrors>({});

  return {
    errors,
    /** Shows these errors and moves focus to the first field at fault; true when there were any. */
    show(next: AuthFieldErrors, form: HTMLFormElement | null) {
      setErrors(next);
      const first = ORDER.find((k) => next[k]);
      if (first) form?.querySelector<HTMLElement>(`#${first}`)?.focus();
      return first !== undefined;
    },
    /** The field's marks for its input: invalid and described by its error while it has one. */
    input(k: AuthField) {
      const has = !!errors[k];
      return {
        'aria-invalid': has || undefined,
        'aria-describedby': has ? `${k}-error` : undefined,
        onInput: () => {
          if (has) setErrors(({ [k]: _gone, ...rest }) => rest);
        },
      };
    },
  };
}

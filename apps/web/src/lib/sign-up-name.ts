export const SIGN_UP_NAME_MAX = 100;

/**
 * Why a name given at sign-up is refused, or null. It goes into emails Invoica sends from its own address, so it is
 * one line of at most 100 characters, with no control or invisible characters.
 */
export function signUpNameProblem(name: string): string | null {
  const fine = [...name].length <= SIGN_UP_NAME_MAX && !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(name);
  return fine ? null : `Use a name of up to ${SIGN_UP_NAME_MAX} characters, on one line.`;
}

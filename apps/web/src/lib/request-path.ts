/**
 * The request header the proxy sets to the address asked for. The not-found page reads it to tell a planned page
 * from a wrong address; the proxy always sets it, so a value sent by the visitor never reaches the page.
 */
export const PATH_HEADER = 'x-invoica-path';

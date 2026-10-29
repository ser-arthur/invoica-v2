# The website's footer

The owner's notes of 29 October 2026, 14:48 and 16:56. The footer had four columns of links (Product, Company, Help,
Legal), and five of them led to pages not written yet. The owner asked whether it needed so many, whether cookies
needed a page of their own, whether the help centre belonged on the website, and what About and Contact would hold.

## The footer

- **Top.** As now: the line "The business side of your business, in order." and "Create free account". Beside them, one
  row of the product's links: Why Invoica, How it works, Templates, Pricing.
- **Bottom line.** The copyright line, "2026 Invoica. Invoica is a trading name of Kobby S. Arthur.", the business's email,
  `hello@getinvoica.com`, as a link to write to it, and Privacy and Terms.
- **Gone:** About, Contact, Help centre, Getting started, Sign in (the header has it) and Cookies, with their planned
  pages. Privacy and Terms stay planned pages until their text is approved.
- The large mark at the foot is unchanged.

## Why

- **Cookies.** Invoica sets only the cookies it needs to work: the sign-in, which business is open, and the light or
  dark choice. None needs consent; the Privacy notice says what they are, in a section of its own.
- **Help.** The help centre is for people already using Invoica, who will reach it from the app. It joins the footer
  when it exists, with Getting started inside it.
- **About and Contact.** Not needed at launch; the email is the way to get in touch.
- **Who is behind it.** Invoica is the trading name of a sole trader. As far as the owner and the assistant know, a sole
  trader using a business name shows their own name, and a UK address where documents can be sent, on the website and
  on invoices. The address is added before Invoica takes paying customers (`docs/BLUEPRINT.md`, open question 14); the
  owner will use a virtual office address. Not legal advice: to be checked with the Privacy notice and Terms.
- **The email.** The domain is `getinvoica.com` (29 October, 16:56). The website shows no other email address: the
  public samples still carry none.

## Acceptance criteria

End-to-end in `apps/web/e2e/website.spec.ts`; the planned pages' list in `planned-pages.test.ts`.

1. The footer's links are Why Invoica, How it works, Templates and Pricing, then the email, Privacy and Terms, and
   "Create free account"; it has no About, Contact, Help centre, Getting started, Sign in or Cookies.
2. The bottom line says "Invoica is a trading name of Kobby S. Arthur." and its email link writes to
   `hello@getinvoica.com`.
3. The planned pages are Privacy and Terms; each is linked from the footer and answers with its notice.
4. The only email address on the home page and the Templates page is the footer's.

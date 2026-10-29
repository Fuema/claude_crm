# Glossary and UI Wording

Generic wording rules for every application built from this template.
**Domain terms, entities, and app-specific wording live in `docs/project.md`.**
If a needed term is missing there, ask before inventing one, then add it.

## User-Facing Language

| Say                | Never say        | Notes                                                              |
| ------------------ | ---------------- | ------------------------------------------------------------------ |
| workspace          | organization     | In all UI text.                                                    |
| project            | repository       | Use "repository" only when the text is specifically about Git.     |
| user               |                  | The person signed in to the app. Do not use it for domain records. |
| sign in / sign out | log in / log out | <!-- TODO: confirm -->                                             |

## Writing Style for UI Text

- Sentence case for buttons, titles, and labels ("Add customer", not "Add Customer").
- Buttons start with a verb ("Save changes", not "OK").
- Destructive actions name what is lost ("Delete deal"), and the
  confirmation names the record: "This will permanently delete the deal Website redesign."
- Error messages say what happened and what to do next.
- Empty states say what is missing and offer the next action
  ("No customers yet. Add customer").

/** Colour themes compiled into the stylesheet (see app.css).
 *
 * Keep this in sync with the `@plugin "daisyui/theme"` blocks. Two are enough:
 * the tactical dark console and a light counterpart. The stored profile and
 * the SSR cookie are both validated against this list.
 */
export const themes: string[] = ["dark", "light"];

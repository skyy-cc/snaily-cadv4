import { customAlphabet } from "nanoid";

interface Options {
  extraChars?: string;
  type: "letters-only" | "numbers-only" | "all";
}

export const NUMBERS = "0123456789";
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateString(length: number, options?: Options) {
  const { type = "all", extraChars = "" } = options ?? {};
  let alphabet = '';

  switch (type) {
    case "numbers-only":
      alphabet = NUMBERS;
      break;
    case "letters-only":
      alphabet = LETTERS;
      break;
    default:
      alphabet = NUMBERS + LETTERS;
  }

  const generate = customAlphabet(alphabet + extraChars);
  return generate(length);
}

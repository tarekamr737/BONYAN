export function readableCoachText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function coachMatchesLocale(value: string, arabic: boolean): boolean {
  const letters = value.match(/\p{L}/gu) ?? [];
  const count = letters.filter(letter => /[\u0600-\u06ff]/u.test(letter)).length;
  return arabic ? letters.length > 0 && count / letters.length >= .25 : count === 0;
}

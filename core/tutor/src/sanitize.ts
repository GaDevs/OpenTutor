export function sanitizeIncomingText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function clampText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

export function stripUnsafeControlChars(text: string): string {
  return text.replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

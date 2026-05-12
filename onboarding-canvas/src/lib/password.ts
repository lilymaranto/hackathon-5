const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateRandomPassword(length = 8): string {
  const maxLength = Math.max(1, Math.min(8, length));
  return Array.from({ length: maxLength }, () => {
    const randomIndex = Math.floor(Math.random() * PASSWORD_CHARS.length);
    return PASSWORD_CHARS[randomIndex];
  }).join("");
}

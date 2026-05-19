/** Normalize user domain input to a fetchable https URL and hostname. */
export function normalizeBrandDomainInput(raw: string): { hostname: string; url: string } {
  let input = raw.trim();
  if (!input) {
    throw new Error("Enter a domain name.");
  }

  input = input.replace(/^https?:\/\//i, "");
  input = input.replace(/^www\./i, "");
  input = input.split("/")[0]?.split("?")[0]?.split("#")[0]?.trim() ?? "";

  if (!input) {
    throw new Error("Enter a domain name.");
  }

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(input)) {
    throw new Error("Enter a valid domain like example.com.");
  }

  const hostname = input.toLowerCase();
  return { hostname, url: `https://${hostname}` };
}

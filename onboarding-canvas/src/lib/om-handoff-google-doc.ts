import type { docs_v1 } from "googleapis";
import { google } from "googleapis";

import type { OmExportSection } from "@/lib/om-handoff-export";

export function handoffGoogleDocUrl(documentId: string): string {
  return `https://docs.google.com/document/d/${documentId}/edit`;
}

/**
 * Creates a Google Doc and fills it with OM hand-off sections (bold headings).
 * Caller supplies a valid OAuth access token with Docs + Drive scopes.
 */
export async function createOmHandoffGoogleDoc(args: {
  documentTitle: string;
  sections: OmExportSection[];
  accessToken: string;
}): Promise<{ documentId: string; url: string }> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: args.accessToken });
  const docs = google.docs({ version: "v1", auth });

  const created = await docs.documents.create({
    requestBody: { title: args.documentTitle },
  });
  const documentId = created.data.documentId;
  if (!documentId) throw new Error("Google Docs API did not return a document id.");

  const requests: docs_v1.Schema$Request[] = [];
  let index = 1;

  for (const seg of args.sections) {
    if (seg.kind === "heading") {
      const line = seg.text;
      const insert = `${line}\n`;
      requests.push({ insertText: { location: { index }, text: insert } });
      requests.push({
        updateTextStyle: {
          range: { startIndex: index, endIndex: index + line.length },
          textStyle: { bold: true },
          fields: "bold",
        },
      });
      index += insert.length;
    } else {
      const line = seg.text;
      const insert = line === "" ? "\n" : `${line}\n`;
      requests.push({ insertText: { location: { index }, text: insert } });
      index += insert.length;
    }
  }

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }

  return { documentId, url: handoffGoogleDocUrl(documentId) };
}

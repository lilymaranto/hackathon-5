import { authOptions } from "@/lib/auth-options";
import { getMongoCollections } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type LogoLibraryItem = {
  configId: string;
  title: string;
  logoDataUrl: string;
  updatedAt?: string;
};

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email?.trim()) {
      return NextResponse.json({ error: "Sign in to access the logo library." }, { status: 401 });
    }

    const mineOnly = request.nextUrl.searchParams.get("mine") === "1";
    const requesterEmail = normalizeEmail(session.user.email);
    const { assets, configs } = await getMongoCollections();

    const logoDocs = await assets
      .find(
        { Asset_Type: "logo" },
        { projection: { Config_ID: 1, Data_URL: 1, Updated_At: 1 } },
      )
      .sort({ Updated_At: -1, Config_ID: 1 })
      .limit(200)
      .toArray();

    const configIds = Array.from(
      new Set(
        logoDocs
          .map((doc) => String((doc as Record<string, unknown>).Config_ID ?? "").trim())
          .filter((id) => id.length > 0),
      ),
    );
    if (configIds.length === 0) {
      return NextResponse.json({ data: [] as LogoLibraryItem[] });
    }

    const configDocs = await configs
      .find(
        { Config_ID: { $in: configIds } },
        { projection: { Config_ID: 1, Title: 1, Created_By: 1 } },
      )
      .toArray();
    const configById = new Map(
      configDocs.map((doc) => {
        const row = doc as Record<string, unknown>;
        return [
          String(row.Config_ID ?? ""),
          {
            title: String(row.Title ?? "Untitled config"),
            createdBy: normalizeEmail(row.Created_By),
          },
        ] as const;
      }),
    );

    const data = logoDocs
      .map((doc) => {
        const row = doc as Record<string, unknown>;
        const configId = String(row.Config_ID ?? "").trim();
        const logoDataUrl = String(row.Data_URL ?? "").trim();
        if (!configId || !logoDataUrl.startsWith("data:image/")) return null;
        const configMeta = configById.get(configId);
        if (!configMeta) return null;
        if (mineOnly && requesterEmail !== configMeta.createdBy) return null;
        const item: LogoLibraryItem = {
          configId,
          title: configMeta.title,
          logoDataUrl,
        };
        const updatedAt = String(row.Updated_At ?? "").trim();
        if (updatedAt) item.updatedAt = updatedAt;
        return item;
      })
      .filter((item): item is LogoLibraryItem => Boolean(item));

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

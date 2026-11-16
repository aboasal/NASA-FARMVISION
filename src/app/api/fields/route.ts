import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FarmField, FarmerGroundInputs, SavedFieldRecord } from "@/types/farm";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "saved-fields.json");
const MAX_RECORDS = 50;

let memoryFallback: SavedFieldRecord[] = [];

async function readRecords(): Promise<SavedFieldRecord[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryFallback = parsed as SavedFieldRecord[];
      return memoryFallback;
    }
  } catch {
    // File does not exist yet or cannot be read; fall back to in-memory list
  }
  return memoryFallback;
}

async function writeRecords(records: SavedFieldRecord[]): Promise<void> {
  const trimmed = records.slice(0, MAX_RECORDS);
  memoryFallback = trimmed;
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch {
    // Keep memoryFallback if filesystem write is unavailable
  }
}

export async function GET() {
  const records = await readRecords();
  return Response.json({ records });
}

export async function POST(request: Request) {
  let body: { field?: FarmField; inputs?: FarmerGroundInputs };
  try {
    body = (await request.json()) as {
      field?: FarmField;
      inputs?: FarmerGroundInputs;
    };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const field = body?.field;
  if (
    !field ||
    typeof field.id !== "string" ||
    !Array.isArray(field.centroid) ||
    field.centroid.length < 2
  ) {
    return Response.json(
      { error: "Missing valid field object with id and centroid" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const record: SavedFieldRecord = {
    ...field,
    updatedAt: now,
    inputs: body.inputs,
  };

  const existing = await readRecords();
  const filtered = existing.filter((r) => r.id !== field.id);
  const next = [record, ...filtered];
  await writeRecords(next);

  return Response.json({ ok: true, record });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing field id" }, { status: 400 });
  }

  const existing = await readRecords();
  const next = existing.filter((r) => r.id !== id);
  await writeRecords(next);

  return Response.json({ ok: true });
}

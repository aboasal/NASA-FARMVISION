import { buildClimateProfile } from "@/server/climateProfile";
import { getClimatology, getMonthlyTrends, getRecentDaily } from "@/server/nasaPower";
import { generateRotationPlans } from "@/server/rotationEngine";
import type {
  FarmerGroundInputs,
  PlanPriority,
  PlanRequestBody,
  PlanResponse,
  PreviousCropType,
  WaterSupplyTier,
} from "@/types/farm";

const VALID_WATER_TIERS: WaterSupplyTier[] = ["low", "moderate", "high"];
const VALID_LAST_CROPS: PreviousCropType[] = [
  "Wheat",
  "Corn",
  "Rice",
  "Cotton",
  "Vegetables",
  "Soybeans",
  "Orchard",
  "Fallow",
];
const VALID_PRIORITIES: PlanPriority[] = [
  "profit",
  "sustainability",
  "water-saving",
];

function isValidCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function normalizeInputs(raw?: Partial<FarmerGroundInputs>): FarmerGroundInputs {
  const waterTier: WaterSupplyTier =
    raw?.waterTier && VALID_WATER_TIERS.includes(raw.waterTier)
      ? raw.waterTier
      : "moderate";
  const lastCrop: PreviousCropType =
    raw?.lastCrop && VALID_LAST_CROPS.includes(raw.lastCrop)
      ? raw.lastCrop
      : "Wheat";
  const priority: PlanPriority =
    raw?.priority && VALID_PRIORITIES.includes(raw.priority)
      ? raw.priority
      : "sustainability";
  const rawWater = Number(raw?.waterM3PerHa);
  const waterM3PerHa =
    Number.isFinite(rawWater) && rawWater >= 0
      ? Math.min(25000, Math.round(rawWater))
      : 4000;

  return { waterTier, waterM3PerHa, lastCrop, priority };
}

async function computePlanResponse(
  lat: number,
  lng: number,
  areaHectares: number,
  inputs: FarmerGroundInputs
): Promise<PlanResponse> {
  const [clim, trends, recent] = await Promise.all([
    getClimatology(lat, lng),
    getMonthlyTrends(lat, lng),
    getRecentDaily(lat, lng),
  ]);

  const climate = buildClimateProfile(lat, lng, clim, trends, recent);
  const plans = generateRotationPlans(climate, inputs, areaHectares);

  return {
    climate,
    plans,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Indicative crop-rotation scores combine NASA POWER multi-year climate normals, 10-year weather trends, and your field inputs to help explore soil health and climate resilience options.",
  };
}

export async function POST(request: Request) {
  let body: Partial<PlanRequestBody>;
  try {
    body = (await request.json()) as Partial<PlanRequestBody>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const centroid = body?.field?.centroid;
  if (!Array.isArray(centroid) || centroid.length < 2) {
    return Response.json(
      { error: "Missing field.centroid [lat, lng]" },
      { status: 400 }
    );
  }

  const lat = Number(centroid[0]);
  const lng = Number(centroid[1]);
  if (!isValidCoords(lat, lng)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const rawArea = Number(body?.field?.areaHectares);
  const areaHectares =
    Number.isFinite(rawArea) && rawArea > 0 ? Math.min(50000, rawArea) : 10;
  const inputs = normalizeInputs(body?.inputs);

  const response = await computePlanResponse(lat, lng, areaHectares, inputs);
  return Response.json(response);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat") ?? "30.8225");
  const lng = Number(searchParams.get("lng") ?? "31.0187");

  if (!isValidCoords(lat, lng)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const rawArea = Number(searchParams.get("areaHectares") ?? "25");
  const areaHectares =
    Number.isFinite(rawArea) && rawArea > 0 ? Math.min(50000, rawArea) : 25;

  const waterTierParam = searchParams.get("waterTier") as WaterSupplyTier | null;
  const lastCropParam = searchParams.get("lastCrop") as PreviousCropType | null;
  const priorityParam = searchParams.get("priority") as PlanPriority | null;
  const waterM3Param = searchParams.get("waterM3PerHa");

  const inputs = normalizeInputs({
    waterTier: waterTierParam ?? undefined,
    waterM3PerHa: waterM3Param !== null ? Number(waterM3Param) : undefined,
    lastCrop: lastCropParam ?? undefined,
    priority: priorityParam ?? undefined,
  });

  const response = await computePlanResponse(lat, lng, areaHectares, inputs);
  return Response.json(response);
}

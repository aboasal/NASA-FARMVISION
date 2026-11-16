import { getRecentDaily } from "@/server/nasaPower";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  if (latParam === null || lngParam === null) {
    return Response.json(
      { error: "Missing required query parameters: lat and lng" },
      { status: 400 }
    );
  }

  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return Response.json(
      { error: "Invalid coordinates. Latitude must be [-90, 90] and longitude [-180, 180]." },
      { status: 400 }
    );
  }

  const data = await getRecentDaily(lat, lng);
  return Response.json(data);
}

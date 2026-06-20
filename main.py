import os
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from supabase import create_client, Client

app = FastAPI(title="PragiaGo Engine", version="1.0.0")

# Fetch Supabase environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

# Initialize Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class SpatialRideRequest(BaseModel):
    passenger_id: str
    pickup_lng: float
    pickup_lat: float
    dropoff_lng: float
    dropoff_lat: float
    pickup_address: str
    dropoff_address: str
    fare_ghs: float


class NearbyDriversRequest(BaseModel):
    passenger_lat: float = Field(..., description="Passenger latitude (WGS84)")
    passenger_lng: float = Field(..., description="Passenger longitude (WGS84)")
    radius_meters: float = Field(
        default=3000.0,
        ge=100,
        le=50000,
        description="Search radius in metres (100m – 50km). Defaults to 3 km."
    )


class DriverLocationUpdate(BaseModel):
    driver_id: str = Field(..., description="Driver's auth user UUID")
    latitude: float  = Field(..., ge=-90,  le=90,  description="Current latitude (WGS84)")
    longitude: float = Field(..., ge=-180, le=180, description="Current longitude (WGS84)")


class AcceptRideRequest(BaseModel):
    ride_id:   str = Field(..., description="UUID of the ride to accept")
    driver_id: str = Field(..., description="Driver's auth user UUID")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def health_check():
    return {"status": "PragiaGo Active"}


@app.post("/api/v1/rides/book", status_code=status.HTTP_201_CREATED)
async def request_ride(payload: SpatialRideRequest):
    """
    Book a new ride. Inserts a ride record with PostGIS geography points
    for pickup and dropoff locations.
    """
    try:
        # Convert lat/lng parameters into PostGIS standard WKT Point format
        pickup_point = f"POINT({payload.pickup_lng} {payload.pickup_lat})"
        dropoff_point = f"POINT({payload.dropoff_lng} {payload.dropoff_lat})"

        data, count = supabase.table("rides").insert({
            "passenger_id": payload.passenger_id,
            "pickup_location": pickup_point,
            "dropoff_location": dropoff_point,
            "pickup_address": payload.pickup_address,
            "dropoff_address": payload.dropoff_address,
            "fare_ghs": payload.fare_ghs,
            "status": "requested"
        }).execute()

        return {"status": "success", "data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/rides/nearby-drivers", status_code=status.HTTP_200_OK)
async def get_nearby_drivers(payload: NearbyDriversRequest):
    """
    Spatial driver discovery.
    Calls the PostGIS RPC function `get_nearby_drivers` to return a list of
    verified, active drivers within the given radius, sorted by distance
    (nearest first).
    """
    try:
        response = supabase.rpc(
            "get_nearby_drivers",
            {
                "passenger_lat": payload.passenger_lat,
                "passenger_lng": payload.passenger_lng,
                "radius_meters": payload.radius_meters,
            }
        ).execute()

        drivers = response.data or []

        return {
            "status": "success",
            "count": len(drivers),
            "radius_meters": payload.radius_meters,
            "drivers": drivers,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/drivers/update-location", status_code=status.HTTP_200_OK)
async def update_driver_location(payload: DriverLocationUpdate):
    """
    Real-time GPS ping endpoint.
    Upserts the driver's current coordinates into `driver_locations`.
    The driver's mobile app should call this every 4-6 seconds while online.
    Each driver has exactly one row — subsequent pings overwrite `current_location`
    and `updated_at` atomically via ON CONFLICT (driver_id) DO UPDATE.
    """
    try:
        current_point = f"POINT({payload.longitude} {payload.latitude})"

        response = supabase.table("driver_locations").upsert(
            {
                "driver_id":        payload.driver_id,
                "current_location": current_point,
                "updated_at":       "now()",
            },
            on_conflict="driver_id"
        ).execute()

        return {
            "status":    "location_updated",
            "driver_id": payload.driver_id,
            "coordinates": {
                "lat": payload.latitude,
                "lng": payload.longitude,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Supabase Realtime — Frontend Subscription Reference
# ---------------------------------------------------------------------------
# The `public.rides` table is now added to the `supabase_realtime` publication.
# Every INSERT / UPDATE / DELETE is instantly broadcast to subscribed clients.
#
# ─── React Native / Flutter (supabase-js) subscription pattern ───────────────
#
#   import { createClient } from '@supabase/supabase-js'
#
#   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
#
#   // Called once on the PASSENGER side after booking a ride
#   function subscribeToRideStatus(rideId, onStatusChange) {
#     const channel = supabase
#       .channel(`ride-status-${rideId}`)          // unique channel per ride
#       .on(
#         'postgres_changes',
#         {
#           event:  'UPDATE',                       // only care about updates
#           schema: 'public',
#           table:  'rides',
#           filter: `id=eq.${rideId}`,              // this passenger's ride only
#         },
#         (payload) => {
#           const newStatus = payload.new.status
#           // Status lifecycle: requested -> accepted -> ongoing -> completed
#           onStatusChange(newStatus, payload.new)
#         }
#       )
#       .subscribe()
#
#     // Return unsubscribe fn to call on component unmount
#     return () => supabase.removeChannel(channel)
#   }
#
# ─── Status lifecycle for PragiaGo ──────────────────────────────────────────
#   'requested'  → Passenger books ride  (POST /api/v1/rides/book)
#   'accepted'   → Driver accepts        (POST /api/v1/rides/accept)  ← triggers Realtime
#   'ongoing'    → Driver starts trip    (future: POST /api/v1/rides/start)
#   'completed'  → Trip ends             (future: POST /api/v1/rides/complete)
#   'cancelled'  → Either party cancels  (future: POST /api/v1/rides/cancel)
# ---------------------------------------------------------------------------


@app.post("/api/v1/rides/accept", status_code=status.HTTP_200_OK)
async def accept_ride(payload: AcceptRideRequest):
    """
    Driver accepts a pending ride request.

    Atomically updates the ride row: status 'requested' -> 'accepted' and
    assigns the driver_id.  The `.eq("status", "requested")` guard prevents
    two drivers from accepting the same ride simultaneously (race condition).

    The UPDATE to `public.rides` is automatically broadcast via Supabase
    Realtime to the passenger's subscribed channel, triggering their UI update.
    """
    try:
        response = (
            supabase.table("rides")
            .update({
                "status":    "accepted",
                "driver_id": payload.driver_id,
            })
            .eq("id",     payload.ride_id)
            .eq("status", "requested")   # race-condition guard
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ride is no longer available — already accepted or cancelled.",
            )

        return {
            "status": "ride_accepted",
            "ride":   response.data[0],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

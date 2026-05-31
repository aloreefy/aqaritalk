import type { Property, PropertyImage } from "@workspace/db";

function parseNum(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function mapImage(img: PropertyImage) {
  return {
    id: img.id,
    propertyId: img.propertyId,
    path: img.path,
    gpsLat: parseNum(img.gpsLat),
    gpsLng: parseNum(img.gpsLng),
    sizeBytes: img.sizeBytes,
    isVoiceNote: img.isVoiceNote,
    createdAt: img.createdAt,
  };
}

export function toApiProperty(
  row: Property,
  images?: PropertyImage[],
  distance?: number,
) {
  return {
    id: row.id,
    createdBy: row.createdBy,
    listingName: row.listingName,
    listingDirection: row.listingDirection,
    propertyType: row.propertyType,
    transactionMode: row.transactionMode,
    rentalPeriod: row.rentalPeriod,
    price: parseNum(row.price),
    priceCurrency: row.priceCurrency,
    priceNegotiable: row.priceNegotiable,
    country: row.country,
    city: row.city,
    district: row.district,
    street: row.street,
    addressFull: row.addressFull,
    latitude: parseNum(row.latitude),
    longitude: parseNum(row.longitude),
    locationAccuracy: row.locationAccuracy,
    areaSqm: parseNum(row.areaSqm),
    rooms: row.rooms,
    bathrooms: row.bathrooms,
    floorNumber: row.floorNumber,
    furnishedStatus: row.furnishedStatus,
    parking: row.parking,
    hasElevator: row.hasElevator,
    condition: row.condition,
    description: row.description,
    status: row.status,
    verified: row.verified,
    aiMissingFields: row.aiMissingFields,
    contactPreference: row.contactPreference,
    brokerListing: row.brokerListing,
    images: images?.map(mapImage),
    distance: distance ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toApiContactRelease(
  row: {
    id: string;
    buyerId: string;
    sellerId: string;
    propertyId: string;
    status: string;
    commissionBuyerPct: string;
    commissionSellerPct: string;
    buyerAckAt: Date | null;
    sellerAckAt: Date | null;
    releasedAt: Date | null;
    createdAt: Date;
  },
  buyerPhone?: string | null,
  sellerPhone?: string | null,
) {
  return {
    id: row.id,
    buyerId: row.buyerId,
    sellerId: row.sellerId,
    propertyId: row.propertyId,
    status: row.status,
    commissionBuyerPct: parseNum(row.commissionBuyerPct)!,
    commissionSellerPct: parseNum(row.commissionSellerPct)!,
    buyerAckAt: row.buyerAckAt,
    sellerAckAt: row.sellerAckAt,
    releasedAt: row.releasedAt,
    buyerPhone: row.status === "released" ? buyerPhone : null,
    sellerPhone: row.status === "released" ? sellerPhone : null,
    createdAt: row.createdAt,
  };
}

export function toApiCommission(row: {
  id: string;
  defaultBuyerPct: string;
  defaultSellerPct: string;
  negotiable: boolean;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    defaultBuyerPct: parseNum(row.defaultBuyerPct)!,
    defaultSellerPct: parseNum(row.defaultSellerPct)!,
    negotiable: row.negotiable,
    updatedAt: row.updatedAt,
  };
}

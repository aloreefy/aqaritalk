export type BuyerState =
  | "greeting"
  | "type_collection"
  | "budget_collection"
  | "location_collection"
  | "details_collection"
  | "searching"
  | "results_presented"
  | "contact_request";

export type SellerState =
  | "greeting"
  | "category_collection"
  | "transaction_type"
  | "location_collection"
  | "pricing"
  | "details_collection"
  | "guidance_review"
  | "submit_ready";

export type ConversationState = BuyerState | SellerState;

export interface BuyerCriteria {
  category?: string;
  transactionMode?: string;
  budgetMin?: number;
  budgetMax?: number;
  rooms?: number;
  district?: string;
  city?: string;
  furnished?: string;
  parking?: boolean;
  radiusKm?: number;
}

export interface SellerData {
  category?: string;
  transactionMode?: string;
  price?: number;
  district?: string;
  city?: string;
  rooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  furnished?: string;
  parking?: boolean;
  description?: string;
  floorNumber?: number;
}

const BUYER_TRANSITIONS: Record<BuyerState, { requiredFields: (keyof BuyerCriteria)[]; next: BuyerState }> = {
  greeting:          { requiredFields: [],            next: "type_collection" },
  type_collection:   { requiredFields: ["category"],  next: "budget_collection" },
  budget_collection: { requiredFields: ["budgetMax"], next: "location_collection" },
  location_collection: { requiredFields: ["city"],    next: "details_collection" },
  details_collection:  { requiredFields: [],          next: "searching" },
  searching:           { requiredFields: [],          next: "results_presented" },
  results_presented:   { requiredFields: [],          next: "contact_request" },
  contact_request:     { requiredFields: [],          next: "contact_request" },
};

const SELLER_TRANSITIONS: Record<SellerState, { requiredFields: (keyof SellerData)[]; next: SellerState }> = {
  greeting:           { requiredFields: [],                next: "category_collection" },
  category_collection: { requiredFields: ["category"],     next: "transaction_type" },
  transaction_type:    { requiredFields: ["transactionMode"], next: "location_collection" },
  location_collection: { requiredFields: ["city"],         next: "pricing" },
  pricing:             { requiredFields: ["price"],        next: "details_collection" },
  details_collection:  { requiredFields: ["areaSqm"],      next: "guidance_review" },
  guidance_review:     { requiredFields: [],               next: "submit_ready" },
  submit_ready:        { requiredFields: [],               next: "submit_ready" },
};

export function advanceBuyerState(state: BuyerState, criteria: BuyerCriteria): BuyerState {
  const transition = BUYER_TRANSITIONS[state];
  if (!transition) return state;
  const allFilled = transition.requiredFields.every((f) => criteria[f] != null);
  return allFilled ? transition.next : state;
}

export function advanceSellerState(state: SellerState, data: SellerData): SellerState {
  const transition = SELLER_TRANSITIONS[state];
  if (!transition) return state;
  const allFilled = transition.requiredFields.every((f) => data[f] != null);
  return allFilled ? transition.next : state;
}

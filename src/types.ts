/** A localized Google Play store listing. */
export interface Listing {
  language: string;
  title: string;
  fullDescription: string;
  shortDescription: string;
  video?: string;
}

/** Response from edits.listings.list */
export interface ListingsListResponse {
  kind: string;
  listings: Listing[];
}

/** An edit resource returned by insert / get. */
export interface AppEdit {
  id: string;
  expiryTimeSeconds: string;
}

/** Partial listing for PATCH operations — every field is optional. */
export interface ListingPatch {
  title?: string;
  fullDescription?: string;
  shortDescription?: string;
  video?: string;
}

/** Shape of a Google service-account key file. */
export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

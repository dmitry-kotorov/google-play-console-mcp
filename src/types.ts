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

// ── Reviews ────────────────────────────────────────────────────────────

export interface Timestamp {
  seconds: string;
  nanos?: number;
}

export interface DeviceMetadata {
  productName?: string;
  manufacturer?: string;
  deviceClass?: string;
  screenWidthPx?: number;
  screenHeightPx?: number;
  nativePlatform?: string;
  screenDensityDpi?: number;
  glEsVersion?: number;
  cpuModel?: string;
  cpuMake?: string;
  ramMb?: number;
}

export interface UserComment {
  text: string;
  lastModified: Timestamp;
  starRating: number;
  reviewerLanguage?: string;
  device?: string;
  androidOsVersion?: number;
  appVersionCode?: number;
  appVersionName?: string;
  thumbsUpCount?: number;
  thumbsDownCount?: number;
  deviceMetadata?: DeviceMetadata;
  originalText?: string;
}

export interface DeveloperComment {
  text: string;
  lastModified: Timestamp;
}

export interface Comment {
  userComment?: UserComment;
  developerComment?: DeveloperComment;
}

export interface Review {
  reviewId: string;
  authorName: string;
  comments: Comment[];
}

export interface ReviewsListResponse {
  reviews?: Review[];
  pageInfo?: {
    totalResults: number;
    resultPerPage: number;
    startIndex: number;
  };
  tokenPagination?: {
    nextPageToken?: string;
    previousPageToken?: string;
  };
}

export interface ReviewReplyResult {
  replyText: string;
  lastEdited: Timestamp;
}

export interface ReviewsReplyResponse {
  result: ReviewReplyResult;
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

import { GoogleAuth } from "google-auth-library";
import { API_BASE_URL, ANDROID_PUBLISHER_SCOPE } from "../constants.js";

/**
 * Thin HTTP client for the Google Play Developer API v3.
 *
 * Authentication is handled via a Google service-account key file whose path
 * is read from the GOOGLE_APPLICATION_CREDENTIALS environment variable (standard
 * Google Cloud convention) or from GOOGLE_SERVICE_ACCOUNT_KEY_FILE.
 */

let authClient: GoogleAuth | undefined;

function getAuth(): GoogleAuth {
  if (authClient) return authClient;

  const keyFile =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!keyFile) {
    throw new Error(
      "Missing service-account credentials. Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE " +
        "or GOOGLE_APPLICATION_CREDENTIALS to the path of your JSON key file."
    );
  }

  authClient = new GoogleAuth({
    keyFile,
    scopes: [ANDROID_PUBLISHER_SCOPE],
  });

  return authClient;
}

/** Low-level authenticated request. Returns the parsed JSON body. */
export async function apiRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown
): Promise<T> {
  const auth = getAuth();
  const client = await auth.getClient();
  const url = `${API_BASE_URL}/${path}`;

  const res = await client.request<T>({
    url,
    method,
    data: body,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  return res.data;
}

// ── Convenience helpers keyed to actual API endpoints ──────────────────

import type {
  AppEdit,
  Listing,
  ListingsListResponse,
  ListingPatch,
  Review,
  ReviewsListResponse,
  ReviewsReplyResponse,
} from "../types.js";

// -- Edits --

export async function insertEdit(packageName: string): Promise<AppEdit> {
  return apiRequest<AppEdit>(`${packageName}/edits`, "POST", {});
}

export async function getEdit(
  packageName: string,
  editId: string
): Promise<AppEdit> {
  return apiRequest<AppEdit>(`${packageName}/edits/${editId}`);
}

export async function commitEdit(
  packageName: string,
  editId: string
): Promise<AppEdit> {
  return apiRequest<AppEdit>(
    `${packageName}/edits/${editId}:commit`,
    "POST"
  );
}

export async function validateEdit(
  packageName: string,
  editId: string
): Promise<AppEdit> {
  return apiRequest<AppEdit>(
    `${packageName}/edits/${editId}:validate`,
    "POST"
  );
}

export async function deleteEdit(
  packageName: string,
  editId: string
): Promise<void> {
  await apiRequest<void>(`${packageName}/edits/${editId}`, "DELETE");
}

// -- Listings --

export async function listListings(
  packageName: string,
  editId: string
): Promise<ListingsListResponse> {
  return apiRequest<ListingsListResponse>(
    `${packageName}/edits/${editId}/listings`
  );
}

export async function getListing(
  packageName: string,
  editId: string,
  language: string
): Promise<Listing> {
  return apiRequest<Listing>(
    `${packageName}/edits/${editId}/listings/${language}`
  );
}

export async function updateListing(
  packageName: string,
  editId: string,
  language: string,
  listing: ListingPatch
): Promise<Listing> {
  return apiRequest<Listing>(
    `${packageName}/edits/${editId}/listings/${language}`,
    "PUT",
    listing
  );
}

export async function patchListing(
  packageName: string,
  editId: string,
  language: string,
  listing: ListingPatch
): Promise<Listing> {
  return apiRequest<Listing>(
    `${packageName}/edits/${editId}/listings/${language}`,
    "PATCH",
    listing
  );
}

export async function deleteListing(
  packageName: string,
  editId: string,
  language: string
): Promise<void> {
  await apiRequest<void>(
    `${packageName}/edits/${editId}/listings/${language}`,
    "DELETE"
  );
}

export async function deleteAllListings(
  packageName: string,
  editId: string
): Promise<void> {
  await apiRequest<void>(
    `${packageName}/edits/${editId}/listings`,
    "DELETE"
  );
}

// -- Reviews (not part of edits — operate directly on the app) --

export async function listReviews(
  packageName: string,
  options?: {
    translationLanguage?: string;
    maxResults?: number;
    startIndex?: number;
    token?: string;
  }
): Promise<ReviewsListResponse> {
  const params = new URLSearchParams();
  if (options?.translationLanguage)
    params.set("translationLanguage", options.translationLanguage);
  if (options?.maxResults !== undefined)
    params.set("maxResults", String(options.maxResults));
  if (options?.startIndex !== undefined)
    params.set("startIndex", String(options.startIndex));
  if (options?.token) params.set("token", options.token);

  const qs = params.toString();
  const path = `${packageName}/reviews${qs ? `?${qs}` : ""}`;
  return apiRequest<ReviewsListResponse>(path);
}

export async function getReview(
  packageName: string,
  reviewId: string,
  translationLanguage?: string
): Promise<Review> {
  const qs = translationLanguage
    ? `?translationLanguage=${encodeURIComponent(translationLanguage)}`
    : "";
  return apiRequest<Review>(`${packageName}/reviews/${reviewId}${qs}`);
}

export async function replyToReview(
  packageName: string,
  reviewId: string,
  replyText: string
): Promise<ReviewsReplyResponse> {
  return apiRequest<ReviewsReplyResponse>(
    `${packageName}/reviews/${reviewId}:reply`,
    "POST",
    { replyText }
  );
}

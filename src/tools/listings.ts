import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../services/google-play-api.js";
import type { Listing } from "../types.js";
import { handleError } from "./edits.js";

// ── Shared schema fragments ────────────────────────────────────────────

const PackageName = z
  .string()
  .min(1)
  .describe("Android package name, e.g. com.example.myapp");

const EditId = z
  .string()
  .min(1)
  .describe("Edit ID returned by google_play_insert_edit");

const Language = z
  .string()
  .min(1)
  .describe("BCP-47 language tag, e.g. en-US, de-DE, ja-JP");

// ── Helpers ─────────────────────────────────────────────────────────────

function formatListing(l: Listing): string {
  return JSON.stringify(
    {
      language: l.language,
      title: l.title,
      shortDescription: l.shortDescription,
      fullDescription: l.fullDescription,
      ...(l.video ? { video: l.video } : {}),
    },
    null,
    2
  );
}

function formatListingSummary(l: Listing): string {
  return `- **${l.language}**: ${l.title}`;
}

// ── Tool registration ──────────────────────────────────────────────────

export function registerListingTools(server: McpServer): void {
  // ── List all listings ───────────────────────────────────────────────
  server.registerTool(
    "google_play_list_listings",
    {
      title: "List Listings",
      description:
        "Retrieve all localized store listings for an app within an edit.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - edit_id (string): Edit ID\n\n" +
        "Returns: array of listings, each with language, title, shortDescription, " +
        "fullDescription, and optional video URL.",
      inputSchema: {
        package_name: PackageName,
        edit_id: EditId,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ package_name, edit_id }: { package_name: string; edit_id: string }) => {
      try {
        const resp = await api.listListings(package_name, edit_id);
        const listings = resp.listings ?? [];
        if (listings.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No listings found for this edit." },
            ],
          };
        }

        const summary = listings.map(formatListingSummary).join("\n");
        const full = JSON.stringify(listings, null, 2);
        const text = `Found ${listings.length} listing(s):\n${summary}\n\nFull data:\n${full}`;

        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── Get a single listing ────────────────────────────────────────────
  server.registerTool(
    "google_play_get_listing",
    {
      title: "Get Listing",
      description:
        "Retrieve a single localized store listing by language.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - edit_id (string): Edit ID\n" +
        "  - language (string): BCP-47 language tag\n\n" +
        "Returns: listing object with language, title, shortDescription, " +
        "fullDescription, and optional video URL.",
      inputSchema: {
        package_name: PackageName,
        edit_id: EditId,
        language: Language,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({
      package_name,
      edit_id,
      language,
    }: {
      package_name: string;
      edit_id: string;
      language: string;
    }) => {
      try {
        const listing = await api.getListing(package_name, edit_id, language);
        return {
          content: [{ type: "text" as const, text: formatListing(listing) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── Update (create or replace) a listing ────────────────────────────
  server.registerTool(
    "google_play_update_listing",
    {
      title: "Update Listing",
      description:
        "Create or fully replace a localized store listing for a given language. " +
        "All fields (title, shortDescription, fullDescription) are required. " +
        "Use google_play_patch_listing if you only want to change specific fields.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - edit_id (string): Edit ID\n" +
        "  - language (string): BCP-47 language tag\n" +
        "  - title (string): App title (max 30 chars)\n" +
        "  - short_description (string): Short description (max 80 chars)\n" +
        "  - full_description (string): Full description (max 4000 chars)\n" +
        "  - video (string, optional): YouTube promo video URL\n\n" +
        "Returns: the saved listing object.",
      inputSchema: {
        package_name: PackageName,
        edit_id: EditId,
        language: Language,
        title: z.string().min(1).max(30).describe("App title (max 30 characters)"),
        short_description: z
          .string()
          .min(1)
          .max(80)
          .describe("Short description (max 80 characters)"),
        full_description: z
          .string()
          .min(1)
          .max(4000)
          .describe("Full description (max 4000 characters)"),
        video: z
          .string()
          .url()
          .optional()
          .describe("Promotional YouTube video URL"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({
      package_name,
      edit_id,
      language,
      title,
      short_description,
      full_description,
      video,
    }: {
      package_name: string;
      edit_id: string;
      language: string;
      title: string;
      short_description: string;
      full_description: string;
      video?: string;
    }) => {
      try {
        const listing = await api.updateListing(package_name, edit_id, language, {
          title,
          shortDescription: short_description,
          fullDescription: full_description,
          ...(video ? { video } : {}),
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Listing updated for ${language}.\n${formatListing(listing)}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── Patch (partial update) a listing ────────────────────────────────
  server.registerTool(
    "google_play_patch_listing",
    {
      title: "Patch Listing",
      description:
        "Partially update a localized store listing. Only the fields you provide " +
        "will be changed; others remain untouched.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - edit_id (string): Edit ID\n" +
        "  - language (string): BCP-47 language tag\n" +
        "  - title (string, optional): App title (max 30 chars)\n" +
        "  - short_description (string, optional): Short description (max 80 chars)\n" +
        "  - full_description (string, optional): Full description (max 4000 chars)\n" +
        "  - video (string, optional): YouTube promo video URL\n\n" +
        "Returns: the updated listing object.",
      inputSchema: {
        package_name: PackageName,
        edit_id: EditId,
        language: Language,
        title: z.string().min(1).max(30).optional().describe("App title (max 30 characters)"),
        short_description: z
          .string()
          .min(1)
          .max(80)
          .optional()
          .describe("Short description (max 80 characters)"),
        full_description: z
          .string()
          .min(1)
          .max(4000)
          .optional()
          .describe("Full description (max 4000 characters)"),
        video: z
          .string()
          .url()
          .optional()
          .describe("Promotional YouTube video URL"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({
      package_name,
      edit_id,
      language,
      title,
      short_description,
      full_description,
      video,
    }: {
      package_name: string;
      edit_id: string;
      language: string;
      title?: string;
      short_description?: string;
      full_description?: string;
      video?: string;
    }) => {
      try {
        const patch: Record<string, string> = {};
        if (title !== undefined) patch.title = title;
        if (short_description !== undefined)
          patch.shortDescription = short_description;
        if (full_description !== undefined)
          patch.fullDescription = full_description;
        if (video !== undefined) patch.video = video;

        if (Object.keys(patch).length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No fields provided to patch. Supply at least one of: title, short_description, full_description, video.",
              },
            ],
            isError: true,
          };
        }

        const listing = await api.patchListing(
          package_name,
          edit_id,
          language,
          patch
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Listing patched for ${language}.\n${formatListing(listing)}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── Delete a single listing ─────────────────────────────────────────
  server.registerTool(
    "google_play_delete_listing",
    {
      title: "Delete Listing",
      description:
        "Delete a single localized store listing for a given language.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - edit_id (string): Edit ID\n" +
        "  - language (string): BCP-47 language tag\n\n" +
        "Returns: confirmation message.",
      inputSchema: {
        package_name: PackageName,
        edit_id: EditId,
        language: Language,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({
      package_name,
      edit_id,
      language,
    }: {
      package_name: string;
      edit_id: string;
      language: string;
    }) => {
      try {
        await api.deleteListing(package_name, edit_id, language);
        return {
          content: [
            {
              type: "text" as const,
              text: `Listing for language '${language}' deleted.`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── Delete all listings ─────────────────────────────────────────────
  server.registerTool(
    "google_play_delete_all_listings",
    {
      title: "Delete All Listings",
      description:
        "Delete ALL localized store listings for an app within an edit. " +
        "This is destructive and cannot be undone within the same edit.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - edit_id (string): Edit ID\n\n" +
        "Returns: confirmation message.",
      inputSchema: {
        package_name: PackageName,
        edit_id: EditId,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ package_name, edit_id }: { package_name: string; edit_id: string }) => {
      try {
        await api.deleteAllListings(package_name, edit_id);
        return {
          content: [
            {
              type: "text" as const,
              text: "All listings deleted for this edit.",
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );
}

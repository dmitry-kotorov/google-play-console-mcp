import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../services/google-play-api.js";
import type { Review, Timestamp } from "../types.js";
import { handleError } from "./edits.js";
import { CHARACTER_LIMIT } from "../constants.js";

// ── Shared schemas ──────────────────────────────────────────────────────

const PackageName = z
  .string()
  .min(1)
  .describe("Android package name, e.g. com.example.myapp");

// ── Helpers ─────────────────────────────────────────────────────────────

function tsToISO(ts: Timestamp | undefined): string {
  if (!ts) return "unknown";
  return new Date(Number(ts.seconds) * 1000).toISOString();
}

function formatReview(r: Review): string {
  const user = r.comments?.[0]?.userComment;
  const dev = r.comments?.[1]?.developerComment ?? r.comments?.[0]?.developerComment;

  const lines: string[] = [
    `## ${r.authorName || "Anonymous"} — ${"★".repeat(user?.starRating ?? 0)}${"☆".repeat(5 - (user?.starRating ?? 0))}`,
    `**Review ID**: ${r.reviewId}`,
  ];

  if (user) {
    lines.push(`**Date**: ${tsToISO(user.lastModified)}`);
    if (user.appVersionName) lines.push(`**App version**: ${user.appVersionName}`);
    if (user.device) lines.push(`**Device**: ${user.device}`);
    if (user.reviewerLanguage) lines.push(`**Language**: ${user.reviewerLanguage}`);
    lines.push("", user.text);
    if (user.originalText && user.originalText !== user.text) {
      lines.push("", `*Original*: ${user.originalText}`);
    }
  }

  if (dev) {
    lines.push("", `**Developer reply** (${tsToISO(dev.lastModified)}):`, dev.text);
  }

  return lines.join("\n");
}

// ── Tool registration ──────────────────────────────────────────────────

export function registerReviewTools(server: McpServer): void {
  // ── List reviews ────────────────────────────────────────────────────
  server.registerTool(
    "google_play_list_reviews",
    {
      title: "List Reviews",
      description:
        "List user reviews for an app. Reviews are NOT part of edits — " +
        "you do not need an edit session to read or reply to reviews.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - translation_language (string, optional): BCP-47 tag to translate reviews into\n" +
        "  - max_results (number, optional): Max reviews to return (default 20, max 100)\n" +
        "  - start_index (number, optional): Offset for pagination\n" +
        "  - token (string, optional): Pagination token from a previous response\n\n" +
        "Returns: list of reviews with author, rating, text, device info, and any developer reply.",
      inputSchema: {
        package_name: PackageName,
        translation_language: z
          .string()
          .optional()
          .describe("BCP-47 language tag to translate reviews into, e.g. en-US"),
        max_results: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .optional()
          .describe("Maximum number of reviews to return (default 20)"),
        start_index: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Offset for pagination"),
        token: z
          .string()
          .optional()
          .describe("Pagination token from a previous list_reviews response"),
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
      translation_language,
      max_results,
      start_index,
      token,
    }: {
      package_name: string;
      translation_language?: string;
      max_results?: number;
      start_index?: number;
      token?: string;
    }) => {
      try {
        const resp = await api.listReviews(package_name, {
          translationLanguage: translation_language,
          maxResults: max_results,
          startIndex: start_index,
          token,
        });

        const reviews = resp.reviews ?? [];
        if (reviews.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No reviews found." }],
          };
        }

        const header = resp.pageInfo
          ? `Showing ${reviews.length} of ${resp.pageInfo.totalResults} reviews\n\n`
          : `Found ${reviews.length} review(s)\n\n`;

        let text = header + reviews.map(formatReview).join("\n\n---\n\n");

        if (resp.tokenPagination?.nextPageToken) {
          text += `\n\n---\n**Next page token**: \`${resp.tokenPagination.nextPageToken}\``;
        }

        if (text.length > CHARACTER_LIMIT) {
          text = text.slice(0, CHARACTER_LIMIT) +
            "\n\n...(truncated — use max_results or pagination to see more)";
        }

        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── Get a single review ─────────────────────────────────────────────
  server.registerTool(
    "google_play_get_review",
    {
      title: "Get Review",
      description:
        "Retrieve a single review by its ID.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - review_id (string): Review ID\n" +
        "  - translation_language (string, optional): BCP-47 tag to translate the review into\n\n" +
        "Returns: review with author, rating, text, device info, and any developer reply.",
      inputSchema: {
        package_name: PackageName,
        review_id: z.string().min(1).describe("Review ID"),
        translation_language: z
          .string()
          .optional()
          .describe("BCP-47 language tag to translate the review into"),
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
      review_id,
      translation_language,
    }: {
      package_name: string;
      review_id: string;
      translation_language?: string;
    }) => {
      try {
        const review = await api.getReview(
          package_name,
          review_id,
          translation_language
        );
        return {
          content: [{ type: "text" as const, text: formatReview(review) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── Reply to a review ───────────────────────────────────────────────
  server.registerTool(
    "google_play_reply_to_review",
    {
      title: "Reply to Review",
      description:
        "Post or update a developer reply to a user review. If a reply already " +
        "exists it will be replaced.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - review_id (string): Review ID\n" +
        "  - reply_text (string): The reply text (max 350 chars recommended by Google)\n\n" +
        "Returns: the saved reply with timestamp.",
      inputSchema: {
        package_name: PackageName,
        review_id: z.string().min(1).describe("Review ID"),
        reply_text: z
          .string()
          .min(1)
          .max(350)
          .describe("Developer reply text (max 350 characters recommended)"),
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
      review_id,
      reply_text,
    }: {
      package_name: string;
      review_id: string;
      reply_text: string;
    }) => {
      try {
        const resp = await api.replyToReview(package_name, review_id, reply_text);
        const result = resp.result;
        return {
          content: [
            {
              type: "text" as const,
              text:
                `Reply posted at ${tsToISO(result.lastEdited)}:\n\n` +
                result.replyText,
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

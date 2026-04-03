import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../services/google-play-api.js";

/** Shared schema fragment for packageName. */
const PackageName = z
  .string()
  .min(1)
  .describe("Android package name, e.g. com.example.myapp");

/** Shared schema fragment for editId. */
const EditId = z
  .string()
  .min(1)
  .describe("Edit ID returned by google_play_insert_edit");

function formatEdit(edit: { id: string; expiryTimeSeconds: string }): string {
  const expiry = new Date(Number(edit.expiryTimeSeconds) * 1000);
  return JSON.stringify(
    { editId: edit.id, expiresAt: expiry.toISOString() },
    null,
    2
  );
}

export function registerEditTools(server: McpServer): void {
  // ── Insert (create) an edit ──────────────────────────────────────────
  server.registerTool(
    "google_play_insert_edit",
    {
      title: "Create Edit",
      description:
        "Open a new edit session for an app. All listing changes must happen " +
        "inside an edit. Returns an editId you pass to subsequent tools. " +
        "Remember to commit the edit when you are done making changes.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n\n" +
        "Returns: { editId, expiresAt }",
      inputSchema: {
        package_name: PackageName,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ package_name }: { package_name: string }) => {
      try {
        const edit = await api.insertEdit(package_name);
        return {
          content: [{ type: "text" as const, text: formatEdit(edit) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── Get an existing edit ────────────────────────────────────────────
  server.registerTool(
    "google_play_get_edit",
    {
      title: "Get Edit",
      description:
        "Retrieve an existing edit session to check whether it is still valid.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - edit_id (string): Edit ID\n\n" +
        "Returns: { editId, expiresAt }",
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
        const edit = await api.getEdit(package_name, edit_id);
        return {
          content: [{ type: "text" as const, text: formatEdit(edit) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: handleError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── Validate an edit ────────────────────────────────────────────────
  server.registerTool(
    "google_play_validate_edit",
    {
      title: "Validate Edit",
      description:
        "Validate an edit without committing it. Useful for checking that all " +
        "required fields are present before committing.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - edit_id (string): Edit ID\n\n" +
        "Returns: { editId, expiresAt } on success, or validation errors.",
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
        const edit = await api.validateEdit(package_name, edit_id);
        return {
          content: [
            {
              type: "text" as const,
              text: `Validation passed.\n${formatEdit(edit)}`,
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

  // ── Commit an edit ──────────────────────────────────────────────────
  server.registerTool(
    "google_play_commit_edit",
    {
      title: "Commit Edit",
      description:
        "Commit all changes made within an edit session. This publishes the " +
        "changes to Google Play. The edit cannot be reused after committing.\n\n" +
        "Args:\n" +
        "  - package_name (string): Android package name\n" +
        "  - edit_id (string): Edit ID\n\n" +
        "Returns: { editId, expiresAt } on success.",
      inputSchema: {
        package_name: PackageName,
        edit_id: EditId,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ package_name, edit_id }: { package_name: string; edit_id: string }) => {
      try {
        const edit = await api.commitEdit(package_name, edit_id);
        return {
          content: [
            {
              type: "text" as const,
              text: `Edit committed successfully.\n${formatEdit(edit)}`,
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

  // ── Delete (discard) an edit ────────────────────────────────────────
  server.registerTool(
    "google_play_delete_edit",
    {
      title: "Delete Edit",
      description:
        "Discard an edit session and all uncommitted changes within it.\n\n" +
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
        await api.deleteEdit(package_name, edit_id);
        return {
          content: [
            { type: "text" as const, text: `Edit ${edit_id} deleted.` },
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

// ── Shared error formatter ──────────────────────────────────────────────

function handleError(err: unknown): string {
  if (err instanceof Error) {
    // google-auth-library wraps HTTP errors with response data
    const anyErr = err as unknown as Record<string, unknown>;
    if (anyErr.response && typeof anyErr.response === "object") {
      const resp = anyErr.response as Record<string, unknown>;
      const status = resp.status ?? "unknown";
      const data = resp.data ? JSON.stringify(resp.data, null, 2) : "";
      return `Google Play API error (HTTP ${status}):\n${data}`;
    }
    return `Error: ${err.message}`;
  }
  return `Error: ${String(err)}`;
}

export { handleError };

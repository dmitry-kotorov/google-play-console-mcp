# Google Play Console MCP Server

MCP server for managing Google Play store listings and their localizations via the [Google Play Developer API v3](https://developers.google.com/android-publisher).

## Prerequisites

1. **Google Cloud project** with the Google Play Developer API enabled.
2. **Service account** with access to your Google Play Console (see [Getting Started](https://developers.google.com/android-publisher/getting_started)).
3. Download the service account JSON key file.

## Setup

```bash
npm install
npm run build
```

Set the path to your key file:

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/service-account.json
```

(The standard `GOOGLE_APPLICATION_CREDENTIALS` env var also works.)

## Claude Desktop configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-play-console": {
      "command": "node",
      "args": ["/absolute/path/to/google-play-console-mcp/dist/index.js"],
      "env": {
        "GOOGLE_SERVICE_ACCOUNT_KEY_FILE": "/path/to/service-account.json"
      }
    }
  }
}
```

## Available tools

### Edit management

All listing changes happen inside an **edit session** (transactional model). You create an edit, make changes, then commit.

| Tool | Description |
|------|-------------|
| `google_play_insert_edit` | Open a new edit session |
| `google_play_get_edit` | Check if an edit is still valid |
| `google_play_validate_edit` | Validate without committing |
| `google_play_commit_edit` | Publish all changes |
| `google_play_delete_edit` | Discard an edit |

### Store listings

Manage localized store listings within an edit session.

| Tool | Description |
|------|-------------|
| `google_play_list_listings` | List all localized listings |
| `google_play_get_listing` | Get a listing by language |
| `google_play_update_listing` | Create or fully replace a listing |
| `google_play_patch_listing` | Partially update specific fields |
| `google_play_delete_listing` | Delete a single listing |
| `google_play_delete_all_listings` | Delete all listings |

## Typical workflow

1. Create an edit: `google_play_insert_edit`
2. Read current listings: `google_play_list_listings`
3. Update/create listings: `google_play_update_listing` or `google_play_patch_listing`
4. Validate: `google_play_validate_edit`
5. Commit: `google_play_commit_edit`

## Development

```bash
npm run dev    # auto-reload with tsx
npm run build  # compile TypeScript
npm start      # run compiled server
```

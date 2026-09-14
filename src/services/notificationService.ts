import { blocksClient } from "@/lib/blocks/client";
import type { Notification } from "@/types";

const PAGE_SIZE = 50;

/**
 * Parse one Blocks notifier item into the app's Notification shape.
 *
 * The wire shape is loose `Record<string, unknown>` per the SDK contract
 * (skill: blocks-notifier). UI metadata (title, description, type, href)
 * is sent via `denormalizedPayload` as a JSON string; `id`, `createdTime`,
 * and `isRead` are first-class fields on the envelope.
 */
function fromBlocksItem(raw: Record<string, unknown>): Notification | null {
  const id = raw.id;
  if (typeof id !== "string" || id.length === 0) return null;

  let title = "";
  let body = "";
  let href: string | undefined;
  let type: Notification["type"] = "info";

  const dp = raw.denormalizedPayload;
  if (typeof dp === "string" && dp.trim().startsWith("{")) {
    try {
      const obj = JSON.parse(dp) as Record<string, unknown>;
      if (typeof obj.title === "string") title = obj.title;
      if (typeof obj.description === "string") body = obj.description;
      if (typeof obj.href === "string") href = obj.href;
      const t = obj.type;
      if (t === "warning" || t === "info" || t === "success" || t === "danger") {
        type = t;
      }
    } catch {
      /* malformed denormalizedPayload — leave fields at defaults */
    }
  }

  return {
    id,
    title,
    body,
    type,
    href,
    read: raw.isRead === true,
    at: typeof raw.createdTime === "string"
      ? raw.createdTime
      : new Date().toISOString(),
  };
}

export const notificationService = {
  async list(): Promise<Notification[]> {
    try {
      const res = await blocksClient.notifier.getNotifications({
        pageSize: PAGE_SIZE,
      });
      return res.notifications
        .map(fromBlocksItem)
        .filter((n): n is Notification => n !== null)
        .sort(
          (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
        );
    } catch {
      return [];
    }
  },

  async unread(): Promise<Notification[]> {
    const all = await this.list();
    return all.filter((n) => !n.read);
  },

  async markRead(id: string): Promise<void> {
    try {
      await blocksClient.notifier.markNotificationAsRead({ id });
    } catch {
      /* silent — UI will re-list and reflect truth */
    }
  },

  async markAllRead(): Promise<void> {
    try {
      await blocksClient.notifier.markAllNotificationAsRead();
    } catch {
      /* silent */
    }
  },

  /**
   * Best-effort client-originated push. Real notification triggers
   * (case reassigned, follow-up overdue, etc.) live server-side and call
   * `blocks notifier notify` directly. This is kept for symmetry with
   * the prior API and as a hook for future client tools (e.g. a
   * coordinator broadcasting to their team). Requires the caller to
   * supply at least one of `userIds`/`roles` — without a target the
   * server will reject the request, so we leave it to the caller.
   *
   * The shape on the wire is `denormalizedPayload` JSON with
   * `title`/`description`/`type`/`href` — same fields `fromBlocksItem`
   * reads back. Senders can omit any field.
   */
  async push(
    n: Omit<Notification, "id" | "at" | "read">,
    target: { userIds?: string[]; roles?: string[] },
  ): Promise<void> {
    const denormalizedPayload = JSON.stringify({
      title: n.title,
      description: n.body,
      type: n.type,
      href: n.href,
    });
    try {
      await blocksClient.notifier.notify({
        userIds: target.userIds ?? [],
        roles: target.roles ?? [],
        denormalizedPayload,
        saveDenormalizedPayloadAsAnObject: true,
      });
    } catch {
      /* silent */
    }
  },
};

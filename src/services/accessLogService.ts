// Access-log service backed by the AccessLog runtime schema.
//
// Audit entries are written by every privileged action (case edits, donor
// report exports, officer transfers, etc). Pages call `accessLogService.log()`
// after a mutation; reads come straight from the runtime list query.

import {
  accessLogsCollection,
  unwrapList,
  unwrapMutation,
} from "@/services/blocksData";
import type { AccessLog, Role } from "@/types";

interface RawAccessLog {
  ItemId: string;
  user?: string;
  userRole?: string;
  action?: string;
  resource?: string;
  reason?: string;
  timestamp?: string;
  CreatedDate?: string;
}

function decode(row: RawAccessLog): AccessLog {
  return {
    id: row.ItemId,
    user: row.user ?? "Unknown",
    userRole: (row.userRole ?? "field_officer") as Role,
    action: row.action ?? "",
    resource: row.resource ?? "",
    reason: row.reason,
    at: row.timestamp ?? row.CreatedDate ?? new Date().toISOString(),
  };
}

export const accessLogService = {
  async list(): Promise<AccessLog[]> {
    const res = await accessLogsCollection.list({ pageNo: 1, pageSize: 200 });
    const { items } = unwrapList<RawAccessLog>("AccessLog", res);
    return items
      .map(decode)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  },

  async log(entry: {
    user: string;
    userRole: Role;
    action: string;
    resource: string;
    reason?: string;
  }): Promise<AccessLog> {
    const res = await accessLogsCollection.create({
      user: entry.user,
      userRole: entry.userRole,
      action: entry.action,
      resource: entry.resource,
      reason: entry.reason ?? "",
      timestamp: new Date().toISOString(),
    });
    const result = unwrapMutation("AccessLog", res);
    return {
      id: result.itemId ?? `log-${Date.now()}`,
      user: entry.user,
      userRole: entry.userRole,
      action: entry.action,
      resource: entry.resource,
      reason: entry.reason,
      at: new Date().toISOString(),
    };
  },
};

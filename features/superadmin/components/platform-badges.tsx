import { Badge } from "@/components/ui/badge";
import {
  ACCESS_STATE_LABELS,
  BILLING_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  billingVariant,
  membershipVariant,
  type AccessState,
} from "../constants";
import type { BillingStatus, MembershipStatus } from "@/types/database";

export function BillingBadge({ status }: { status: BillingStatus }) {
  return <Badge variant={billingVariant(status)}>{BILLING_STATUS_LABELS[status]}</Badge>;
}

export function MembershipBadge({ status }: { status: MembershipStatus }) {
  return (
    <Badge variant={membershipVariant(status)}>{MEMBERSHIP_STATUS_LABELS[status]}</Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "muted"}>
      {active ? "Activa" : "Inactiva"}
    </Badge>
  );
}

export function AccessBadge({
  canAccess,
  membershipStatus,
  accessState,
}: {
  canAccess: boolean;
  membershipStatus?: MembershipStatus;
  accessState?: AccessState;
}) {
  const state: AccessState =
    accessState ??
    (!canAccess
      ? "suspended"
      : membershipStatus === "past_due"
        ? "past_due"
        : "active");
  const variant =
    state === "suspended"
      ? "destructive"
      : state === "past_due"
        ? "warning"
        : state === "expired"
          ? "muted"
          : "success";
  return <Badge variant={variant}>{ACCESS_STATE_LABELS[state]}</Badge>;
}

export function AdminBadge() {
  return <Badge variant="info">Superadmin</Badge>;
}

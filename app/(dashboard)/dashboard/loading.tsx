import { PageSkeleton } from "@/components/dashboard/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={4} rows={4} />;
}

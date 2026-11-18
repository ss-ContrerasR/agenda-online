import { PageSkeleton } from "@/components/dashboard/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={3} rows={7} />;
}

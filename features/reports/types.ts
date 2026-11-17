import type { AppointmentStatus } from "@/types/database";

export type ReportRow = {
  id: string;
  date: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  client: string;
  service: string;
  employee: string;
  price: number;
  source: string;
};

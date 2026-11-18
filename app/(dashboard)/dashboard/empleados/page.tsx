import type { Metadata } from "next";
import { ShieldCheck, UserRound, UserRoundPlus, UsersRound } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import {
  getEmployeeCandidates,
  getEmployeesData,
} from "@/features/employees/queries";
import {
  DeleteEmployeeButton,
  EditEmployeeButton,
  EmployeeFormDialog,
  RestoreEmployeeButton,
} from "@/features/employees/components/employee-form";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Equipo" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("employees:read");
  const params = await searchParams;
  const search = Array.isArray(params.q) ? params.q[0] : params.q;

  const supabase = await createSupabaseServerClient();
  const { employees, services, links } = await getEmployeesData(
    supabase,
    session.membership.organization_id,
    search,
  );

  const canWrite = can(session.membership.role, "employees:write");
  const candidates = canWrite
    ? await getEmployeeCandidates(
        supabase,
        session.membership.organization_id,
      )
    : [];
  const serviceName = new Map(services.map((service) => [service.id, service.name]));
  const linksByEmployee = new Map<string, string[]>();
  for (const link of links) {
    const list = linksByEmployee.get(link.employee_id) ?? [];
    list.push(link.service_id);
    linksByEmployee.set(link.employee_id, list);
  }
  const activeCount = employees.filter(
    (employee) => employee.is_active && !employee.deleted_at,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipo"
        description="Agrega personal a partir de las cuentas con rol Empleado y define qué servicios puede atender cada profesional."
        actions={
          canWrite ? (
            <EmployeeFormDialog candidates={candidates} services={services} />
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Profesionales" value={employees.length} icon={UsersRound} />
        <StatCard label="Activos" value={activeCount} icon={UserRound} />
        <StatCard
          label="Cuentas por agregar"
          value={candidates.length}
          icon={UserRoundPlus}
          hint="Con rol Empleado, sin ficha"
        />
        <StatCard
          label="Con acceso al panel"
          value={employees.filter((employee) => employee.user_id && !employee.deleted_at).length}
          icon={ShieldCheck}
          hint="Vinculados a una cuenta"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Buscar por nombre, correo o cargo…" />
        <p className="text-sm text-muted-foreground">
          {employees.length} profesional{employees.length === 1 ? "" : "es"}
        </p>
      </div>

      {employees.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Todavía no hay profesionales"
          description="Agrega a tu equipo para poder asignarles servicios y citas."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profesional</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead>Servicios</TableHead>
                  <TableHead>Estado</TableHead>
                  {canWrite ? <TableHead className="text-right">Acciones</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const employeeServices = linksByEmployee.get(employee.id) ?? [];
                  const deleted = Boolean(employee.deleted_at);
                  return (
                    <TableRow key={employee.id} className={deleted ? "opacity-60" : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            {employee.photo_url ? (
                              <AvatarImage src={employee.photo_url} alt={employee.full_name} />
                            ) : null}
                            <AvatarFallback
                              style={{ backgroundColor: employee.color, color: "#ffffff" }}
                            >
                              {initials(employee.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {employee.full_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {employee.position ?? "Sin cargo"}
                            </p>
                            <Badge
                              variant={employee.user_id ? "success" : "outline"}
                              className="mt-1 font-normal"
                            >
                              {employee.user_id ? "Con acceso" : "Sin cuenta"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs">{employee.email ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {employee.phone ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-52 flex-wrap gap-1">
                          {employee.specialties.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            employee.specialties.slice(0, 3).map((specialty) => (
                              <Badge key={specialty} variant="outline" className="font-normal">
                                {specialty}
                              </Badge>
                            ))
                          )}
                          {employee.specialties.length > 3 ? (
                            <Badge variant="muted">+{employee.specialties.length - 3}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-52 flex-wrap gap-1">
                          {employeeServices.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin asignar</span>
                          ) : (
                            employeeServices.slice(0, 3).map((serviceId) => (
                              <Badge key={serviceId} variant="secondary" className="font-normal">
                                {serviceName.get(serviceId) ?? "Servicio"}
                              </Badge>
                            ))
                          )}
                          {employeeServices.length > 3 ? (
                            <Badge variant="muted">+{employeeServices.length - 3}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {deleted ? (
                          <Badge variant="muted">Eliminado</Badge>
                        ) : employee.is_active ? (
                          <Badge variant="success">Activo</Badge>
                        ) : (
                          <Badge variant="warning">Inactivo</Badge>
                        )}
                      </TableCell>
                      {canWrite ? (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {deleted ? (
                              <RestoreEmployeeButton employeeId={employee.id} />
                            ) : (
                              <>
                                <EditEmployeeButton
                                  employee={employee}
                                  services={services}
                                  selectedServiceIds={employeeServices}
                                />
                                <DeleteEmployeeButton employeeId={employee.id} />
                              </>
                            )}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

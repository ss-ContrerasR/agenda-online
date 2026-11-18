import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AddMemberDialog } from "./members-manager";

const mocks = vi.hoisted(() => ({
  addMemberByEmailAction: vi.fn(),
  createUserAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/members/actions", () => ({
  addMemberByEmailAction: mocks.addMemberByEmailAction,
  createUserAction: mocks.createUserAction,
  removeMemberAction: vi.fn(),
  setMemberActiveAction: vi.fn(),
  updateMemberRoleAction: vi.fn(),
}));

function renderDialog() {
  return render(
    <TooltipProvider>
      <AddMemberDialog />
    </TooltipProvider>,
  );
}

function field(id: string) {
  // Radix Dialog monta su contenido en un portal, fuera del contenedor de render.
  const element = document.querySelector<HTMLInputElement>(`#${id}`);
  if (!element) throw new Error(`No se encontró el campo #${id}`);
  return element;
}

async function openCreateTab() {
  fireEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));
  const tab = await screen.findByRole("tab", { name: /crear nuevo/i });
  // Radix Tabs activa la pestaña con pointer/mouse down, no solo con click.
  fireEvent.mouseDown(tab, { button: 0 });
  fireEvent.click(tab);
}

function fillCreateForm() {
  fireEvent.change(field("new-user-name"), {
    target: { value: "Andrea López" },
  });
  fireEvent.change(field("new-user-email"), {
    target: { value: "andrea@ejemplo.com" },
  });
}

describe("AddMemberDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createUserAction.mockResolvedValue({ ok: true, message: "Usuario creado" });
    mocks.addMemberByEmailAction.mockResolvedValue({
      ok: true,
      message: "Miembro agregado",
    });
  });

  it("envía el formulario de Crear nuevo con el rol y los datos correctos", async () => {
    renderDialog();
    await openCreateTab();
    fillCreateForm();

    fireEvent.click(screen.getByRole("button", { name: /crear usuario/i }));

    await waitFor(() => {
      expect(mocks.createUserAction).toHaveBeenCalledTimes(1);
    });

    const formData = mocks.createUserAction.mock.calls[0][1] as FormData;
    expect(formData.get("fullName")).toBe("Andrea López");
    expect(formData.get("email")).toBe("andrea@ejemplo.com");
    // El Select de Radix no es un input nativo: comprobamos que el rol viaja.
    expect(formData.get("role")).toBe("receptionist");
    // La ficha del equipo se crea desde Equipo → Agregar personal.
    expect(formData.get("createEmployee")).toBeNull();
    expect(formData.get("position")).toBeNull();
  });

  it("muestra el error del servidor cuando la acción falla", async () => {
    mocks.createUserAction.mockResolvedValue({
      ok: false,
      error: "Revisa SUPABASE_SERVICE_ROLE_KEY en el servidor.",
      fieldErrors: { email: "Este correo ya está registrado." },
    });

    renderDialog();
    await openCreateTab();
    fillCreateForm();
    fireEvent.click(screen.getByRole("button", { name: /crear usuario/i }));

    expect(
      await screen.findByText("Revisa SUPABASE_SERVICE_ROLE_KEY en el servidor."),
    ).toBeInTheDocument();
    expect(screen.getByText("Este correo ya está registrado.")).toBeInTheDocument();
  });

  it("envía el correo y el rol al agregar un usuario existente", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));

    fireEvent.change(field("member-email"), {
      target: { value: "existente@ejemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^agregar$/i }));

    await waitFor(() => {
      expect(mocks.addMemberByEmailAction).toHaveBeenCalledTimes(1);
    });

    const formData = mocks.addMemberByEmailAction.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("existente@ejemplo.com");
    expect(formData.get("role")).toBe("receptionist");
  });
});

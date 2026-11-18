import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationLogoField } from "./organization-logo-field";

const mocks = vi.hoisted(() => ({
  uploadOrganizationLogoAction: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

vi.mock("@/features/appearance/actions", () => ({
  uploadOrganizationLogoAction: mocks.uploadOrganizationLogoAction,
}));

vi.mock("@/components/shared/info-hint", () => ({
  InfoHint: () => null,
}));

describe("OrganizationLogoField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadOrganizationLogoAction.mockResolvedValue({
      ok: true,
      message: "Logo actualizado.",
    });
  });

  it("envía el archivo seleccionado", async () => {
    render(<OrganizationLogoField name="Estudio Aurora" logoUrl={null} />);

    const button = screen.getByRole("button", { name: "Cargar logo" });
    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Archivo del logo de la empresa"]',
    );
    expect(input).not.toBeNull();

    const clickSpy = vi.spyOn(input!, "click").mockImplementation(() => {});
    fireEvent.click(button);
    expect(clickSpy).toHaveBeenCalled();

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.uploadOrganizationLogoAction).toHaveBeenCalledTimes(1);
    });
    const formData = mocks.uploadOrganizationLogoAction.mock.calls[0][0] as FormData;
    expect(formData.get("logo")).toBe(file);
    expect(formData.get("remove_logo")).toBeNull();
  });

  it("muestra el error si la acción falla", async () => {
    mocks.uploadOrganizationLogoAction.mockResolvedValue({
      ok: false,
      error: "El logo no puede superar los 2 MB.",
    });
    render(<OrganizationLogoField name="Estudio Aurora" logoUrl={null} />);

    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Archivo del logo de la empresa"]',
    );
    const file = new File(["logo"], "logo.png", { type: "image/png" });
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith(
        "El logo no puede superar los 2 MB.",
      );
    });
  });

  it("permite quitar el logo cuando ya existe", async () => {
    render(
      <OrganizationLogoField
        name="Estudio Aurora"
        logoUrl="https://ejemplo.com/logo.png"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Quitar logo" }));

    await waitFor(() => {
      expect(mocks.uploadOrganizationLogoAction).toHaveBeenCalledTimes(1);
    });
    const formData = mocks.uploadOrganizationLogoAction.mock.calls[0][0] as FormData;
    expect(formData.get("remove_logo")).toBe("true");
  });
});

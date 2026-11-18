import { describe, expect, it } from "vitest";
import { getActionError } from "./errors";

describe("getActionError", () => {
  it("muestra el mensaje de un error de PostgREST (objeto plano)", () => {
    const postgrestError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "employees_pkey"',
      details: null,
      hint: null,
    };

    expect(getActionError(postgrestError)).toBe(
      "Ya existe una ficha de empleado para ese usuario.",
    );
  });

  it("traduce la violación de clave duplicada del perfil", () => {
    expect(
      getActionError({
        message:
          'duplicate key value violates unique constraint "profiles_pkey"',
      }),
    ).toContain("Ya existe un perfil");
  });

  it("conserva el mensaje original de otros errores de Supabase", () => {
    expect(
      getActionError({ message: 'relation "public.profiles" does not exist' }),
    ).toBe('relation "public.profiles" does not exist');
  });
});

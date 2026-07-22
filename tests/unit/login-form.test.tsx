import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/app/admin/connexion/login-form";

vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const mockedSignIn = vi.mocked(signIn);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function fillAndGetForm() {
  render(<LoginForm destination="/admin" />);
  fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
    target: { value: "admin@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Mot de passe"), {
    target: { value: "secret-password" },
  });
  return screen.getByRole("button", { name: "Se connecter" }).closest("form")!;
}

describe("LoginForm", () => {
  it("locks synchronously when two submit events occur in the same turn", async () => {
    let resolveSignIn!: (value: { ok: boolean }) => void;
    mockedSignIn.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }) as ReturnType<typeof signIn>,
    );
    const form = fillAndGetForm();

    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    expect(mockedSignIn).toHaveBeenCalledTimes(1);

    await act(async () => resolveSignIn({ ok: false }));
  });

  it("releases the lock after failed authentication so the user can retry", async () => {
    mockedSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin", status: 401, url: null });
    const form = fillAndGetForm();

    fireEvent.submit(form);
    await screen.findByRole("alert");
    fireEvent.submit(form);

    await waitFor(() => expect(mockedSignIn).toHaveBeenCalledTimes(2));
  });
});

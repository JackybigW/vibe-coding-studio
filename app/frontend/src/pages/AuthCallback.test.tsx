import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthCallback from "./AuthCallback";

const { mockResetClient } = vi.hoisted(() => ({
  mockResetClient: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  client: { auth: { login: vi.fn() } },
  resetClient: mockResetClient,
}));

describe("AuthCallback", () => {
  beforeEach(() => {
    localStorage.clear();
    mockResetClient.mockReset();
    window.history.replaceState(null, "", "/auth/callback#token=app-token&expires_at=1767225600&token_type=Bearer");
  });

  it("stores fragment token and removes it from the browser URL", async () => {
    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("app-token");
    });

    expect(mockResetClient).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/dashboard");
  });
});

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";

const {
  mockLogin,
  mockLoginWithPassword,
  mockAuthGetProviders,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockLoginWithPassword: vi.fn(),
  mockAuthGetProviders: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithPassword: mockLoginWithPassword,
  }),
}));

vi.mock("@/lib/auth", () => ({
  authApi: {
    getProviders: mockAuthGetProviders,
  },
}));

vi.mock("@/lib/api", () => ({
  client: {
    apiCall: {
      invoke: vi.fn(),
    },
  },
}));

describe("Login", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockLoginWithPassword.mockReset();
    mockAuthGetProviders.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows Google sign-in below the form and calls login when enabled", async () => {
    mockAuthGetProviders.mockResolvedValue({ google: true });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const button = await screen.findByRole("button", { name: /continue with google/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  it("disables Google sign-in and shows a helper note when unavailable", async () => {
    mockAuthGetProviders.mockResolvedValue({ google: false });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const button = await screen.findByRole("button", { name: /continue with google/i });
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    expect(screen.getByText(/google sign-in is not configured in this environment yet/i)).toBeInTheDocument();
  });
});

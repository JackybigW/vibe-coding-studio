import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Register from "./Register";

const { mockLogin, mockAuthGetProviders } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockAuthGetProviders: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
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

describe("Register", () => {
  beforeEach(() => {
    localStorage.clear();
    mockLogin.mockReset();
    mockAuthGetProviders.mockReset();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("places Google sign-in below the registration form", async () => {
    mockAuthGetProviders.mockResolvedValue({ google: true });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole("button", { name: /create account/i });
    const googleButton = await screen.findByRole("button", { name: /continue with google/i });

    expect(submitButton.compareDocumentPosition(googleButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  it("renders registration copy in Chinese when Chinese is selected", async () => {
    localStorage.setItem("atoms.language", "zh");
    mockAuthGetProviders.mockResolvedValue({ google: true });

    render(
      <MemoryRouter>
        <LanguageProvider>
          <Register />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "创建账号" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建账号" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /使用 Google 继续/ })).toBeInTheDocument();
  });
});

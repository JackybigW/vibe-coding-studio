import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./Index";

const mockLogin = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/PricingCard", () => ({
  default: () => <div data-testid="pricing-card" />,
}));

vi.mock("@/lib/api", () => ({
  client: {
    entities: {
      projects: {
        create: vi.fn(),
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("LandingPage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockLogin.mockReset();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      login: mockLogin,
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to register instead of triggering OIDC login", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<div>Register page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /start building free/i }));

    expect(screen.getByText("Register page")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("keeps a separate Google sign-in entry for unauthenticated users", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<div>Register page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^google$/i })).not.toBeInTheDocument();
  });

  it("renders the landing hero in Chinese when Chinese is selected", () => {
    localStorage.setItem("atoms.language", "zh");

    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<div>Register page</div>} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    );

    expect(screen.getByText("把想法变成")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /免费开始构建/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "探索项目" })).toBeInTheDocument();
  });
});

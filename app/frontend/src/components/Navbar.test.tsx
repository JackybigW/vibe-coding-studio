import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Navbar from "./Navbar";

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Navbar", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockNavigate.mockReset();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout: mockLogout,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps only local auth entrypoints in the unauthenticated auth area", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument();
  });

  it("switches navigation labels to Chinese from the top-right language toggle", () => {
    render(
      <LanguageProvider>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /switch language to chinese/i }));

    expect(screen.getByRole("link", { name: "首页" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "探索" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "价格" })).toBeInTheDocument();
  });
});

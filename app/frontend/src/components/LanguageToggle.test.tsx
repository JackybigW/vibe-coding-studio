import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LanguageToggle from "./LanguageToggle";

describe("LanguageToggle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("switches between English and Chinese with one click", async () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>
    );

    expect(screen.getByRole("button", { name: /switch language to chinese/i })).toHaveTextContent("中文");

    fireEvent.click(screen.getByRole("button", { name: /switch language to chinese/i }));

    expect(screen.getByRole("button", { name: /切换语言到英文/i })).toHaveTextContent("English");
  });
});

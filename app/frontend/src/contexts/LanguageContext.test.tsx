import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider, useLanguage } from "./LanguageContext";

function Probe() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <p>{language}</p>
      <p>{t("nav.home")}</p>
      <button onClick={() => setLanguage("zh")}>中文</button>
    </div>
  );
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("defaults to English and persists Chinese when selected", async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );

    expect(screen.getByText("en")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "中文" }));

    expect(screen.getByText("zh")).toBeInTheDocument();
    expect(screen.getByText("首页")).toBeInTheDocument();
    expect(localStorage.getItem("atoms.language")).toBe("zh");
  });

  it("defaults to English even when the browser locale is Chinese", () => {
    Object.defineProperty(window.navigator, "language", {
      value: "zh-CN",
      configurable: true,
    });

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );

    expect(screen.getByText("en")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});

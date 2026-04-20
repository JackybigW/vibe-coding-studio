import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { ThinkingDisclosure } from "./ThinkingDisclosure";


describe("ThinkingDisclosure", () => {
  it("hides thinking by default and expands on click", () => {
    render(<ThinkingDisclosure thinking={"step 1\nstep 2"} />);

    expect(screen.getByText(/step 1\s*step 2/i)).not.toBeVisible();

    fireEvent.click(screen.getByText(/show thinking/i));

    expect(screen.getByText(/step 1\s*step 2/i)).toBeVisible();
  });
});

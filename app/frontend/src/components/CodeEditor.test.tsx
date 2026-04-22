import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const createMock = vi.fn();
const setFilesMock = vi.fn();

vi.mock("@monaco-editor/react", () => ({
  default: () => <div data-testid="monaco-editor" />,
}));

vi.mock("@/lib/api", () => ({
  client: {
    entities: {
      project_files: {
        query: (...args: unknown[]) => queryMock(...args),
        create: (...args: unknown[]) => createMock(...args),
      },
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    files: [],
    setFiles: setFilesMock,
    projectId: 123,
    fileVersion: 0,
  }),
}));

import CodeEditor from "./CodeEditor";

describe("CodeEditor", () => {
  beforeEach(() => {
    queryMock.mockReset();
    createMock.mockReset();
    setFilesMock.mockReset();
  });

  it("does not seed default files when a project has no files", async () => {
    queryMock.mockResolvedValue({
      data: {
        items: [],
      },
    });

    render(<CodeEditor />);

    await waitFor(() => {
      expect(setFilesMock).toHaveBeenCalledWith([]);
    });

    expect(createMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Workspace is empty")).toBeInTheDocument();
  });
});

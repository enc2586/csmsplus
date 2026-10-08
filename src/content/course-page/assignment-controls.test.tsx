// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { installFakeChrome } from "../../test-utils/fake-chrome.ts";
import { AssignmentControls } from "./assignment-controls.tsx";
import { courseStore } from "./store.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AssignmentControls", () => {
  it("keeps the current state and re-enables the button when saving fails", async () => {
    const { local } = installFakeChrome();
    local.set = async () => {
      throw new Error("storage failed");
    };
    const alert = vi.fn();
    vi.stubGlobal("alert", alert);
    courseStore.setState({ excluded: new Set() });

    render(<AssignmentControls id="1" title="과제 1" card={false} />);
    const button = screen.getByRole("button", { name: "과제 1: 추적 제외" });
    fireEvent.click(button);

    await waitFor(() => expect(alert).toHaveBeenCalledOnce());
    expect(button).toHaveProperty("disabled", false);
    expect(button.textContent).toBe("추적 제외");
  });

  it("follows the shared exclusion state", () => {
    courseStore.setState({ excluded: new Set(["1"]) });
    render(<AssignmentControls id="1" title="과제 1" card={false} />);
    expect(screen.getByRole("button").textContent).toBe("다시 추적");
  });
});

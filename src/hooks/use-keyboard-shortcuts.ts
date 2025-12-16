import { useEffect } from "react";

interface ShortcutHandlers {
  onNewChat?: () => void;
  onUpload?: () => void;
  onSearch?: () => void;
}

export function useKeyboardShortcuts({ onNewChat, onUpload, onSearch }: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // Only allow Escape in inputs
        if (e.key !== "Escape") return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === "k") {
        e.preventDefault();
        onSearch?.();
      } else if (isMod && e.key === "n") {
        e.preventDefault();
        onNewChat?.();
      } else if (isMod && e.key === "u") {
        e.preventDefault();
        onUpload?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat, onUpload, onSearch]);
}

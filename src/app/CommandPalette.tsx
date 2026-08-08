import { useEffect, useMemo, useRef, useState } from "react";

export interface AppCommand {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly keywords: readonly string[];
  readonly run: () => void;
}

interface CommandPaletteProps {
  readonly open: boolean;
  readonly commands: readonly AppCommand[];
  readonly onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const filteredCommands = useMemo(() => filterCommands(commands, query), [commands, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  const runCommand = (command: AppCommand) => {
    command.run();
    onClose();
  };

  return (
    <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="全局命令"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onClose();
            }
            if (event.key === "Enter" && filteredCommands[0]) {
              runCommand(filteredCommands[0]);
            }
          }}
          placeholder="搜索页面、素材或操作"
          aria-label="搜索命令"
        />
        <div className="command-palette-list">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command) => (
              <button key={command.id} type="button" onClick={() => runCommand(command)}>
                <span>{command.label}</span>
                <small>{command.hint}</small>
              </button>
            ))
          ) : (
            <div className="command-palette-empty">没有匹配的命令</div>
          )}
        </div>
      </section>
    </div>
  );
}

export function filterCommands(commands: readonly AppCommand[], query: string): readonly AppCommand[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");

  if (!normalizedQuery) {
    return commands;
  }

  return commands.filter((command) =>
    [command.label, command.hint, ...command.keywords]
      .join(" ")
      .toLocaleLowerCase("zh-CN")
      .includes(normalizedQuery),
  );
}

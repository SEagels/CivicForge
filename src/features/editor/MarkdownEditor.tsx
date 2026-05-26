import { defaultValueCtx, Editor, rootCtx } from "@milkdown/core";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { commonmark } from "@milkdown/preset-commonmark";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { nord } from "@milkdown/theme-nord";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import "@milkdown/theme-nord/style.css";
import {
  applyMarkdownCommand,
  getWikiLinkSuggestions,
  getWikiLinkTrigger,
  insertWikiLinkSuggestion,
  type LinkableMaterial,
  type MarkdownCommand,
  type WikiLinkTrigger,
} from "./markdownEditing";

interface MarkdownEditorProps {
  readonly materialId: string;
  readonly value: string;
  readonly linkableMaterials: readonly LinkableMaterial[];
  readonly onChange: (value: string) => void;
}

const TOOLBAR_COMMANDS: readonly { readonly command: MarkdownCommand; readonly label: string; readonly title: string }[] = [
  { command: "bold", label: "B", title: "加粗" },
  { command: "italic", label: "I", title: "斜体" },
  { command: "heading2", label: "H2", title: "二级标题" },
  { command: "quote", label: ">", title: "引用" },
  { command: "wiki", label: "[[", title: "双链" },
];

export function MarkdownEditor({ materialId, value, linkableMaterials, onChange }: MarkdownEditorProps) {
  const [mode, setMode] = useState<"writing" | "source">("writing");
  const [wikiTrigger, setWikiTrigger] = useState<WikiLinkTrigger | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const suggestions = useMemo(
    () => (wikiTrigger ? getWikiLinkSuggestions(linkableMaterials, materialId, wikiTrigger.query).slice(0, 8) : []),
    [linkableMaterials, materialId, wikiTrigger],
  );

  useEffect(() => {
    setWikiTrigger(null);
  }, [materialId, mode]);

  const updateTriggerFromTextarea = (textarea: HTMLTextAreaElement, nextValue = value) => {
    setWikiTrigger(getWikiLinkTrigger(nextValue, textarea.selectionStart));
  };

  const restoreSelection = (selectionStart: number, selectionEnd: number) => {
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const applyCommand = (command: MarkdownCommand) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      setMode("source");
      return;
    }

    const result = applyMarkdownCommand(value, {
      command,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
    });

    onChange(result.value);
    setWikiTrigger(getWikiLinkTrigger(result.value, result.selectionStart));
    restoreSelection(result.selectionStart, result.selectionEnd);
  };

  const insertSuggestion = (title: string) => {
    if (!wikiTrigger) {
      return;
    }

    const result = insertWikiLinkSuggestion(value, { title, trigger: wikiTrigger });
    onChange(result.value);
    setWikiTrigger(null);
    restoreSelection(result.selectionStart, result.selectionEnd);
  };

  const handleSourceKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const command = getKeyboardCommand(event);

    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "s") {
      event.preventDefault();
      return;
    }

    if (command) {
      event.preventDefault();
      applyCommand(command);
      return;
    }

    if (event.key === "Enter" && suggestions[0]) {
      event.preventDefault();
      insertSuggestion(suggestions[0].title);
      return;
    }

    if (event.key === "Escape") {
      setWikiTrigger(null);
    }
  };

  return (
    <div className="markdown-editor">
      <div className="editor-toolbar" aria-label="Markdown 编辑工具">
        <div className="editor-mode-toggle" aria-label="编辑模式">
          <button type="button" className={mode === "writing" ? "active" : ""} onClick={() => setMode("writing")}>
            写作
          </button>
          <button type="button" className={mode === "source" ? "active" : ""} onClick={() => setMode("source")}>
            源码
          </button>
        </div>
        <div className="editor-format-buttons">
          {TOOLBAR_COMMANDS.map((item) => (
            <button
              key={item.command}
              type="button"
              className="editor-format-button"
              title={item.title}
              onClick={() => applyCommand(item.command)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "writing" ? (
        <MilkdownProvider>
          <MilkdownEditor key={materialId} value={value} onChange={onChange} />
        </MilkdownProvider>
      ) : (
        <label className="source-editor">
          <span>Markdown</span>
          <div className="source-editor-frame">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
                updateTriggerFromTextarea(event.currentTarget, event.target.value);
              }}
              onClick={(event) => updateTriggerFromTextarea(event.currentTarget)}
              onKeyDown={handleSourceKeyDown}
              onKeyUp={(event) => updateTriggerFromTextarea(event.currentTarget)}
              onSelect={(event) => updateTriggerFromTextarea(event.currentTarget)}
              placeholder="写下案例、规范表达、分论点或文章框架..."
            />
            {suggestions.length > 0 ? (
              <div className="wiki-suggestions" role="listbox" aria-label="双链素材建议">
                {suggestions.map((material) => (
                  <button
                    key={material.id}
                    type="button"
                    role="option"
                    className="wiki-suggestion"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertSuggestion(material.title)}
                  >
                    {material.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </label>
      )}
    </div>
  );
}

function MilkdownEditor({
  value,
  onChange,
}: Pick<MarkdownEditorProps, "value" | "onChange">) {
  useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, value || " ");
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            onChange(markdown);
          });
          nord(ctx);
        })
        .use(commonmark)
        .use(listener),
    [value, onChange],
  );

  return <Milkdown />;
}

function getKeyboardCommand(event: KeyboardEvent<HTMLTextAreaElement>): MarkdownCommand | null {
  if (!event.ctrlKey && !event.metaKey) {
    return null;
  }

  const key = event.key.toLocaleLowerCase();

  if (key === "b") {
    return "bold";
  }

  if (key === "i") {
    return "italic";
  }

  if (key === "k") {
    return "wiki";
  }

  return null;
}

import { defaultValueCtx, Editor, rootCtx } from "@milkdown/core";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { commonmark } from "@milkdown/preset-commonmark";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { nord } from "@milkdown/theme-nord";
import "@milkdown/theme-nord/style.css";

interface MarkdownEditorProps {
  readonly materialId: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function MarkdownEditor({ materialId, value, onChange }: MarkdownEditorProps) {
  return (
    <div className="markdown-editor">
      <MilkdownProvider>
        <MilkdownEditor key={materialId} value={value} onChange={onChange} />
      </MilkdownProvider>
      <label className="source-editor">
        <span>Markdown</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="写下案例、规范表达、分论点或文章框架..."
        />
      </label>
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

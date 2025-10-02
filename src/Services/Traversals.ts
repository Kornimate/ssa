import { IBasicBlock } from "../Models/IBasicBlock";
import { ICFG } from "../Models/ICfg";
import * as t from '@babel/types';

/** Converts a CFG into a plain JSON-like object */
export function cfgToObject(cfg: ICFG) {
  const visited = new Set<IBasicBlock>();
  const blocks: any[] = [];

  function visit(block: IBasicBlock | null) {
    if (!block || visited.has(block)) return;
    visited.add(block);

    blocks.push({
      name: block.name,
      statements: block.statements.map((s: t.Statement) => s.type),
      expressions: block.expressions.map((e: t.Expression) => e.type),
      exits: {
        successExit: block.successExit?.name ?? null,
        falseExit: block.falseExit?.name ?? null,
        exceptionExit: block.exceptionExit?.name ?? null,
      },
    });

    // Recurse on exits
    visit(block.successExit ?? null);
    visit(block.falseExit ?? null);
    visit(block.exceptionExit ?? null);
  }

  visit(cfg.entry);

  return {
    entry: cfg.entry.name,
    exit: cfg.exit.name,
    blocks,
  };
}

/** Converts a CFG into DOT format for Graphviz */
export function cfgToDot(cfg: ICFG): string {
  let dot = "digraph CFG {\n";
  const visited = new Set<IBasicBlock>();

  function visit(block: IBasicBlock | null) {
    if (!block || visited.has(block)) return;
    visited.add(block);

    const label = block.name ?? "unnamed";
    dot += `  "${label}" [label="${label}"];\n`;

    if (block.successExit) {
      dot += `  "${label}" -> "${block.successExit.name ?? "unnamed"}" [label="success"];\n`;
      visit(block.successExit);
    }
    if (block.falseExit) {
      dot += `  "${label}" -> "${block.falseExit.name ?? "unnamed"}" [label="false"];\n`;
      visit(block.falseExit);
    }
    if (block.exceptionExit) {
      dot += `  "${label}" -> "${block.exceptionExit.name ?? "unnamed"}" [label="exception"];\n`;
      visit(block.exceptionExit);
    }
  }

  visit(cfg.entry);
  dot += "}\n";
  return dot;
}
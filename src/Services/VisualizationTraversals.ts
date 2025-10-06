import { IBasicBlock } from "../models/IBasicBlock";
import { ICFG } from "../models/ICfg";
import * as t from "@babel/types";

/** Converts a CFG into a plain JSON-like object */
export function cfgToObject(cfg: ICFG) {
  const visited = new Set<IBasicBlock>();
  const names = new Map<IBasicBlock, string>();
  const blocks: any[] = [];

  function visit(block: IBasicBlock | null) {
    if (!block || visited.has(block)) return;
    visited.add(block);

    blocks.push({
      name: block.name,
      statements: block.statements.map((s: t.Statement) => s.type),
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

    const label = block.name;
    dot += `  "${label}" [label="${label}"];\n`;

    if (block.successExit) {
      dot += `  "${label}" -> "${
        block.successExit.name
      }" [label="${getEdgeLabel(block, true)}"];\n`;
      visit(block.successExit);
    }
    if (block.falseExit) {
      dot += `  "${label}" -> "${block.falseExit.name}" [label="${getEdgeLabel(
        block,
        false
      )}"];\n`;
      visit(block.falseExit);
    }
    if (block.exceptionExit) {
      dot += `  "${label}" -> "${block.exceptionExit.name}" [label="exception"];\n`;
      visit(block.exceptionExit);
    }
  }

  function getEdgeLabel(block: IBasicBlock, isSuccessExit: boolean): string {
    if (block.statements.length === 0) return "";

    if (block.statements[0].type === "IfStatement") {
      return isSuccessExit ? "true" : "false";
    }

    if (block.statements[0].type === "ForStatement") {
      return isSuccessExit ? "true" : "false";
    }

    return "";
  }

  visit(cfg.entry);
  dot += "}\n";
  return dot;
}

export function visualizeCfg(cfg: ICFG) {
  nameBlocksInGraph(cfg);

  return {
    dot: cfgToDot(cfg),
    object: cfgToObject(cfg),
  };
}

function nameBlocksInGraph(cfg: ICFG) {
  let counter = 0;
  const names = new Map<IBasicBlock, string>();

  function visit(node: IBasicBlock | null) {
    if (node === null || names.has(node)) return;

    node.name = getBlockName(node);

    visit(node.successExit ?? null);
    visit(node.falseExit ?? null);
    visit(node.exceptionExit ?? null);
  }

  function getBlockName(block: IBasicBlock): string {
    if (!names.has(block) || block.name !== null) // can be simplified
      names.set(block, block.name === null ? `#${++counter}` : block.name);

    return names.get(block)!;
  }

  visit(cfg.entry);
  console.log();
}

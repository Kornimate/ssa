import { IBasicBlock } from "../models/IBasicBlock";
import { ICFG } from "../models/ICfg";
import * as t from "@babel/types";

/** Converts a CFG into a plain JSON-like object */
export function cfgToObject(cfg: ICFG, names: Map<IBasicBlock, string>) {
  const visited = new Set<IBasicBlock>();
  const blocks: any[] = [];

  function visit(block: IBasicBlock | null) {
    if (!block || visited.has(block)) return;
    visited.add(block);

    blocks.push({
      name: names.get(block),
      statements: block.statements.map((s: t.Statement) => s.type),
      exits: {
        successExit: names.get(block.successExit!) ?? null,
        falseExit: names.get(block.falseExit!) ?? null,
        exceptionExit: names.get(block.exceptionExit!) ?? null,
      },
    });

    // Recurse on exits
    visit(block.successExit ?? null);
    visit(block.falseExit ?? null);
    visit(block.exceptionExit ?? null);
  }

  visit(cfg.entry);

  return {
    entry: names.get(cfg.entry),
    exit: names.get(cfg.exit),
    blocks,
  };
}

/** Converts a CFG into DOT format for Graphviz */
export function cfgToDot(cfg: ICFG, names: Map<IBasicBlock, string>): string {
  let dot = "digraph CFG {\n";
  const visited = new Set<IBasicBlock>();

  function visit(block: IBasicBlock | null) {
    if (!block || visited.has(block)) return;
    visited.add(block);

    const label = names.get(block);
    dot += `  "${label}" [label="${label}"];\n`;

    if (block.successExit) {
      dot += `  "${label}" -> "${
        names.get(block.successExit)
      }" [label="${getEdgeLabel(block, true)}"];\n`;
      visit(block.successExit);
    }
    if (block.falseExit) {
      dot += `  "${label}" -> "${names.get(block.falseExit)}" [label="${getEdgeLabel(
        block,
        false
      )}"];\n`;
      visit(block.falseExit);
    }
    if (block.exceptionExit) {
      dot += `  "${label}" -> "${names.get(block.exceptionExit)}" [label="exception"];\n`;
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
    
    if (block.statements[0].type === "WhileStatement") {
      return isSuccessExit ? "true" : "false";
    }

    return "";
  }

  visit(cfg.entry);
  dot += "}\n";
  return dot;
}

export function visualizeCfg(cfg: ICFG) {
  const names = nameBlocksInGraph(cfg);

  return {
    dot: cfgToDot(cfg, names),
    object: cfgToObject(cfg, names),
  };
}

function nameBlocksInGraph(cfg: ICFG): Map<IBasicBlock, string> {
  let counter = 0;
  const names = new Map<IBasicBlock, string>();

  function visit(node: IBasicBlock | null) {
    if (node === null || names.has(node)) return;

    setBlockName(node);

    visit(node.successExit ?? null);
    visit(node.falseExit ?? null);
    visit(node.exceptionExit ?? null);
  }

  function setBlockName(block: IBasicBlock): string {
    if (!names.has(block)){
      names.set(block, `#${counter++}${getExtraNameLabel(block)}`);
    }

    return names.get(block)!;
  }

  function getExtraNameLabel(block: IBasicBlock): string {
    if (block.statements.length === 0) return "";

    if (block.statements[0].type === "IfStatement") {
      return " IF"
    }

    if (block.statements[0].type === "ForStatement") {
      return " FOR";
    }
    
    if (block.statements[0].type === "WhileStatement") {
      return " WHILE"
    }

    return "";
  }

  visit(cfg.entry);

  names.set(cfg.entry, "entry");
  names.set(cfg.exit, "exit");

  return names;
}

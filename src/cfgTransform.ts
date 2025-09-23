/*
  cfgTransform.ts

  Simple AST -> CFG transformer:
  - Produces a control-flow graph

  Notes:
  - So far handled language constructs:
      Program,
      BlockStatement, 
      IfStatement, 
      WhileStatement, 
      ForStatement,
      Break/Continue,
      Return,
      ExpressionStatement,
      VariableDeclaration,
  - Next to implement: 
      Labelled statements,
      Try/Catch/Finally
*/

import * as t from '@babel/types';
import { BlockId } from './Models/BlockId';
import { BlockKind } from './Models/BlockKind';
import { Block } from './Models/BasicBlock';
import { CFG } from './Models/Cfg';
import { TraversalContext } from './Models/TraversalContext';

function makeEmptyBlock(id: BlockId, kind: BlockKind = 'normal'): Block {
  return { id, kind, stmts: [], succs: [], preds: [] };
}

function initCFG(): CFG {
  const blocks = new Map<BlockId, Block>();
  const entry = 0;
  const exit = 1;
  blocks.set(entry, makeEmptyBlock(entry, 'entry'));
  blocks.set(exit, makeEmptyBlock(exit, 'exit'));
  return { entry, exit, blocks };
}

export function createTraversalContext(): TraversalContext {
  const cfg = initCFG();
  const ctx: Partial<TraversalContext> = {};
  let nextId = 2;

  function createBlock(kind: BlockKind = 'normal') {
    const id = nextId++;
    cfg.blocks.set(id, makeEmptyBlock(id, kind));
    return id;
  }

  function addEdge(from: BlockId, to: BlockId) {
    const bFrom = cfg.blocks.get(from);
    const bTo = cfg.blocks.get(to);
    if (!bFrom || !bTo) throw new Error(`invalid edge ${from} -> ${to}`);
    bFrom.succs.push(to);
    bTo.preds.push(from);
  }

  function addStmt(node: t.Statement) {
    const b = cfg.blocks.get(ctx.cur!);
    if (!b) throw new Error('current block missing');
    b.stmts.push(node);
  }

  function splitCurrent() {
    const newId = createBlock('normal');
    addEdge(ctx.cur!, newId);
    ctx.cur = newId;
    return newId;
  }

  ctx.cfg = cfg;
  ctx.cur = cfg.entry;
  ctx.nextId = nextId;
  ctx.breakTargets = [];
  ctx.continueTargets = [];
  ctx.createBlock = createBlock;
  ctx.addStmt = addStmt;
  ctx.addEdge = addEdge;
  ctx.splitCurrent = splitCurrent;

  return ctx as TraversalContext;
}

export function buildCFG(programNode: t.Program): CFG {
  const ctx = createTraversalContext();

  const first = ctx.createBlock('normal');
  ctx.addEdge(ctx.cfg.entry, first);
  ctx.cur = first;

  for (const stmt of programNode.body || []) {
    visitStatement(stmt, ctx);
  }

  if (!ctx.cfg.blocks.get(ctx.cur!)!.succs.length) {
    ctx.addEdge(ctx.cur!, ctx.cfg.exit);
  }

  return ctx.cfg;
}

function visitStatement(node: t.Statement, ctx: TraversalContext) {
  if (!node) return;

  switch (node.type) {
    case 'BlockStatement':
      for (const s of node.body) visitStatement(s, ctx);
      return;

    case 'ExpressionStatement':
    case 'VariableDeclaration':
      ctx.addStmt(node);
      return;

    case 'IfStatement':
      visitIf(node, ctx);
      return;

    case 'WhileStatement':
      visitWhile(node, ctx);
      return;

    case 'ForStatement':
      visitFor(node, ctx);
      return;

    case 'ReturnStatement':
      ctx.addStmt(node);
      ctx.addEdge(ctx.cur, ctx.cfg.exit);
      const afterRet = ctx.createBlock('normal');
      ctx.cur = afterRet;
      return;

    case 'BreakStatement':
      ctx.addStmt(node);
      if (ctx.breakTargets.length === 0) {
        ctx.addEdge(ctx.cur, ctx.cfg.exit);
      } else {
        const target = ctx.breakTargets[ctx.breakTargets.length - 1].target;
        ctx.addEdge(ctx.cur, target);
      }
      ctx.cur = ctx.createBlock('normal');
      return;

    case 'ContinueStatement':
      ctx.addStmt(node);
      if (ctx.continueTargets.length === 0) {
        ctx.addEdge(ctx.cur, ctx.cfg.exit);
      } else {
        const target = ctx.continueTargets[ctx.continueTargets.length - 1].target;
        ctx.addEdge(ctx.cur, target);
      }
      ctx.cur = ctx.createBlock('normal');
      return;

    case 'FunctionDeclaration':
      ctx.addStmt(node);
      return;

    default:
      ctx.addStmt(node);
  }
}

function visitIf(node: t.IfStatement, ctx: TraversalContext) {
  const condBlock = ctx.createBlock('condition');
  ctx.addEdge(ctx.cur, condBlock);
  const condB = ctx.cfg.blocks.get(condBlock)!;
  condB.condition = node.test;

  const thenBlock = ctx.createBlock('normal');
  ctx.addEdge(condBlock, thenBlock);

  const elseBlock = node.alternate ? ctx.createBlock('normal') : null;
  if (elseBlock) ctx.addEdge(condBlock, elseBlock);

  const after = ctx.createBlock('normal');

  ctx.cur = thenBlock;
  visitStatement(node.consequent as t.Statement, ctx);
  if (!ctx.cfg.blocks.get(ctx.cur)!.succs.length) ctx.addEdge(ctx.cur, after);

  if (elseBlock) {
    ctx.cur = elseBlock;
    visitStatement(node.alternate as t.Statement, ctx);
    if (!ctx.cfg.blocks.get(ctx.cur)!.succs.length) ctx.addEdge(ctx.cur, after);
  } else {
    ctx.addEdge(condBlock, after);
  }

  ctx.cur = after;
}

function visitWhile(node: t.WhileStatement, ctx: TraversalContext) {
  const condBlock = ctx.createBlock('condition');
  ctx.addEdge(ctx.cur, condBlock);
  const bodyBlock = ctx.createBlock('normal');
  const after = ctx.createBlock('normal');

  ctx.cfg.blocks.get(condBlock)!.condition = node.test;
  ctx.addEdge(condBlock, bodyBlock);
  ctx.addEdge(condBlock, after);

  ctx.breakTargets.push({ target: after });
  ctx.continueTargets.push({ target: condBlock });

  ctx.cur = bodyBlock;
  visitStatement(node.body as t.Statement, ctx);
  if (!ctx.cfg.blocks.get(ctx.cur)!.succs.length) ctx.addEdge(ctx.cur, condBlock);

  ctx.breakTargets.pop();
  ctx.continueTargets.pop();

  ctx.cur = after;
}

function visitFor(node: t.ForStatement, ctx: TraversalContext) {
  if (node.init) {
    if (t.isVariableDeclaration(node.init)) ctx.addStmt(node.init);
    else ctx.addStmt(t.expressionStatement(node.init as t.Expression));
  }

  const condBlock = ctx.createBlock('condition');
  ctx.addEdge(ctx.cur, condBlock);
  ctx.cfg.blocks.get(condBlock)!.condition = node.test || t.booleanLiteral(true);

  const bodyBlock = ctx.createBlock('normal');
  const after = ctx.createBlock('normal');
  const updateBlock = node.update ? ctx.createBlock('normal') : condBlock;

  ctx.addEdge(condBlock, bodyBlock);
  ctx.addEdge(condBlock, after);

  ctx.breakTargets.push({ target: after });
  ctx.continueTargets.push({ target: updateBlock });

  ctx.cur = bodyBlock;
  visitStatement(node.body as t.Statement, ctx);
  if (!ctx.cfg.blocks.get(ctx.cur)!.succs.length) {
    if (node.update) ctx.addEdge(ctx.cur, updateBlock);
    else ctx.addEdge(ctx.cur, condBlock);
  }

  if (node.update) {
    ctx.cur = updateBlock;
    ctx.addStmt(t.expressionStatement(node.update as t.Expression));
    ctx.addEdge(updateBlock, condBlock);
  }

  ctx.breakTargets.pop();
  ctx.continueTargets.pop();

  ctx.cur = after;
}

export function cfgToObject(cfg: CFG) {
  const blocks: any[] = [];
  for (const [, b] of cfg.blocks) {
    blocks.push({ id: b.id, kind: b.kind, stmts: b.stmts.map((s: any) => s.type), cond: (b.condition as any)?.type, succs: b.succs, preds: b.preds });
  }
  return { entry: cfg.entry, exit: cfg.exit, blocks };
}

export function cfgToDot(cfg: ReturnType<typeof buildCFG>): string {
  let dot = "digraph CFG {\n";
  for (const [, block] of cfg.blocks) {
    dot += `  ${block.id} [label="${block.kind} #${block.id}"];\n`;
    for (const succ of block.succs) {
      dot += `  ${block.id} -> ${succ};\n`;
    }
  }
  dot += "}\n";
  return dot;
}


export default buildCFG;
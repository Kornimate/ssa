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
      Try/Catch/Finally,
      Complex Expressions (?:, !! operator, etc.)
*/

import { ICFG } from "./Models/ICfg";
import { ITraversalContext } from "./Models/ITraversalContext";
import { createTraversalContext } from "./Services/Initializers";
import * as t from "@babel/types";

export function buildCFG(programNode: t.Program): ICFG {
  const ctx = createTraversalContext();

  const firstBlock = ctx.createBlock();
  ctx.addSuccessEdge(ctx.cfg.entry, firstBlock);
  ctx.currentBlock = firstBlock;

  for (const stmt of programNode.body || []) {
    visitStatement(stmt, ctx);
  }

  if (!ctx.currentBlock.successExit) {
    ctx.addSuccessEdge(ctx.currentBlock!, ctx.cfg.exit);
  }

  return ctx.cfg;
}

function visitStatement(node: t.Statement, ctx: ITraversalContext) {
  if (!node) return;

  switch (node.type) {
    case "BlockStatement":
      for (const s of node.body) visitStatement(s, ctx);
      return;

    case "ExpressionStatement":
    case "VariableDeclaration":
      ctx.addStatement(ctx.currentBlock, node);
      return;

    case "IfStatement":
      visitIf(node, ctx);
      return;

    case "WhileStatement":
      visitWhile(node, ctx);
      return;

    case "ForStatement":
      visitFor(node, ctx);
      return;

    case "ReturnStatement":
      ctx.addStatement(ctx.currentBlock, node);
      ctx.addSuccessEdge(ctx.currentBlock, ctx.cfg.exit);
      const afterRet = ctx.createBlock();
      ctx.currentBlock = afterRet;
      return;

    case "BreakStatement": //need to rewrite this to ctx stacks
      // ctx.addStatement(ctx.currentBlock, node);
      // if (ctx.breakTarget === null) {
      //   ctx.addFalseEdge(ctx.currentBlock, ctx.cfg.exit);
      // } else {
      //   const target = ctx.breakTargets[ctx.breakTargets.length - 1].target;
      //   ctx.addEdge(ctx.currentBlock, target);
      // }
      // ctx.currentBlock = ctx.createBlock();
      return;

    case "ContinueStatement": //need to rewrite this to ctx stacks
      // ctx.addStatement(ctx.currentBlock, node);
      // if (ctx.continueTarget === null) {
      //   ctx.addSuccessEdge(ctx.currentBlock, ctx.cfg.exit);
      // } else {
      //   const target =
      //     ctx.continueTargets[ctx.continueTargets.length - 1].target;
      //   ctx.addEdge(ctx.currentBlock, target);
      // }
      // ctx.currentBlock = ctx.createBlock();
      return;

    case "FunctionDeclaration": //need to rewrite this to ctx stacks
      ctx.addStatement(ctx.currentBlock, node);
      return;

    default: //need to rewrite this
      ctx.addStatement(ctx.currentBlock, node);
  }
}

function visitIf(node: t.IfStatement, ctx: ITraversalContext) {
  const condBlock = ctx.createBlock();
  ctx.addSuccessEdge(ctx.currentBlock, condBlock);
  condBlock.statements.push(node);

  const thenBlock = ctx.createBlock();
  ctx.addSuccessEdge(condBlock, thenBlock);

  const elseBlock = node.alternate ? ctx.createBlock() : null;
  if (elseBlock) ctx.addFalseEdge(condBlock, elseBlock);

  const after = ctx.createBlock();

  ctx.currentBlock = thenBlock;
  visitStatement(node.consequent as t.Statement, ctx);
  if (!ctx.currentBlock.successExit)
    ctx.addSuccessEdge(ctx.currentBlock, after);

  if (elseBlock) {
    ctx.currentBlock = elseBlock;
    visitStatement(node.alternate as t.Statement, ctx);
    if (!ctx.currentBlock.successExit)
      ctx.addSuccessEdge(ctx.currentBlock, after);
  } else {
    ctx.addSuccessEdge(condBlock, after);
  }

  ctx.currentBlock = after;
}

function visitWhile(node: t.WhileStatement, ctx: ITraversalContext) {
  const condBlock = ctx.createBlock();
  ctx.addSuccessEdge(ctx.currentBlock, condBlock);
  const bodyBlock = ctx.createBlock();
  const after = ctx.createBlock();

  condBlock.statements.push(node);
  ctx.addSuccessEdge(condBlock, bodyBlock);
  ctx.addSuccessEdge(condBlock, after); //need to change it later for other type of edge

  ctx.breakTarget = after;
  ctx.continueTarget = condBlock;

  ctx.currentBlock = bodyBlock;
  visitStatement(node.body as t.Statement, ctx);
  if (!ctx.currentBlock.successExit)
    ctx.addSuccessEdge(ctx.currentBlock, condBlock);

  //need to rewrite this to ctx stacks
  // ctx.breakTargets.pop();
  // ctx.continueTargets.pop();

  ctx.currentBlock = after;
}

function visitFor(node: t.ForStatement, ctx: ITraversalContext) {
  if (node.init) {
    if (t.isVariableDeclaration(node.init)) ctx.addStatement(ctx.currentBlock, node.init);
    else ctx.addStatement(ctx.currentBlock, t.expressionStatement(node.init as t.Expression));
  }

  const condBlock = ctx.createBlock();
  ctx.addSuccessEdge(ctx.currentBlock, condBlock);
  condBlock.expressions[0] = node.test || t.booleanLiteral(true);

  const bodyBlock = ctx.createBlock();
  const after = ctx.createBlock();
  const updateBlock = node.update ? ctx.createBlock() : condBlock;

  ctx.addSuccessEdge(condBlock, bodyBlock);
  ctx.addFalseEdge(condBlock, after); //need to change it later for other type of edg

  ctx.breakTarget = after;
  ctx.continueTarget = updateBlock;

  ctx.currentBlock = bodyBlock;
  visitStatement(node.body as t.Statement, ctx);
  if (!ctx.currentBlock.successExit) {
    if (node.update) ctx.addSuccessEdge(ctx.currentBlock, updateBlock);
    else ctx.addSuccessEdge(ctx.currentBlock, condBlock);
  }

  if (node.update) {
    ctx.currentBlock = updateBlock;
    ctx.addStatement(ctx.currentBlock, t.expressionStatement(node.update as t.Expression));
    ctx.addSuccessEdge(updateBlock, condBlock);
  }

  //need to change it later for other type of edg
  // ctx.breakTargets.pop();
  // ctx.continueTargets.pop();

  ctx.currentBlock = after;
}

export default buildCFG;

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

import { ICFG } from "./models/ICfg";
import { ITraversalContextNode } from "./models/ITraversalContextNode";
import { createTraversalContext, createTraversalNode } from "./services/Initializers";
import { ITraversalContext } from "./models/ITraversalContext";
import * as t from "@babel/types";

export function buildCFG(programNode: t.Program): ICFG {
  const ctx = createTraversalContext();
  const activeSubContext = ctx.current()!;

  const firstBlock = activeSubContext.createBlock();
  activeSubContext.addSuccessEdge(ctx.cfg.entry, firstBlock);
  activeSubContext.currentBlock = firstBlock;

  for (const stmt of programNode.body || []) {
    visitStatement(stmt, ctx);
  }

  if (!activeSubContext.currentBlock.successExit) {
    activeSubContext.addSuccessEdge(activeSubContext.currentBlock!, ctx.cfg.exit);
  }

  return ctx.cfg;
}

function visitStatement(node: t.Statement, ctx: ITraversalContext) {
  if (!node) return;

  const activeSubContext = ctx.current()!;

  switch (node.type) {
    case "BlockStatement":
      visitBlock(node, ctx);
      return;

    case "ExpressionStatement":
    case "VariableDeclaration":
      visitExpressionAndVariableDeclaration(node, activeSubContext)
      return;

    case "IfStatement":
      visitIf(node, activeSubContext);
      return;

    case "WhileStatement":
      visitWhile(node, activeSubContext);
      return;

    case "ForStatement":
      visitFor(node, activeSubContext);
      return;

    case "ReturnStatement":
      // activeSubContext.addStatement(activeSubContext.currentBlock, node);
      // activeSubContext.addSuccessEdge(activeSubContext.currentBlock, activeSubContext.cfg.exit);
      // const afterRet = activeSubContext.createBlock();
      // activeSubContext.currentBlock = afterRet;
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
      activeSubContext.addStatement(activeSubContext.currentBlock, node);
      return;

    default: //need to expand this options this
      activeSubContext.addStatement(activeSubContext.currentBlock, node);
  }
}

function visitBlock(node: t.BlockStatement, ctx: ITraversalContext){
  for (const s of node.body) visitStatement(s, ctx);
}

function visitExpressionAndVariableDeclaration(node: t.Statement, activeSubContext: ITraversalContextNode){
  activeSubContext.addStatement(activeSubContext.currentBlock, node);
}

function visitIf(node: t.IfStatement, ctx: ITraversalContext) {
  // create condition block
  const activeSubContext = ctx.current()!;
  const condBlock = activeSubContext.createBlock();
  activeSubContext.addSuccessEdge(activeSubContext.currentBlock, condBlock);
  condBlock.statements.push(node);

  // create then block
  const thenBlock = activeSubContext.createBlock();
  activeSubContext.addSuccessEdge(condBlock, thenBlock);

  // create else block
  const elseBlock = node.alternate ? activeSubContext.createBlock() : null;
  if (elseBlock) activeSubContext.addFalseEdge(condBlock, elseBlock);

  const after = activeSubContext.createBlock();
  
  // visit then block
  activeSubContext.currentBlock = thenBlock;
  visitStatement(node.consequent as t.Statement, ctx);
  if (!activeSubContext.currentBlock.successExit)
    activeSubContext.addSuccessEdge(activeSubContext.currentBlock, after);

  // visit else block if exists
  if (elseBlock) {
    activeSubContext.currentBlock = elseBlock;
    visitStatement(node.alternate as t.Statement, ctx);
    if (!activeSubContext.currentBlock.successExit)
      activeSubContext.addSuccessEdge(activeSubContext.currentBlock, after);
  } else {
    activeSubContext.addSuccessEdge(condBlock, after);
  }

  // continue with after block
  activeSubContext.currentBlock = after;
}

function visitWhile(node: t.WhileStatement, ctx: ITraversalContext) {
  // create condition block
  const activeSubContext = ctx.current()!;
  const condBlock = activeSubContext.createBlock();
  activeSubContext.addSuccessEdge(activeSubContext.currentBlock, condBlock);
  activeSubContext.continueTarget = condBlock;
  condBlock.statements.push(node);
  
  // create loop body block
  const bodyBlock = activeSubContext.createBlock();
  activeSubContext.addSuccessEdge(condBlock, bodyBlock);

  // create loop after block
  const after = activeSubContext.createBlock();
  activeSubContext.addFalseEdge(condBlock, after);
  activeSubContext.breakTarget = after;

  // visit loop body block
  activeSubContext.currentBlock = bodyBlock;
  visitStatement(node.body as t.Statement, ctx); //done until here the check ----------------------------------------------------
  if (!activeSubContext.currentBlock.successExit)
    activeSubContext.addSuccessEdge(activeSubContext.currentBlock, condBlock);

  //need to rewrite this to ctx stacks
  // ctx.breakTargets.pop();
  // ctx.continueTargets.pop();

  activeSubContext.currentBlock = after;
}

function visitFor(node: t.ForStatement, ctx: ITraversalContextNode) {
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

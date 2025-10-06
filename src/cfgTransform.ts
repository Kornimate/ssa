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
import {
  createTraversalContext,
  createTraversalNode,
} from "./services/Initializers";
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
    activeSubContext.addSuccessEdge(
      activeSubContext.currentBlock!,
      ctx.cfg.exit
    );
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
      visitExpressionAndVariableDeclaration(node, activeSubContext);
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
      visitReturn(node, ctx);
      return;

    case "BreakStatement":
      visitBreak(node, ctx);
      return;

    case "ContinueStatement":
      visitContinue(node, ctx);
      return;

    case "FunctionDeclaration": //need to rewrite this to ctx stacks
      activeSubContext.addStatement(activeSubContext.currentBlock, node);
      return;

    default: //need to expand this options this
      activeSubContext.addStatement(activeSubContext.currentBlock, node);
  }
}

function visitBlock(node: t.BlockStatement, ctx: ITraversalContext) {
  for (const s of node.body) visitStatement(s, ctx);
}

function visitExpressionAndVariableDeclaration(
  node: t.Statement,
  activeSubContext: ITraversalContextNode
) {
  activeSubContext.addStatement(activeSubContext.currentBlock, node);
}

function visitReturn(node: t.Statement, ctx: ITraversalContext) {
  const activeSubContext = ctx.current()!;

  activeSubContext.addStatement(activeSubContext.currentBlock, node);
  activeSubContext.addSuccessEdge(activeSubContext.currentBlock, ctx.cfg.exit);

  const afterRet = activeSubContext.createBlock();
  activeSubContext.currentBlock = afterRet;
}

function visitBreak(node: t.Statement, ctx: ITraversalContext) {
  const activeSubContext = ctx.current()!;
  activeSubContext.addStatement(activeSubContext.currentBlock, node);

  if (activeSubContext.breakTargets!.length === 0) {
    activeSubContext.addFalseEdge(activeSubContext.currentBlock, ctx.cfg.exit); // need to change later
  } else {
    const target = activeSubContext.breakTargets?.at(-1)!;
    activeSubContext.addFalseEdge(activeSubContext.currentBlock, target); // may need to change later
  }

  activeSubContext.currentBlock = activeSubContext.createBlock();
}

function visitContinue(node: t.Statement, ctx: ITraversalContext) {
  const activeSubContext = ctx.current()!;

  activeSubContext.addStatement(activeSubContext.currentBlock, node);
  if (activeSubContext.continueTargets!.length === 0) {
    activeSubContext.addFalseEdge(activeSubContext.currentBlock, ctx.cfg.exit); // may need to change
  } else {
    const target = activeSubContext.continueTargets?.at(-1)!;
    activeSubContext.addFalseEdge(activeSubContext.currentBlock, target); // may need to change
  }
  activeSubContext.currentBlock = activeSubContext.createBlock();
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
  activeSubContext.continueTargets?.push(condBlock);
  condBlock.statements.push(node);

  // create loop body block
  const bodyBlock = activeSubContext.createBlock();
  activeSubContext.addSuccessEdge(condBlock, bodyBlock);

  // create loop after block
  const after = activeSubContext.createBlock();
  activeSubContext.addFalseEdge(condBlock, after);
  activeSubContext.breakTargets?.push(after);

  // visit loop body block
  activeSubContext.currentBlock = bodyBlock;
  visitStatement(node.body as t.Statement, ctx);
  if (!activeSubContext.currentBlock.successExit)
    activeSubContext.addSuccessEdge(activeSubContext.currentBlock, condBlock);

  activeSubContext.breakTargets?.pop();
  activeSubContext.continueTargets?.pop();

  activeSubContext.currentBlock = after;
}

function visitFor(node: t.ForStatement, ctx: ITraversalContext) {
  const activeSubContext = ctx.current()!;

  // check if variable is declared in for statement
  if (node.init) { //this is not in correct place
    if (t.isVariableDeclaration(node.init))
      activeSubContext.addStatement(activeSubContext.currentBlock, node.init);
    else
      activeSubContext.addStatement(
        activeSubContext.currentBlock,
        t.expressionStatement(node.init as t.Expression)
      );
  }

  // create conditional block
  const condBlock = activeSubContext.createBlock();
  activeSubContext.addSuccessEdge(activeSubContext.currentBlock, condBlock);
  activeSubContext.addStatement(condBlock, node);


  // create body block
  const bodyBlock = activeSubContext.createBlock();
  activeSubContext.addSuccessEdge(condBlock, bodyBlock);

  // create update block
  const updateBlock = node.update ? activeSubContext.createBlock() : condBlock;
  activeSubContext.continueTargets?.push(updateBlock);

  // create after block
  const after = activeSubContext.createBlock();
  activeSubContext.addFalseEdge(condBlock, after);
  activeSubContext.breakTargets?.push(after);

  // visit body block
  activeSubContext.currentBlock = bodyBlock;
  visitStatement(node.body as t.Statement, ctx);
  if (!activeSubContext.currentBlock.successExit) {
    if (node.update)
      activeSubContext.addSuccessEdge(
        activeSubContext.currentBlock,
        updateBlock
      );
    else
      activeSubContext.addSuccessEdge(activeSubContext.currentBlock, condBlock);
  }

  if (node.update) {
    activeSubContext.currentBlock = updateBlock;
    activeSubContext.addStatement(
      activeSubContext.currentBlock,
      t.expressionStatement(node.update as t.Expression)
    );
    activeSubContext.addSuccessEdge(updateBlock, condBlock);
  }

  activeSubContext.breakTargets?.pop();
  activeSubContext.continueTargets?.pop();

  activeSubContext.currentBlock = after;
}

export default buildCFG;

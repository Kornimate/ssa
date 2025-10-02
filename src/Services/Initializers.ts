import { IBasicBlock } from "../Models/IBasicBlock";
import { ICFG } from "../Models/ICfg";
import { ITraversalContext } from "../Models/ITraversalContext";
import * as initializers from "./TraversalContext";

export function createEmptyBlock(blockName: string = ""): IBasicBlock {
  return {
    statements: [],
    expressions: [],
    name: blockName,
    successExit: null,
    falseExit: null,
    exceptionExit: null,
  };
}

export function createCFG(): ICFG {
  const entry = createEmptyBlock("entry");
  const exit = createEmptyBlock("exit");
  return { entry, exit };
}

export function createTraversalContext(): ITraversalContext {
  const cfg = createCFG();
  const ctx: Partial<ITraversalContext> = {};

  ctx.cfg = cfg;
  ctx.currentBlock = cfg.entry;
  ctx.nextBlock = null; //may need to change
  ctx.breakTarget = null;
  ctx.continueTarget = null;
  ctx.createBlock = initializers.createBlock;
  ctx.addStatement = initializers.addStatement;
  ctx.addSuccessEdge = initializers.addSuccessEdge;
  ctx.addFalseEdge = initializers.addFalseEdge;
  ctx.addExceptionEdge = initializers.addExceptionEdge;
  ctx.splitCurrent = initializers.splitCurrent;

  return ctx as ITraversalContext;
}
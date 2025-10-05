import { IBasicBlock } from "../models/IBasicBlock";
import { ICFG } from "../models/ICfg";
import { ITraversalContext } from "../models/ITraversalContext";
import { ITraversalContextNode } from "../models/ITraversalContextNode";
import * as nodeInitializers from "./TraversalContextNode";
import * as contextInitializers from "./TraversalContext";

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

export function createTraversalNode(): ITraversalContextNode {
  const cfg = createCFG();
  const node: Partial<ITraversalContextNode> = {};

  node.currentBlock = cfg.entry;
  node.breakTarget = null;
  node.continueTarget = null;
  node.createBlock = nodeInitializers.createBlock;
  node.addStatement = nodeInitializers.addStatement;
  node.addSuccessEdge = nodeInitializers.addSuccessEdge;
  node.addFalseEdge = nodeInitializers.addFalseEdge;
  node.addExceptionEdge = nodeInitializers.addExceptionEdge;
  node.splitCurrent = nodeInitializers.splitCurrent;

  return node as ITraversalContextNode;
}

export function createTraversalContext(): ITraversalContext {
  
  const ctx : Partial<ITraversalContext> = {};
  
  ctx.cfg = createCFG();
  ctx.contexts = [createTraversalNode()];
  ctx.current = contextInitializers.current;

  return ctx as ITraversalContext;
}
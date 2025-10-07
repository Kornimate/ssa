import { ITraversalContextNode } from "../models/ITraversalContextNode";
import { IBasicBlock } from "../models/IBasicBlock";
import { createEmptyBlock } from "./Initializers";
import * as t from "@babel/types";

export function createBlock(): IBasicBlock {
  return createEmptyBlock();
}

export function addSuccessEdge(
  from: IBasicBlock | null,
  to: IBasicBlock | null
) {
  if (!from || !to) throw new Error(`invalid edge ${from} -> ${to}`);
  from.successExit = to;
}

export function addFalseEdge(from: IBasicBlock | null, to: IBasicBlock | null) {
  if (!from || !to) throw new Error(`invalid edge ${from} -> ${to}`);
  from.falseExit = to;
}

export function addExceptionEdge(
  from: IBasicBlock | null,
  to: IBasicBlock | null
) {
  if (!from || !to) throw new Error(`invalid edge ${from} -> ${to}`);
  from.exceptionExit = to;
}

export function addStatement(block: IBasicBlock | null, node: t.Statement) {
  if (!block) throw new Error("current block missing");
  block.statements.push(node);
}

export function splitCurrent(ctx: ITraversalContextNode): IBasicBlock {
  const newBlock = createBlock();
  addSuccessEdge(ctx.currentBlock!, newBlock);
  ctx.currentBlock = newBlock;
  return newBlock;
}

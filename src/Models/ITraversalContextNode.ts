import { IBasicBlock } from './IBasicBlock';
import * as t from '@babel/types';

export interface ITraversalContextNode {
  /** represents current block in the context */
  currentBlock: IBasicBlock | null;

  /** blocks used to handle break/continue (for current loop) */
  breakTargets: IBasicBlock[] | null;
  continueTargets: IBasicBlock[] | null;

  /** convenience helpers */
  createBlock: () => IBasicBlock;
  addStatement: (block: IBasicBlock | null, node: t.Statement) => void;
  addSuccessEdge: (from: IBasicBlock | null, to: IBasicBlock | null) => void;
  addFalseEdge: (from: IBasicBlock | null, to: IBasicBlock | null) => void;
  addExceptionEdge: (from: IBasicBlock | null, to: IBasicBlock | null) => void;
  splitCurrent: (ctx: ITraversalContextNode) => IBasicBlock;
}
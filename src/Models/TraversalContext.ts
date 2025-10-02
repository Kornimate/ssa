import { CFG } from './Cfg';
import { BlockId } from './BlockId';
import * as t from '@babel/types';
import { BasicBlock } from './BasicBlock';

export interface TraversalContext {
  cfg: CFG;
  currentBlock: BasicBlock | null;
  nextBlock: BasicBlock | null;

  /** blocks used to handle break/continue (for current loop) */
  breakTarget: BasicBlock | null;
  continueTarget: BasicBlock | null;

  /** convenience helpers */
  createBlock: (blockName?: string) => BasicBlock;
  addStatement: (block: BasicBlock | null, node: t.Statement) => void;
  addSuccessEdge: (from: BasicBlock | null, to: BasicBlock | null) => void;
  addFalseEdge: (from: BasicBlock | null, to: BasicBlock | null) => void;
  addExceptionEdge: (from: BasicBlock | null, to: BasicBlock | null) => void;
  splitCurrent: () => BasicBlock;
}
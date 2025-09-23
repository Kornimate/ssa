import { PendingJumpTarget } from './PendingJumpTarget';
import { CFG } from './Cfg';
import { BlockId } from './BlockId';
import { BlockKind } from './BlockKind';
import * as t from '@babel/types';

export interface TraversalContext {
  cfg: CFG;
  cur: BlockId;
  nextId: number;

  /** stacks used to handle break/continue (for current loop) */
  breakTargets: PendingJumpTarget[];
  continueTargets: PendingJumpTarget[];

  /** convenience helpers */
  createBlock: (kind?: BlockKind) => BlockId;
  addStmt: (node: t.Statement) => void;
  addEdge: (from: BlockId, to: BlockId) => void;
  splitCurrent: () => BlockId;
}
import { BlockId } from "./BlockId";
import { BlockKind } from "./BlockKind";
import * as t from '@babel/types';

export interface Block {
  id: BlockId;
  kind: BlockKind;
  /** AST statements belonging to the block */
  stmts: t.Statement[];
  /** Optional condition node (for condition blocks) */
  condition?: t.Expression | t.Statement;
  /** outgoing edges (successor block ids). For condition blocks the order is [trueSucc, falseSucc] when applicable */
  succs: BlockId[];
  /** incoming edges */
  preds: BlockId[];
}
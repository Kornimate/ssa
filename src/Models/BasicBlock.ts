import * as t from "@babel/types";

export interface BasicBlock {
  /** AST statements and expressions belonging to the block */
  statements: t.Statement[];
  expressions: t.Expression[];

  /** Name of Basic Block */
  name: string | null;

  /** Different exit types from blocks */
  successExit?: BasicBlock | null;
  falseExit?: BasicBlock | null;
  exceptionExit?: BasicBlock | null;
}

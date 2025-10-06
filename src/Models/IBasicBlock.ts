import * as t from "@babel/types";

export interface IBasicBlock {
  /** AST statements and expressions belonging to the block */
  statements: t.Statement[];

  /** Name of Basic Block */
  name: string | null;

  /** Different exit types from blocks */
  successExit?: IBasicBlock | null;
  falseExit?: IBasicBlock | null;
  exceptionExit?: IBasicBlock | null;
}

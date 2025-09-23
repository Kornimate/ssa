import { parse } from '@babel/parser';
import { buildCFG, cfgToObject, cfgToDot } from './cfgTransform';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve("./TestMaterial/Input/input.ts");
const ast = parse(fs.readFileSync(filePath, "utf8"), { sourceType: "module", plugins: ["typescript"] });
const cfg = buildCFG(ast.program);

const graphFilePath = path.resolve("./TestMaterial/Output/graph.dot");
fs.writeFileSync(graphFilePath, cfgToDot(cfg), "utf8");

// console.log(JSON.stringify(cfgToObject(cfg), null, 2));
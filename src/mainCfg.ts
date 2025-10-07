import { parse } from "@babel/parser";
import { buildCFG } from "./cfgTransform";
import { visualizeCfg } from "./services/VisualizationTraversals";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

export function useCfg(fileName: string = "input") {

  console.log(`[${fileName}.ts]:: parsing`)

  const filePath = path.resolve(`./tests-materials/input/${fileName}.ts`);
  const ast = parse(fs.readFileSync(filePath, "utf-8"), {
    sourceType: "module",
    plugins: ["typescript"],
  });

  console.log(`[${fileName}.ts]:: building cfg`)

  const cfg = buildCFG(ast.program);

  console.log(`[${fileName}.ts]:: preprocess for visualization`)

  const visualizations = visualizeCfg(cfg);

  const graphFilePath = path.resolve(`./tests-materials/output/${fileName}.dot`);

  console.log(`[${fileName}.ts]:: writing files`)

  fs.writeFileSync(graphFilePath, visualizations.dot, "utf-8");

  const jsonFilePath = path.resolve(
    `./tests-materials/output/${fileName}.json`
  );

  fs.writeFileSync(
    jsonFilePath,
    JSON.stringify(visualizations.object, null, 2),
    "utf-8"
  );

  exec(`dot -Tpng ./tests-materials/output/${fileName}.dot -o ./tests-materials/output/${fileName}.png`, (error, _, stderr) => {
    if(error){
      console.error(`Error: ${error}`);
      return;
    }

    if(stderr){
      console.error(`StdError: ${stderr}`);
      return;
    }
  })

  console.log(`[${fileName}.ts]:: done`)
}

useCfg("while-test");
useCfg("for-test");
useCfg("sequential-test");
useCfg("if-test");
useCfg("continue-test");
useCfg("break-test");

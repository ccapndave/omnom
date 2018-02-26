import { run, series, parallel, startIn, addFiles, filterFiles, writeTo, rename, Task } from "../src/index";
import { assert } from "chai";
import { dir } from "tmp";
import { resolve } from "path";
import * as fs from "fs-extra";
import { forEachFile } from "../src/files";

/**
 * 
 * @param count 
 * @param seriesCount 
 * @param taskBuilder 
 */
async function assertTaskConcurrency(count: number, seriesCount: number, taskBuilder: (fn: any) => Task) {
  let delayTime = 100;

  let counter = 0;
  const startTime = new Date().getTime();
  const task = taskBuilder(() => {
    counter++;
    return new Promise((resolve, reject) => setTimeout(resolve, delayTime));
  });

  await run(task);

  const timeTaken = new Date().getTime() - startTime; 
  assert.approximately(timeTaken, seriesCount * delayTime, delayTime / 2);

  assert.equal(counter, count);
}

const tmpDir = () => new Promise<string>((resolve, reject) => dir((err, path) => (err ? reject(err) : resolve(path))));

describe("Concurrency combinator", () => {
  describe("series", () => {
    it("should run tasks one after another", async () => {
      await assertTaskConcurrency(3, 3, f => series([ f, f, f ]));
    });
  });

  describe("parallel", () => {
    it("should run tasks at the same time", async () => {
      await assertTaskConcurrency(3, 1, f => parallel([ f, f, f ]));
    });
  });

  describe("series+parallel", () => {
    it("should schedule tasts correctly", async () => {
      await assertTaskConcurrency(7, 4, f =>
        parallel([
          f,
          series([
            f,
            f,
            parallel([
              f,
              f,
              series([
                f,
                f
              ])
            ])
          ])
        ])
      );
    });
  })
});

describe("File functions", () => {
  it("should copy files from src to dest", async () => {
    const outDir = await tmpDir();

    await run(() =>
      startIn("tests/assets")
        .then(addFiles("*"))
        .then(writeTo(outDir))
    );

    const files = await fs.readdirSync(outDir);
    assert.lengthOf(files, 5, `There should have been 5 files copied.`);
  });

  it("should copy files of a type from src to dest", async () => {
    const outDir = await tmpDir();

    await run(() =>
      startIn("tests/assets")
        .then(addFiles("*.svg"))
        .then(writeTo(outDir))
    );

    const files = await fs.readdir(outDir);
    assert.lengthOf(files, 1, `There should have been 1 file copied.`);
  });

  it("should allow an array of globs", async () => {
    const outDir = await tmpDir();

    await run(() =>
      startIn("tests/assets")
        .then(addFiles([ "*.svg", "*.mp3" ]))
        .then(writeTo(outDir))
    );

    const files = await fs.readdir(outDir);
    assert.lengthOf(files, 2, `There should have been 2 files copied.`);
  });

  it("should filter files", async () => {
    const outDir = await tmpDir();

    await run(() =>
      startIn("tests/assets")
        .then(addFiles("*"))
        .then(filterFiles("*.jpg"))
        .then(writeTo(outDir))
    );

    const files = await fs.readdir(outDir);
    assert.lengthOf(files, 1, `There should have been 1 file copied.`);
  });

  it("should allow file renaming", async () => {
    const outDir = await tmpDir();

    await run(() =>
      startIn("tests/assets")
        .then(addFiles("1.svg"))
        .then(forEachFile(rename(_ => "renamed.svg")))
        .then(writeTo(outDir))
    );

    const files = await fs.readdir(outDir);

    assert.lengthOf(files, 1);
    assert.equal(files[0], "renamed.svg");
  });

/*
  it("should manipulate json", async () => {
    const outDir = await tmpDir();

    task("rename", async () =>
      src("tests/assets", "5.json")
        .then(files => files.map(mapJson(json => ({ "changed": true }))))
        .then(dest(outDir))
    );

    await run("rename");

    const files = await readDir(outDir);

    assert.lengthOf(files, 1);
    assert.equal(files[0], "5.json");

    const loadedJson = await readFile(resolve(outDir, "5.json"));
    const parsedJson = JSON.parse(loadedJson.toString());
    assert.equal(parsedJson.changed, true);
  });*/

});

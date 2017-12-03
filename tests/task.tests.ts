import { task, run, series, parallel, src, rename, mapJson, dest, Task, RunnableTask } from "../src/index";
import { assert } from "chai";
import { dir } from "tmp";
import { resolve } from "path";
import * as fs from "fs";

/**
 * 
 * @param count 
 * @param seriesCount 
 * @param taskBuilder 
 */
async function assertTaskConcurrency(count: number, seriesCount: number, taskBuilder: (fn: any) => RunnableTask) {
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
const readDir = (path: string) => new Promise<string[]>((resolve, reject) => fs.readdir(path, (err, files) => (err) ? reject(err) : resolve(files)));
const readFile = (path: string) => new Promise<string | Buffer>((resolve, reject) => fs.readFile(path, (err, data) => (err) ? reject(err) : resolve(data)));

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

describe("Task runner", () => {
  it("should not run unregistered task names", async () => {
    try {
      await run("this-task-doesnt-exist");
      assert.fail("Managed to run a task that doesn't exist");
    } catch (e) {}
  });

  it("should run registered task names", async () => {
    task("task1", async () => {});
    try {
      await run("task1");
    } catch (e) {
      assert.fail(null, null, "Couldn't run a registered task");
    }
  });

  it("should be able to use concurrency combinators with names or tasks 1", async () => {
    try {
      await run(series([ "task2" ]));
      assert.fail(null, null, "Managed to run a task that doesn't exist");
    } catch (e) {}
  });

  it("should be able to use concurrency combinators with names or tasks 2", async () => {
    let counter = 0;
    task("task3", async () => counter++);
    try {
      await run(series([ "task3", async () => counter++, parallel([ "task3" ]) ]));
    } catch (e) {
      assert.fail(null, null, "Couldn't run a registered task");
    }

    assert.equal(3, counter);
  });
})

describe("File functions", () => {
  it("should copy files from src to dest", async () => {
    const outDir = await tmpDir();

    task("copy", async () => src("tests/assets", "*").then(dest(outDir)));
    await run("copy");

    const files = await readDir(outDir);
    assert.lengthOf(files, 5, `There should have been 5 files copied.`);
  });

  it("should copy files of a type from src to dest", async () => {
    const outDir = await tmpDir();

    task("copy", async () => src("tests/assets", "*.jpg").then(dest(outDir)));
    await run("copy");

    const files = await readDir(outDir);
    assert.lengthOf(files, 1, `There should have been 1 file copied.`);
  });

  it("should allow an array of globs", async () => {
    const outDir = await tmpDir();

    task("copy", async () => src("tests/assets", [ "1.svg", "4.mp3" ]).then(dest(outDir)));
    await run("copy");

    const files = await readDir(outDir);
    assert.lengthOf(files, 2, `There should have been 2 files copied.`);
  });

  it("should allow file renaming", async () => {
    const outDir = await tmpDir();

    task("rename", async () =>
      src("tests/assets", "1.svg")
        .then(files => files.map(rename("renamed.svg")))
        .then(dest(outDir))
    );

    await run("rename");

    const files = await readDir(outDir);

    assert.lengthOf(files, 1);
    assert.equal(files[0], "renamed.svg");
  });

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
  });

});

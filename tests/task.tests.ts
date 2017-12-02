import { task, series, parallel, Task } from "../src/index";
import { assert } from "chai";

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

  await task();

  const timeTaken = new Date().getTime() - startTime; 
  assert.approximately(timeTaken, seriesCount * delayTime, delayTime / 2);

  assert.equal(counter, count);
}

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
  it("should register task names", () => {

  });
})
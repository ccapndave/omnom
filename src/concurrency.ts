import { run, Task } from "./task"

export function series(tasks: Task[]): Task {
  return () => tasks.reduce((acc, task) => acc.then(run.bind(null, task)), Promise.resolve())
}

export function parallel(tasks: Task[]): Task {
  return () => Promise.all(tasks.map(task => run(task).then(_ => null)));
}

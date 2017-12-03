import { exec, taskToRunnableTask, Task, RunnableTask } from "./task"

export function series(tasks: Task[]): RunnableTask {
  const runnableTasks = tasks.map(taskToRunnableTask);
  return () => runnableTasks.reduce((acc, runnableTask) => acc.then(exec.bind(null, runnableTask)), Promise.resolve())
}

export function parallel(tasks: Task[]): RunnableTask {
  const runnableTasks = tasks.map(taskToRunnableTask);
  return () => Promise.all(runnableTasks.map(runnableTask => exec(runnableTask).then(_ => null)));
}
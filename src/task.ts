const registeredTasks: Map<String, RunnableTask> = new Map();

export type RunnableTask = (() => Promise<any>);

export type Task = RunnableTask | string;

export function task(name: string, runnableTask: RunnableTask): void {
  registeredTasks.set(name, runnableTask);
}

export async function run(task: Task): Promise<any> {
  const runnableTask = taskToRunnableTask(task);
  return await exec(runnableTask);
}

export function exec(runnableTask: RunnableTask): Promise<any> {
  return runnableTask();
}

export function taskToRunnableTask(task: Task): RunnableTask {
  if (typeof task === "string") {
    if (registeredTasks.has(task)) {
      return <RunnableTask>registeredTasks.get(task);
    } else {
      throw new Error(`Unable to find a task named "${<string>task}".`);
    }
  } else {
    return task;
  }
}
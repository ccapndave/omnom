const registeredTasks: Map<String, Task> = new Map();

export type Task
  = (() => Promise<any>)
  //| string;

export function task(name: string, task: Task) {
  registeredTasks.set(name, task);
}

export function series(tasks: Task[]): Task {
  return () => tasks.reduce((acc, task) => acc.then(task), Promise.resolve())
}

export function parallel(tasks: Task[]): Task {
  return () => Promise.all(tasks.map(task => task())).then(_ => null);
}

function exec(name: string) {
  if (registeredTasks.has(name)) {
    registeredTasks.get(name)();
  }
}
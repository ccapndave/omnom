export type Task = (() => Promise<any>);

export async function run(task: Task): Promise<any> {
  return await task();
}

import { spawnSync } from 'child_process';

export function runCommand(command: string): { output: string; exitCode: number } {
    const [execName, ...args] = command.split(' ');
    const { output, status: exitCode } = spawnSync(execName, args);
    return { output: output.join('\n'), exitCode };
}

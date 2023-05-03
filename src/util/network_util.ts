import { execSync } from "child_process";

export const getPublicIpAddress = (): string => {
  const cmd = `curl -s http://checkip.amazonaws.com || printf "0.0.0.0"`;
  return execSync(cmd).toString().trim();
};

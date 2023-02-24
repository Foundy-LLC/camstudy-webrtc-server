export interface User {
  id: string;
  name: string;
  introduce: string | null;
  score: bigint;
  profile_image: string | null;
  status: "login" | "logout";
}
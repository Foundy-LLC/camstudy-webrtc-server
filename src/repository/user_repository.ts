import prisma from "../../prisma/client.js";
import { User } from "../model/User.js";

export const getUserBy = async (id: string): Promise<User | null> => {
  const user = await prisma.user_account.findUnique({
    where: {
      id: id
    }
  });
  if (user == null) {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    introduce: user.introduce,
    score: user.score,
    profile_image: user.profile_image,
    status: user.status
  }
};
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";
import prisma from "../prisma/client";

jest.mock("../prisma/client", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>()
}));
beforeEach(() => {
  mockReset(mockPrisma);
});

export const mockPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

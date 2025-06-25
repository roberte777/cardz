"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_1 = require("../generated/prisma");
var prisma = (_a = globalThis.prisma) !== null && _a !== void 0 ? _a : new prisma_1.PrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalThis.prisma = prisma;
exports.default = prisma;

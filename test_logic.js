const numCols = 10;
const startPos = 55;
const index = 56;
const userPathSequence = [];

const lastPos = userPathSequence.length > 0 ? userPathSequence[userPathSequence.length - 1] : startPos;

const r1 = Math.floor(lastPos / numCols);
const c1 = lastPos % numCols;
const r2 = Math.floor(index / numCols);
const c2 = index % numCols;
const isAdjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;

console.log({ lastPos, index, r1, c1, r2, c2, isAdjacent });

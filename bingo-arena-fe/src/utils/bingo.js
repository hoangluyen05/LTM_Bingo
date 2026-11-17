export function createBoard(size = 5) {
    const numbers = Array.from({ length: size * size }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
}

export function getBingoLines(size = 5) {
    return [
        ...Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => r * size + c)),
        ...Array.from({ length: size }, (_, c) => Array.from({ length: size }, (_, r) => r * size + c)),
        Array.from({ length: size }, (_, i) => i * size + i),
        Array.from({ length: size }, (_, i) => i * size + size - 1 - i),
    ];
}

export const BINGO_LINES = getBingoLines();

export function getCompletedLines(board, calledNumbers) {
    const cells = board.flat();
    const size = Math.sqrt(cells.length);
    if (![5, 6, 7, 8].includes(size)) return [];
    const calledSet = new Set(calledNumbers);
    return getBingoLines(size).filter(line => line.every(index => calledSet.has(cells[index])));
}

export function countBingoLines(board, calledNumbers) {
    return getCompletedLines(board, calledNumbers).length;
}

// Tạo bảng gồm 25 số từ 1 đến 25
export function createBoard() {
    const numbers = Array.from(
        { length: 25 },
        (_, index) => index + 1
    );

    // Xáo trộn bằng thuật toán Fisher-Yates
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    return numbers;
}

// Tổng cộng 12 đường có thể tạo Bingo
export const BINGO_LINES = [
    // 5 hàng ngang
    ...Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 5 }, (_, col) => row * 5 + col)
    ),

    // 5 hàng dọc
    ...Array.from({ length: 5 }, (_, col) =>
        Array.from({ length: 5 }, (_, row) => row * 5 + col)
    ),

    // Hai đường chéo
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20],
];

// Trả về những đường đã hoàn thành
export function getCompletedLines(board, calledNumbers) {
    const calledSet = new Set(calledNumbers);

    return BINGO_LINES.filter((line) =>
        line.every((index) => calledSet.has(board[index]))
    );
}

// Đếm tổng số đường Bingo
export function countBingoLines(board, calledNumbers) {
    return getCompletedLines(board, calledNumbers).length;
}
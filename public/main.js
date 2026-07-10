const socket = io();
const game = new Chess(); // 체스 룰 엔진
let board = null;
let playerColor = null; // 'w' 또는 'b'

const $status = $('#status');

function onDragStart(source, piece, position, orientation) {
    // 게임이 끝났거나, 내 턴이 아니거나, 내 색상의 말이 아니면 드래그 불가
    if (game.game_over() || playerColor === null) return false;
    if (game.turn() !== playerColor) return false;
    if ((playerColor === 'w' && piece.search(/^b/) !== -1) ||
        (playerColor === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop(source, target) {
    // 이동하려는 수 검증 (프로모션은 기본 퀸으로 설정)
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' 
    });

    // 불법적인 수이면 제자리로 되돌림
    if (move === null) return 'snapback';

    // 내 움직임을 서버로 전송 (상대방에게 전달됨)
    socket.emit('move', { from: source, to: target, promotion: 'q' });
    updateStatus();
}

function onSnapEnd() {
    board.position(game.fen());
}

// 상태 업데이트 (체크, 체크메이트, 무승부 등 판정)
function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'b' ? '흑색' : '백색';

    if (game.in_checkmate()) {
        status = `게임 종료 - ${moveColor} 패배 (체크메이트)`;
    } else if (game.in_draw()) {
        status = '게임 종료 - 무승부';
    } else {
        status = `${moveColor} 차례입니다.`;
        if (game.in_check()) {
            status += ` (체크!)`;
        }
    }
    $status.html(`당신의 색상: ${playerColor === 'w' ? '백색' : '흑색'}<br>${status}`);
}

// 서버 이벤트 리스너
socket.on('status', (msg) => {
    $status.text(msg);
});

socket.on('start', (data) => {
    playerColor = data.color;
    
    const config = {
        draggable: true,
        position: 'start',
        orientation: playerColor === 'w' ? 'white' : 'black', // 흑이면 판을 뒤집음
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };
    board = Chessboard('myBoard', config);
    updateStatus();
});

socket.on('move', (moveData) => {
    game.move(moveData);
    board.position(game.fen());
    updateStatus();
});

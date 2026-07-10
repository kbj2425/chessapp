const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let waitingPlayer = null;
let games = {};

io.on('connection', (socket) => {
    console.log('유저 접속:', socket.id);

    // 1:1 매칭 시스템
    if (!waitingPlayer) {
        waitingPlayer = socket;
        socket.emit('status', '상대방을 기다리는 중입니다...');
    } else {
        const gameId = waitingPlayer.id + '#' + socket.id;
        const player1 = waitingPlayer;
        const player2 = socket;
        waitingPlayer = null;

        games[player1.id] = { gameId, opponent: player2, color: 'w' };
        games[player2.id] = { gameId, opponent: player1, color: 'b' };

        player1.emit('start', { color: 'w', gameId });
        player2.emit('start', { color: 'b', gameId });
    }

    // 유저가 말을 움직였을 때 상대방에게 전달
    socket.on('move', (moveData) => {
        const userGame = games[socket.id];
        if (userGame && userGame.opponent) {
            userGame.opponent.emit('move', moveData);
        }
    });

    // 접속 종료 처리
    socket.on('disconnect', () => {
        console.log('유저 접속 종료:', socket.id);
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
        const userGame = games[socket.id];
        if (userGame && userGame.opponent) {
            userGame.opponent.emit('status', '상대방이 게임을 나갔습니다.');
            delete games[userGame.opponent.id];
        }
        delete games[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
